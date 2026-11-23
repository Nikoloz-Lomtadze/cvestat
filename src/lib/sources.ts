import "server-only";
import type { Cve } from "./types";

// ---------- NVD (National Vulnerability Database) ----------
// Docs: https://nvd.nist.gov/developers/vulnerabilities
const NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

type NvdMetric = {
  cvssData: { baseScore: number; baseSeverity?: string; vectorString: string; version?: string };
  baseSeverity?: string; // CVSS v2 keeps severity here
};

type NvdCve = {
  id: string;
  published: string;
  lastModified: string;
  vulnStatus: string;
  descriptions: { lang: string; value: string }[];
  metrics?: Record<string, NvdMetric[] | undefined>;
  weaknesses?: { description: { lang: string; value: string }[] }[];
  configurations?: { nodes: { cpeMatch?: { criteria: string }[] }[] }[];
  references?: { url: string; tags?: string[] }[];
  cisaExploitAdd?: string;
  cisaActionDue?: string;
  cisaRequiredAction?: string;
  cisaVulnerabilityName?: string;
};

async function nvdFetch(params: Record<string, string>) {
  const url = `${NVD_URL}?${new URLSearchParams(params)}`;
  const headers: Record<string, string> = {};
  if (process.env.NVD_API_KEY) headers.apiKey = process.env.NVD_API_KEY;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`NVD ${res.status}`);
  return (await res.json()) as { totalResults: number; vulnerabilities: { cve: NvdCve }[] };
}

/** Turn NVD's big nested record into our flat database row. */
function mapNvd(c: NvdCve): Partial<Cve> {
  // Prefer the newest CVSS version available.
  const m = c.metrics ?? {};
  const metric = (["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"] as const)
    .map((k) => m[k]?.[0])
    .find(Boolean);

  const cwes = [
    ...new Set(
      (c.weaknesses ?? [])
        .flatMap((w) => w.description.map((d) => d.value))
        .filter((v) => v.startsWith("CWE-")),
    ),
  ];

  // cpe:2.3:a:apache:log4j:2.0:... → "apache log4j"
  const affected = [
    ...new Set(
      (c.configurations ?? [])
        .flatMap((cfg) => cfg.nodes.flatMap((n) => n.cpeMatch ?? []))
        .map((x) => x.criteria.split(":"))
        .map((p) => `${p[3]} ${p[4]}`.replace(/_/g, " ")),
    ),
  ].slice(0, 20);

  const row: Partial<Cve> = {
    id: c.id,
    published: c.published,
    last_modified: c.lastModified,
    vuln_status: c.vulnStatus,
    description: c.descriptions.find((d) => d.lang === "en")?.value ?? null,
    cvss_score: metric?.cvssData.baseScore ?? null,
    cvss_severity: (metric?.cvssData.baseSeverity ?? metric?.baseSeverity ?? null)?.toUpperCase() ?? null,
    cvss_vector: metric?.cvssData.vectorString ?? null,
    cvss_version: metric?.cvssData.version ?? null,
    cwes,
    affected,
    refs: (c.references ?? []).slice(0, 30).map((r) => ({ url: r.url, tags: r.tags })),
    nvd_synced_at: new Date().toISOString(),
  };
  if (c.cisaExploitAdd) {
    Object.assign(row, {
      in_kev: true,
      kev_name: c.cisaVulnerabilityName ?? null,
      kev_date_added: c.cisaExploitAdd,
      kev_due_date: c.cisaActionDue ?? null,
      kev_required_action: c.cisaRequiredAction ?? null,
    });
  }
  return row;
}

export async function fetchNvdCve(id: string): Promise<Partial<Cve> | null> {
  const data = await nvdFetch({ cveId: id });
  const cve = data.vulnerabilities[0]?.cve;
  return cve ? mapNvd(cve) : null;
}

/** All CVEs published in the last `hours` hours (handles NVD's 2000-per-page paging). */
export async function fetchNvdRecent(hours: number): Promise<Partial<Cve>[]> {
  // NVD wants ISO dates without the trailing "Z" (UTC is assumed).
  const iso = (d: Date) => d.toISOString().replace("Z", "");
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600_000);
  const out: Partial<Cve>[] = [];
  for (let startIndex = 0; ; startIndex += 2000) {
    const data = await nvdFetch({
      pubStartDate: iso(start),
      pubEndDate: iso(end),
      startIndex: String(startIndex),
      resultsPerPage: "2000",
    });
    out.push(...data.vulnerabilities.map((v) => mapNvd(v.cve)));
    if (startIndex + 2000 >= data.totalResults) break;
  }
  return out;
}

// ---------- CISA KEV (Known Exploited Vulnerabilities) ----------
const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export type KevEntry = {
  cveID: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
};

export async function fetchKev(): Promise<KevEntry[]> {
  const res = await fetch(KEV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`KEV ${res.status}`);
  return ((await res.json()) as { vulnerabilities: KevEntry[] }).vulnerabilities;
}

// ---------- FIRST EPSS (exploit probability) ----------
export async function fetchEpss(ids: string[]): Promise<Map<string, { epss: number; percentile: number }>> {
  const out = new Map<string, { epss: number; percentile: number }>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await fetch(`https://api.first.org/data/v1/epss?cve=${chunk.join(",")}`, { cache: "no-store" });
    if (!res.ok) continue;
    const json = (await res.json()) as { data: { cve: string; epss: string; percentile: string }[] };
    for (const d of json.data) out.set(d.cve, { epss: Number(d.epss), percentile: Number(d.percentile) });
  }
  return out;
}
