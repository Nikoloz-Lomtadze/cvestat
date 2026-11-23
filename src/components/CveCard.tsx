import Link from "next/link";
import type { CveListItem } from "@/lib/cves";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  LOW: "bg-green-500/15 text-green-400 border-green-500/30",
};

export function SeverityBadge({ severity, score }: { severity: string | null; score: number | null }) {
  if (!severity) return <span className="rounded border border-border px-2 py-0.5 text-xs text-muted">No score yet</span>;
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLORS[severity] ?? ""}`}>
      {severity} {score ?? ""}
    </span>
  );
}

export function ExploitedBadge() {
  return (
    <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-300">
      Actively exploited
    </span>
  );
}

export function CveCard({ cve }: { cve: CveListItem }) {
  return (
    <Link
      href={`/cve/${cve.id}`}
      className="block rounded-xl border border-border bg-card p-4 transition hover:border-accent"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold">{cve.id}</span>
        <SeverityBadge severity={cve.cvss_severity} score={cve.cvss_score} />
        {cve.in_kev && <ExploitedBadge />}
      </div>
      {cve.kev_name && <p className="mb-1 text-sm font-medium">{cve.kev_name}</p>}
      <p className="line-clamp-3 text-sm text-muted">{cve.description ?? cve.kev_description ?? "Details load when you open it."}</p>
    </Link>
  );
}

export function CveGrid({ cves, empty }: { cves: CveListItem[]; empty: string }) {
  if (!cves.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cves.map((c) => (
        <CveCard key={c.id} cve={c} />
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}
