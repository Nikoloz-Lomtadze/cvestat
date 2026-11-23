import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SearchBox } from "@/components/SearchBox";
import { CveGrid, GridSkeleton, ZoneTitle } from "@/components/CveCard";
import { SkyHero } from "@/components/ocean/Hero";
import { listRecentlyExploited, listTopNew } from "@/lib/cves";

// Famous CVEs every junior should know — good first reads.
const FAMOUS = [
  ["CVE-2021-44228", "Log4Shell"],
  ["CVE-2014-0160", "Heartbleed"],
  ["CVE-2017-0144", "EternalBlue"],
  ["CVE-2023-34362", "MOVEit"],
  ["CVE-2014-6271", "Shellshock"],
  ["CVE-2024-3094", "xz backdoor"],
];

export default function Home() {
  return (
    <div className="space-y-16">
      <SkyHero>
        <div className="flex flex-col items-center gap-5 text-center text-[#0b1a33]">
          <h1 className="chroma font-pixel text-6xl font-bold tracking-[0.12em] text-white sm:text-8xl">CVESTAT</h1>
          <p className="label text-xs text-[#0b3560] sm:text-sm">The deep dive into vulnerabilities</p>
          <p className="max-w-xl text-base font-medium text-[#0b3560]">
            New CVEs every day, explained in plain English: what broke, how attackers use it, a real-world example
            and how to fix it.
          </p>
          <SearchBox />
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <span className="label self-center text-[10px] text-[#0b3560]">Start with a classic:</span>
            {FAMOUS.map(([id, name]) => (
              <Link
                key={id}
                href={`/cve/${id}`}
                className="border-2 border-[#0b1a33] bg-white/70 px-3 py-0.5 font-medium shadow-[2px_2px_0_0_rgb(11_26_51/0.5)] hover:bg-white"
              >
                {name}
              </Link>
            ))}
          </div>
        </div>
      </SkyHero>

      <section>
        <ZoneTitle
          depth="40 m · Sunlit zone"
          title="Actively exploited right now"
          subtitle="Recently added to CISA's Known Exploited Vulnerabilities list — attackers are using these."
        />
        <Suspense fallback={<GridSkeleton />}>
          <Exploited />
        </Suspense>
      </section>

      <section>
        <ZoneTitle
          depth="400 m · Twilight zone"
          title="Most important new CVEs this week"
          subtitle="Ranked by exploitation, exploit probability and severity."
        />
        <Suspense fallback={<GridSkeleton />}>
          <TopNew />
        </Suspense>
      </section>

      <section className="px-panel flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="label mb-1 text-[10px] text-cyan/80">▼ 1000 m · Midnight zone</p>
          <h2 className="font-pixel text-2xl">Go deeper</h2>
          <p className="text-sm text-muted">Filter every CVE by danger level, or read today&apos;s security news in two sentences each.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/cves?severity=CRITICAL&exploited=1&sort=danger" className="px-btn px-4 py-2 text-xs">Critical &amp; exploited</Link>
          <Link href="/cves" className="px-btn px-4 py-2 text-xs">Find CVEs</Link>
          <Link href="/news" className="px-btn px-4 py-2 text-xs">News</Link>
        </div>
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
