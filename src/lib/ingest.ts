import "server-only";
import { db } from "./supabase";
import { fetchEpss, fetchKev, fetchNvdRecent } from "./sources";
import { getCve } from "./cves";

async function upsertChunks(rows: Record<string, unknown>[], errors: string[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db().from("cves").upsert(rows.slice(i, i + 500));
    if (error) errors.push(`cves upsert: ${error.message}`);
  }
}

/**
 * Daily CVE update:
 * 1. New CVEs from NVD (last 48 hours — overlap so nothing is missed).
 * 2. The full CISA "known exploited" catalog (~1,500 CVEs) — marks them as exploited.
 * 3. EPSS exploit probability for all of the above.
 * No AI here: explanations are generated only when a person opens a CVE page.
 */
export async function ingestCves(): Promise<{ nvd: number; kev: number; backfilled: number; errors: string[] }> {
  const errors: string[] = [];

  const recent = await fetchNvdRecent(48).catch((e) => (errors.push(`NVD: ${e}`), []));
  const kev = await fetchKev().catch((e) => (errors.push(`KEV: ${e}`), []));

  const ids = [...new Set([...recent.map((r) => r.id!), ...kev.map((k) => k.cveID)])];
  const epss = await fetchEpss(ids).catch((e) => (errors.push(`EPSS: ${e}`), new Map()));
  const now = new Date().toISOString();
  // Every row in one upsert must have the same columns, otherwise missing ones become null.
  const withEpss = (id: string) => {
    const e = epss.get(id);
    return { epss: e?.epss ?? null, epss_percentile: e?.percentile ?? null };
  };

  await upsertChunks(
    recent.map((r) => {
      // KEV columns come from the KEV step below, not from NVD.
      const { in_kev, kev_name, kev_date_added, kev_due_date, kev_required_action, ...rest } = r;
      void [in_kev, kev_name, kev_date_added, kev_due_date, kev_required_action];
      return { ...rest, ...withEpss(r.id!), updated_at: now };
    }),
    errors,
  );

  // KEV rows: only KEV columns, so existing NVD data is never overwritten.
  await upsertChunks(
    kev.map((k) => ({
      id: k.cveID,
      in_kev: true,
      kev_name: k.vulnerabilityName,
      kev_description: k.shortDescription,
      kev_date_added: k.dateAdded,
      kev_due_date: k.dueDate || null,
      kev_required_action: k.requiredAction,
      kev_ransomware: k.knownRansomwareCampaignUse === "Known",
      ...withEpss(k.cveID),
      updated_at: now,
    })),
    errors,
  );

  // KEV only gives us a short description. Fill in full NVD details (severity score, products…)
  // for up to 40 exploited CVEs per day, newest first — gentle on NVD's rate limit.
  const { data: missing } = await db()
    .from("cves")
    .select("id")
    .eq("in_kev", true)
    .is("nvd_synced_at", null)
    .order("kev_date_added", { ascending: false })
    .limit(40);
  let backfilled = 0;
  for (const { id } of missing ?? []) {
    if (await getCve(id).catch(() => null)) backfilled++;
    await new Promise((r) => setTimeout(r, 700)); // NVD allows ~50 requests / 30 s with a key
  }

  return { nvd: recent.length, kev: kev.length, backfilled, errors };
}
