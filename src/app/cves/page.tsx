import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CveGrid, GridSkeleton } from "@/components/CveCard";
import { listLatest } from "@/lib/cves";

export const metadata: Metadata = { title: "Latest CVEs" };

export default function LatestPage() {
  return (
    <div>
      <h1 className="chroma mb-1 font-pixel text-4xl font-bold tracking-wide">Latest CVEs</h1>
      <p className="mb-6 text-sm text-muted">The newest published vulnerabilities. Open any of them for a simple explanation.</p>
      <Suspense fallback={<GridSkeleton />}>
        <Latest />
      </Suspense>
    </div>
  );
}

async function Latest() {
  await connection();
  return <CveGrid cves={await listLatest(60)} empty="No data yet — the daily update hasn't run." />;
}
