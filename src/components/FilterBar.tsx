"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CveFilters } from "@/lib/cves";

const SEVERITY_STYLE: Record<string, { on: string; label: string }> = {
  CRITICAL: { on: "border-red-400 bg-red-500/25 text-red-200", label: "Critical" },
  HIGH: { on: "border-orange-400 bg-orange-500/25 text-orange-200", label: "High" },
  MEDIUM: { on: "border-yellow-300 bg-yellow-500/20 text-yellow-100", label: "Medium" },
  LOW: { on: "border-emerald-400 bg-emerald-500/20 text-emerald-200", label: "Low" },
};

/** Filters live in the URL, so every filtered view can be shared or bookmarked. */
export function FilterBar({
  filters,
  sorts,
  periods,
}: {
  filters: CveFilters;
  sorts: Record<string, string>;
  periods: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);

  function apply(next: Partial<CveFilters>) {
    const f = { ...filters, q, ...next, page: 1 };
    const params = new URLSearchParams();
    if (f.q) params.set("q", f.q);
    if (f.severity.length) params.set("severity", f.severity.join(","));
    if (f.exploited) params.set("exploited", "1");
    if (f.sort !== "newest") params.set("sort", f.sort);
    if (f.period !== "all") params.set("period", f.period);
    startTransition(() => router.push(`/cves${params.size ? `?${params}` : ""}`, { scroll: false }));
  }

  function toggleSeverity(s: CveFilters["severity"][number]) {
    const has = filters.severity.includes(s);
    apply({ severity: has ? filters.severity.filter((x) => x !== s) : [...filters.severity, s] });
  }

  const chip = "label border-2 px-3 py-1.5 text-[10px] transition";
  const select = "label border-2 border-border bg-[#0b1a33] px-3 py-1.5 text-[10px] text-foreground outline-none focus:border-cyan";

  return (
    <div className={`px-panel mb-6 space-y-4 p-4 transition-opacity ${pending ? "opacity-70" : ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({});
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: CVE id, product or keyword (e.g. wordpress, router, SQL injection)"
          aria-label="Search CVEs"
          className="flex-1 border-2 border-border bg-[#0b1a33] px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-cyan"
        />
        <button className="px-btn px-4 py-2 text-[10px]">Search</button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="label mr-1 text-[10px] text-muted">Danger:</span>
        {(Object.keys(SEVERITY_STYLE) as CveFilters["severity"][number][]).map((s) => {
          const on = filters.severity.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => toggleSeverity(s)}
              className={`${chip} ${on ? SEVERITY_STYLE[s].on : "border-border text-muted hover:border-cyan"}`}
            >
              {SEVERITY_STYLE[s].label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={filters.exploited}
          onClick={() => apply({ exploited: !filters.exploited })}
          className={`${chip} ${filters.exploited ? "border-pink bg-pink/20 text-pink" : "border-border text-muted hover:border-pink"}`}
        >
          🔥 Exploited only
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="label text-[10px] text-muted">When:</span>
          <select value={filters.period} onChange={(e) => apply({ period: e.target.value as CveFilters["period"] })} className={select}>
            {Object.entries(periods).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="label text-[10px] text-muted">Sort:</span>
          <select value={filters.sort} onChange={(e) => apply({ sort: e.target.value as CveFilters["sort"] })} className={select}>
            {Object.entries(sorts).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.push("/cves", { scroll: false }));
          }}
          className="label ml-auto text-[10px] text-muted underline-offset-4 hover:text-cyan hover:underline"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}
