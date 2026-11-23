import { getCve, getExplanation } from "@/lib/cves";
import { consumeQuota, createExplanation } from "@/lib/explain";
import { normalizeCveId } from "@/lib/types";

export const maxDuration = 120;

const DAILY_LIMIT = Number(process.env.EXPLAIN_DAILY_LIMIT ?? 300);

// If two people open the same new CVE at once, generate only once (per server instance).
const inFlight = new Map<string, Promise<unknown>>();

/**
 * POST /api/explain  { id: "CVE-2021-44228" }
 * Returns the saved explanation, or generates it the first time.
 * It's a POST (not GET) so search-engine bots never trigger AI generation.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = normalizeCveId(body.id ?? "");
  if (!id) return Response.json({ error: "Invalid CVE id" }, { status: 400 });

  const saved = await getExplanation(id);
  if (saved) return Response.json({ explanation: saved.content, reviewed: saved.reviewed });

  const cve = await getCve(id);
  if (!cve) return Response.json({ error: "CVE not found" }, { status: 404 });
  if (cve.vuln_status === "Rejected" || !(cve.description ?? cve.kev_description))
    return Response.json({ error: "This CVE was rejected or has no description yet." }, { status: 422 });

  try {
    let job = inFlight.get(id);
    if (!job) {
      if (!(await consumeQuota("explain:global", DAILY_LIMIT)))
        return Response.json(
          { error: "Daily AI limit reached. Explanations for new CVEs resume tomorrow." },
          { status: 429 },
        );
      job = createExplanation(cve).finally(() => inFlight.delete(id));
      inFlight.set(id, job);
    }
    return Response.json({ explanation: await job, reviewed: false });
  } catch (e) {
    console.error("explain failed", id, e);
    return Response.json({ error: "The AI couldn't explain this CVE right now. Try again later." }, { status: 502 });
  }
}
