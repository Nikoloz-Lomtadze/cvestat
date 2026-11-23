import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import type { NewsItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Cybersecurity news",
  description: "Today's security news in one or two sentences each, with links to the original articles.",
};

export default function NewsPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Cybersecurity news</h1>
      <p className="mb-6 text-sm text-muted">
        Short summaries written by AI — click a headline to read the full article at the source.
      </p>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-border bg-card" />}>
        <NewsList />
      </Suspense>
    </div>
  );
}

async function NewsList() {
  await connection();
  const { data } = await db()
    .from("news")
    .select("id, url, source, title, published_at, summary, cve_ids")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(60);
  const items = (data ?? []) as NewsItem[];
  if (!items.length) return <p className="text-sm text-muted">No news yet — the daily update hasn&apos;t run.</p>;

  return (
    <ul className="space-y-3">
      {items.map((n) => (
        <li key={n.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-1 flex flex-wrap gap-x-3 text-xs text-muted">
            <span className="font-semibold text-foreground">{n.source}</span>
            {n.published_at && <time>{new Date(n.published_at).toUTCString().slice(0, 16)}</time>}
          </div>
          <a href={n.url} target="_blank" rel="noreferrer" className="font-medium hover:text-accent hover:underline">
            {n.title}
          </a>
          {n.summary && <p className="mt-1 text-sm text-muted">{n.summary}</p>}
          {n.cve_ids.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {n.cve_ids.map((id) => (
                <Link key={id} href={`/cve/${id}`} className="rounded border border-border px-2 py-0.5 font-mono text-xs hover:border-accent">
                  {id} → explained
                </Link>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
