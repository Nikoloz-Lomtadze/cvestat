import { ingestCves } from "@/lib/ingest";
import { ingestNews } from "@/lib/news";
import { db } from "@/lib/supabase";

export const maxDuration = 300;

/**
 * Runs once a day (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>"
 * automatically, so strangers can't trigger it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  // If the secret is missing, refuse everyone (otherwise "Bearer undefined" would work).
  if (!secret || secret.length < 16 || req.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });

  const cves = await ingestCves();
  const news = await ingestNews();
  // Old usage counters aren't needed after a week.
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  await db().from("usage_counters").delete().lt("day", weekAgo);
  console.log("daily job", { cves, news });
  return Response.json({ cves, news });
}
