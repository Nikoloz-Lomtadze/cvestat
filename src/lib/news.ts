import "server-only";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { generateJson } from "./ai";
import { db } from "./supabase";

// Trusted security news sources (RSS feeds). We store headline + link + OUR OWN short summary,
// never the article text itself (that belongs to the publisher).
export const FEEDS = [
  { source: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { source: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  { source: "SecurityWeek", url: "https://www.securityweek.com/feed/" },
  { source: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
  { source: "CISA", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml" },
];

type RawItem = { source: string; title: string; url: string; published_at: string | null; snippet: string };

const parser = new XMLParser({ ignoreAttributes: false });

function text(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "#text" in v) return String((v as { "#text": unknown })["#text"]);
  return "";
}
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

async function readFeed(feed: (typeof FEEDS)[number]): Promise<RawItem[]> {
  const res = await fetch(feed.url, { cache: "no-store", headers: { "User-Agent": "CVEStat/1.0 (+https://cvestat.com)" } });
  if (!res.ok) throw new Error(`${feed.source} ${res.status}`);
  const xml = parser.parse(await res.text());
  const items: Record<string, unknown>[] = [xml?.rss?.channel?.item ?? xml?.feed?.entry ?? []].flat();
  return items.slice(0, 15).map((it) => {
    // RSS: <link>url</link>   Atom: <link href="url"/> (sometimes several)
    const links = [it.link].flat() as (string | Record<string, unknown>)[];
    const best = links.find((l) => typeof l === "string" || !l["@_rel"] || l["@_rel"] === "alternate") ?? links[0];
    const url = typeof best === "string" ? best : text(best?.["@_href"] ?? best);
    const date = text(it.pubDate ?? it.published ?? it.updated);
    return {
      source: feed.source,
      title: stripHtml(text(it.title)),
      url: url.trim(),
      published_at: date && !isNaN(Date.parse(date)) ? new Date(date).toISOString() : null,
      snippet: stripHtml(text(it.description ?? it.summary)).slice(0, 600),
    };
  }).filter((i) => i.title && i.url.startsWith("http"));
}

const SummariesSchema = z.object({
  items: z.array(z.object({ index: z.number().int(), summary: z.string() })),
});

/** Fetch all feeds, keep only new articles, write a 1–2 sentence summary for each, save. */
export async function ingestNews(): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = [];
  const all = (
    await Promise.all(FEEDS.map((f) => readFeed(f).catch((e) => (errors.push(String(e)), [] as RawItem[]))))
  ).flat();
  if (!all.length) return { added: 0, errors };

  // Skip articles we already have.
  const { data: known } = await db().from("news").select("url").in("url", all.map((i) => i.url));
  const knownUrls = new Set((known ?? []).map((k) => k.url));
  const fresh = all.filter((i) => !knownUrls.has(i.url)).slice(0, 40);
  if (!fresh.length) return { added: 0, errors };

  // One AI call per 20 articles (keeps us far below free-tier limits).
  const summaries = new Map<number, string>();
  for (let i = 0; i < fresh.length; i += 20) {
    const batch = fresh.slice(i, i + 20);
    try {
      const out = await generateJson({
        schema: SummariesSchema,
        system:
          "You summarize cybersecurity news for junior security specialists. For each item write ONE or TWO short sentences in your own words: what happened and why it matters. Do not copy phrases from the snippet. Do not invent details beyond the title and snippet.",
        prompt: batch.map((b, j) => `[${i + j}] ${b.title}\n${b.snippet}`).join("\n\n"),
      });
      for (const s of out.items) summaries.set(s.index, s.summary);
    } catch (e) {
      errors.push(`summary: ${e}`);
    }
  }

  const rows = fresh.map((item, idx) => {
    const summary = summaries.get(idx) ?? null;
    const cve_ids = [...new Set(`${item.title} ${summary ?? ""}`.toUpperCase().match(/CVE-\d{4}-\d{4,}/g) ?? [])];
    return { source: item.source, title: item.title, url: item.url, published_at: item.published_at, summary, cve_ids };
  });
  const { error } = await db().from("news").upsert(rows, { onConflict: "url", ignoreDuplicates: true });
  if (error) errors.push(`save: ${error.message}`);
  return { added: error ? 0 : rows.length, errors };
}
