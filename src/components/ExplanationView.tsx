"use client";

import { useEffect, useState } from "react";
import type { Explanation } from "@/lib/explain";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-panel p-5">
      <h2 className="label mb-3 text-[11px] text-cyan">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function List({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </Tag>
  );
}

export function ExplanationBody({ e, reviewed }: { e: Explanation; reviewed: boolean }) {
  return (
    <div className="space-y-4">
      <div className="px-panel border-cyan! p-5">
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <span className="label border-2 border-border px-2 py-0.5 text-[10px] text-muted">{e.difficulty}</span>
          <span className="label border-2 border-border px-2 py-0.5 text-[10px] text-muted">
            {reviewed ? "✔ Reviewed by a human" : "AI-generated"}
          </span>
        </div>
        <p className="text-lg font-medium">{e.tldr}</p>
      </div>
      <Block title="What is it?">
        <p>{e.what_is_it}</p>
      </Block>
      <Block title="Think of it like this">
        <p>{e.analogy}</p>
      </Block>
      <Block title="How the attack works">
        <List items={e.how_it_works} ordered />
      </Block>
      <Block title="Real-world example">
        <p>{e.real_world_example}</p>
      </Block>
      <div className="grid gap-4 sm:grid-cols-2">
        <Block title="Who is affected">
          <p>{e.who_is_affected}</p>
        </Block>
        <Block title="Impact">
          <p>{e.impact}</p>
        </Block>
      </div>
      <Block title="How to fix it">
        <List items={e.how_to_fix} />
      </Block>
      <Block title="Key terms">
        <dl className="space-y-2">
          {e.key_terms.map((t) => (
            <div key={t.term}>
              <dt className="font-semibold">{t.term}</dt>
              <dd className="text-muted">{t.meaning}</dd>
            </div>
          ))}
        </dl>
      </Block>
    </div>
  );
}

/**
 * Shows the explanation. If none exists yet, asks the server to generate it
 * (only happens the first time anyone opens this CVE).
 */
export function ExplanationLoader({ id }: { id: string }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "done"; e: Explanation; reviewed: boolean } | { status: "error"; msg: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({ error: "The AI is busy right now. Reload the page in a minute." }));
        if (cancelled) return;
        if (r.ok) setState({ status: "done", e: json.explanation, reviewed: json.reviewed });
        else setState({ status: "error", msg: json.error ?? "Something went wrong." });
      })
      .catch(() => !cancelled && setState({ status: "error", msg: "Network error. Try again." }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "done") return <ExplanationBody e={state.e} reviewed={state.reviewed} />;
  if (state.status === "error")
    return <div className="px-panel p-5 text-sm text-muted">{state.msg}</div>;
  return (
    <div className="space-y-4">
      <div className="px-panel p-5 text-sm text-muted">
        ✨ First time someone opened this CVE — writing a simple explanation (takes ~10 seconds)…
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse px-panel" />
      ))}
    </div>
  );
}
