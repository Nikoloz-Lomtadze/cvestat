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
