import "server-only";
import { db } from "./supabase";
import { fetchEpss, fetchNvdCve } from "./sources";
import type { Cve } from "./types";

/**
 * Get a CVE for its page.
 * 1. Look in our database.
 * 2. If it's missing (or we only have KEV data), fetch it from NVD + EPSS and save it.
 * So any CVE ever published can be opened, but each one is fetched only once.
 */
export async function getCve(id: string): Promise<Cve | null> {
  const { data: existing } = await db().from("cves").select("*").eq("id", id).maybeSingle<Cve>();
  if (existing?.nvd_synced_at) return existing;

  // Cap on-demand NVD lookups so bots opening thousands of random CVE pages can't fill our free database.
  const { data: allowed } = await db().rpc("consume_quota", {
    p_key: "nvd:ondemand",
    p_limit: Number(process.env.NVD_ONDEMAND_DAILY_LIMIT ?? 3000),
  });
  if (allowed !== true) return existing ?? null;

  let fromNvd: Partial<Cve> | null = null;
  try {
    fromNvd = await fetchNvdCve(id);
  } catch (e) {
    console.error("NVD fetch failed", id, e);
    return existing ?? null; // NVD down: show what we have
  }
  if (!fromNvd) return existing ?? null; // no such CVE

  const epss = (await fetchEpss([id]).catch(() => new Map())).get(id);
  // Only send the columns we have new values for; the database keeps the rest.
  const row = {
    ...fromNvd,
    ...(epss && { epss: epss.epss, epss_percentile: epss.percentile }),
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = await db().from("cves").upsert(row).select("*").single<Cve>();
  if (error) console.error("CVE save failed", id, error);
  return saved ?? ({ ...existing, ...row } as Cve);
}

export async function getExplanation(id: string) {
  const { data } = await db().from("explanations").select("content, model, reviewed").eq("cve_id", id).maybeSingle();
  return data as { content: unknown; model: string; reviewed: boolean } | null;
}

const LIST_COLUMNS =
  "id, published, description, kev_description, cvss_score, cvss_severity, in_kev, kev_date_added, kev_name, epss, importance";

export type CveListItem = Pick<
  Cve,
  "id" | "published" | "description" | "kev_description" | "cvss_score" | "cvss_severity" | "in_kev" | "kev_date_added" | "kev_name" | "epss" | "importance"
>;

/** Recently added to CISA's "actively exploited" list. */
export async function listRecentlyExploited(limit = 9): Promise<CveListItem[]> {
  const { data } = await db()
    .from("cves")
    .select(LIST_COLUMNS)
    .eq("in_kev", true)
    .order("kev_date_added", { ascending: false })
    .limit(limit);
  return (data ?? []) as CveListItem[];
}

/** Most important CVEs published in the last `days` days. */
export async function listTopNew(days = 7, limit = 12): Promise<CveListItem[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data } = await db()
    .from("cves")
    .select(LIST_COLUMNS)
    .gte("published", since)
    .neq("vuln_status", "Rejected")
    .order("importance", { ascending: false })
    .order("published", { ascending: false })
    .limit(limit);
  return (data ?? []) as CveListItem[];
}

// ---------- Filtered search (/cves page) ----------
export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const SORTS = { newest: "Newest", danger: "Most dangerous", epss: "Most likely exploited", cvss: "Highest score" } as const;
export const PERIODS = { "7": "Last 7 days", "30": "Last 30 days", "365": "Last year", all: "Any time" } as const;
export const PAGE_SIZE = 30;

export type CveFilters = {
  q: string;
  severity: (typeof SEVERITIES)[number][];
  exploited: boolean;
  sort: keyof typeof SORTS;
  period: keyof typeof PERIODS;
  page: number;
};

/** Read filters from the URL (?severity=CRITICAL,HIGH&exploited=1&sort=danger…), ignoring anything invalid. */
export function parseFilters(sp: Record<string, string | string[] | undefined>): CveFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const severity = [sp.severity ?? ""]
    .flat()
    .join(",")
    .toUpperCase()
    .split(",")
    .filter((s): s is CveFilters["severity"][number] => (SEVERITIES as readonly string[]).includes(s));
  const sort = one("sort") in SORTS ? (one("sort") as CveFilters["sort"]) : "newest";
  const period = one("period") in PERIODS ? (one("period") as CveFilters["period"]) : "all";
  return {
    // keep search text simple: letters, digits, spaces, dots and dashes only
    q: one("q").replace(/[^\p{L}\p{N} .\-]/gu, "").trim().slice(0, 60),
    severity,
    exploited: one("exploited") === "1",
    sort,
    period,
    page: Math.max(1, Math.min(100, Number(one("page")) || 1)),
  };
}

export async function listFiltered(f: CveFilters): Promise<{ items: CveListItem[]; total: number }> {
  let query = db()
    .from("cves")
    .select(LIST_COLUMNS, { count: "estimated" })
    .or("vuln_status.is.null,vuln_status.neq.Rejected");

  if (f.severity.length) query = query.in("cvss_severity", f.severity);
  if (f.exploited) query = query.eq("in_kev", true);
  if (f.period !== "all") {
    const since = new Date(Date.now() - Number(f.period) * 86400_000).toISOString();
    // for exploited CVEs, "recent" means recently added to the exploited list
    query = f.exploited
      ? query.gte("kev_date_added", since.slice(0, 10))
      : query.gte("published", since);
  }
  if (f.q) {
    const id = f.q.toUpperCase();
    query = /^CVE-\d{4}-\d+$/.test(id)
      ? query.ilike("id", `${id}%`)
      : query.or(`description.ilike.%${f.q}%,kev_name.ilike.%${f.q}%,kev_description.ilike.%${f.q}%`);
  }

  const opts = { ascending: false, nullsFirst: false };
  if (f.sort === "danger") query = query.order("importance", opts).order("cvss_score", opts);
  else if (f.sort === "epss") query = query.order("epss", opts);
  else if (f.sort === "cvss") query = query.order("cvss_score", opts).order("published", opts);
  else query = query.order("published", opts).order("kev_date_added", opts);

  const from = (f.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) console.error("listFiltered", error);
  return { items: (data ?? []) as CveListItem[], total: count ?? 0 };
}

/** Newest CVEs, for the full feed. */
export async function listLatest(limit = 50): Promise<CveListItem[]> {
  const { data } = await db()
    .from("cves")
    .select(LIST_COLUMNS)
    .not("published", "is", null)
    .neq("vuln_status", "Rejected")
    .order("published", { ascending: false })
    .limit(limit);
  return (data ?? []) as CveListItem[];
}
