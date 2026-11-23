import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SearchBox } from "@/components/SearchBox";
import { CveGrid, GridSkeleton } from "@/components/CveCard";
import { listRecentlyExploited, listTopNew } from "@/lib/cves";

// Famous CVEs every junior should know — good first reads.
const FAMOUS = [
  ["CVE-2021-44228", "Log4Shell"],
  ["CVE-2014-0160", "Heartbleed"],
  ["CVE-2017-0144", "EternalBlue"],
  ["CVE-2023-34362", "MOVEit Transfer"],
  ["CVE-2014-6271", "Shellshock"],
  ["CVE-2024-3094", "xz backdoor"],
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">CVEs, explained like a human would.</h1>
        <p className="max-w-2xl text-muted">
          New vulnerabilities every day, in plain English: what broke, how attackers use it, a real-world example,
          and how to fix it.
        </p>
        <SearchBox />
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted">Start with a classic:</span>
          {FAMOUS.map(([id, name]) => (
            <Link key={id} href={`/cve/${id}`} className="rounded-full border border-border px-3 py-0.5 hover:border-accent">
              {name}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">🔥 Actively exploited right now</h2>
        <p className="mb-4 text-sm text-muted">Recently added to CISA&apos;s Known Exploited Vulnerabilities list.</p>
        <Suspense fallback={<GridSkeleton />}>
          <Exploited />
        </Suspense>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">🆕 Most important new CVEs this week</h2>
        <p className="mb-4 text-sm text-muted">Ranked by exploitation, exploit probability and severity.</p>
        <Suspense fallback={<GridSkeleton />}>
          <TopNew />
        </Suspense>
      </section>
    </div>
  );
}

async function Exploited() {
  await connection(); // read the database on each request, not at build time
  return <CveGrid cves={await listRecentlyExploited()} empty="No data yet — the daily update hasn't run." />;
}

async function TopNew() {
  await connection();
  return <CveGrid cves={await listTopNew()} empty="No data yet — the daily update hasn't run." />;
}
