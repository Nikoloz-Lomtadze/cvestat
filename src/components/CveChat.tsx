"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { LoginButtons, useUser } from "./auth";

type Msg = { role: "user" | "model"; text: string };

const STARTERS = [
  "Explain this like I'm 12",
  "How would I detect this on my network?",
  "Why is the severity score what it is?",
  "What should I patch first?",
];

/** Per-CVE AI tutor. Login required; the conversation lives only in this browser tab. */
export function CveChat({ id }: { id: string }) {
  const { user, ready } = useUser();
  const storageKey = `chat:${id}`;
  // Restore the chat after a reload (this tab only). Safe for hydration: messages
  // only render after login is checked in the browser.
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      return typeof window === "undefined" ? [] : JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(msgs));
    } catch {}
    if (msgs.length) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, storageKey]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", text: q.slice(0, 1000) }];
    setMsgs(next);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const { data } = await supabaseBrowser().auth.getSession();
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ id, messages: next }),
      });
      const json = await r.json().catch(() => ({ error: "The AI tutor is busy. Try again in a minute." }));
      if (r.ok) setMsgs([...next, { role: "model", text: json.answer }]);
      else {
        setError(json.error ?? "Something went wrong.");
        setMsgs(msgs); // take the unanswered question back out
        setInput(q);
      }
    } catch {
      setError("Network error. Try again.");
      setMsgs(msgs);
      setInput(q);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="px-panel border-pink! p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="label text-[11px] text-pink">Ask the AI tutor</h2>
        {msgs.length > 0 && (
          <button onClick={() => setMsgs([])} className="label text-[10px] text-muted hover:text-cyan">
            Clear
          </button>
        )}
      </div>

      {!ready ? (
        <div className="h-20 animate-pulse" />
      ) : !user ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            Still confused about {id}? Log in and ask anything — the tutor knows this CVE&apos;s details.
          </p>
          <LoginButtons className="max-w-xs" />
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted">
            ⚠ Don&apos;t share personal or confidential information. Answers are AI-generated and may be wrong. Chats
            aren&apos;t saved.
          </p>

          {msgs.length === 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="border-2 border-border px-3 py-1.5 text-left text-xs text-muted hover:border-cyan hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {msgs.length > 0 && (
            <div className="mb-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap border-2 p-3 text-[15px] leading-relaxed ${
                    m.role === "user" ? "ml-8 border-cyan/50 bg-[#0b1a33]" : "mr-8 border-border"
                  }`}
                >
                  <p className={`label mb-1 text-[9px] ${m.role === "user" ? "text-cyan" : "text-pink"}`}>
                    {m.role === "user" ? "You" : "Tutor"}
                  </p>
                  {m.text}
                </div>
              ))}
              {busy && <div className="mr-8 animate-pulse border-2 border-border p-3 text-sm text-muted">Thinking…</div>}
              <div ref={end} />
            </div>
          )}

          {error && <p className="mb-3 text-sm text-pink">{error}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder={`Ask about ${id}…`}
              aria-label="Your question"
              className="min-w-0 flex-1 border-2 border-border bg-[#071a33] px-3 py-2 text-sm outline-none focus:border-cyan"
            />
            <button disabled={busy || !input.trim()} className="px-btn px-4 py-2 text-[11px] disabled:opacity-50">
              Ask
            </button>
          </form>
        </>
      )}
    </section>
  );
}
