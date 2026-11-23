export type Cve = {
  id: string;
  published: string | null;
  last_modified: string | null;
  vuln_status: string | null;
  description: string | null;
  cvss_score: number | null;
  cvss_severity: string | null;
  cvss_vector: string | null;
  cvss_version: string | null;
  cwes: string[];
  affected: string[];
  refs: { url: string; tags?: string[] }[];
  in_kev: boolean;
  kev_name: string | null;
  kev_description: string | null;
  kev_date_added: string | null;
  kev_due_date: string | null;
  kev_required_action: string | null;
  kev_ransomware: boolean | null;
  epss: number | null;
  epss_percentile: number | null;
  importance: number;
  nvd_synced_at: string | null;
};

export type NewsItem = {
  id: number;
  url: string;
  source: string;
  title: string;
  published_at: string | null;
  summary: string | null;
  cve_ids: string[];
};

export const CVE_ID_RE = /^CVE-\d{4}-\d{4,}$/;

/** "cve-2021-44228 " → "CVE-2021-44228", or null if it isn't a CVE id */
export function normalizeCveId(input: string): string | null {
  const id = input.trim().toUpperCase();
  return CVE_ID_RE.test(id) ? id : null;
}
