import { ingestCves } from "@/lib/ingest";
import { ingestNews } from "@/lib/news";

export const maxDuration = 300;

/**
 * Runs once a day (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>"
 * automatically, so strangers can't trigger it.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("Unauthorized", { status: 401 });

  const cves = await ingestCves();
  const news = await ingestNews();
  console.log("daily job", { cves, news });
  return Response.json({ cves, news });
}
