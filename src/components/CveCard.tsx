import Link from "next/link";
import type { CveListItem } from "@/lib/cves";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "border-red-400 text-red-300 bg-red-500/15",
  HIGH: "border-orange-400 text-orange-300 bg-orange-500/15",
  MEDIUM: "border-yellow-300 text-yellow-200 bg-yellow-500/10",
  LOW: "border-emerald-400 text-emerald-300 bg-emerald-500/10",
};

const badge = "label inline-block border-2 px-2 py-0.5 text-[10px]";

export function SeverityBadge({ severity, score }: { severity: string | null; score: number | null }) {
  if (!severity) return <span className={`${badge} border-border text-muted`}>No score yet</span>;
  return (
    <span className={`${badge} ${SEVERITY_COLORS[severity] ?? "border-border"}`}>
      {severity} {score ?? ""}
    </span>
  );
}

export function ExploitedBadge() {
  return <span className={`${badge} border-pink bg-pink/15 text-pink`}>Exploited</span>;
}

export function CveCard({ cve }: { cve: CveListItem }) {
  return (
    <Link href={`/cve/${cve.id}`} className="px-panel px-link block p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={cve.cvss_severity} score={cve.cvss_score} />
        {cve.in_kev && <ExploitedBadge />}
      </div>
      <p className="mb-1 font-pixel text-lg tracking-wide text-cyan">{cve.id}</p>
      {cve.kev_name && <p className="mb-1 text-sm font-medium">{cve.kev_name}</p>}
      <p className="line-clamp-3 text-sm text-muted">
        {cve.description ?? cve.kev_description ?? "Details load when you open it."}
      </p>
    </Link>
  );
}

export function CveGrid({ cves, empty }: { cves: CveListItem[]; empty: string }) {
  if (!cves.length) return <p className="px-panel p-4 text-sm text-muted">{empty}</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cves.map((c) => (
        <CveCard key={c.id} cve={c} />
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-panel h-36 animate-pulse" />
      ))}
    </div>
  );
}

/** Section title styled as a depth marker, e.g. "▼ 40 m · Sunlit zone" */
export function ZoneTitle({ depth, title, subtitle }: { depth: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <p className="label mb-1 text-[10px] text-cyan/80">▼ {depth}</p>
      <h2 className="font-pixel text-2xl tracking-wide">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
