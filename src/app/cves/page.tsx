import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CveGrid, GridSkeleton } from "@/components/CveCard";
import { FilterBar } from "@/components/FilterBar";
import { listFiltered, PAGE_SIZE, parseFilters, PERIODS, SORTS, type CveFilters } from "@/lib/cves";

export const metadata: Metadata = {
  title: "Find CVEs",
  description: "Search and filter vulnerabilities by danger level, active exploitation and date — each explained simply.",
};

export default function CvesPage({ searchParams }: PageProps<"/cves">) {
  return (
    <div>
      <h1 className="chroma mb-1 font-pixel text-4xl font-bold tracking-wide">Find CVEs</h1>
      <p className="mb-6 text-sm text-muted">
        Filter by how dangerous a vulnerability is, whether attackers already use it, and when it appeared.
      </p>
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const { items, total } = await listFiltered(filters);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <FilterBar filters={filters} sorts={SORTS} periods={PERIODS} />
      <p className="label mb-4 text-[10px] text-muted">
        {total.toLocaleString("en-US")} CVEs found{pages > 1 && ` · page ${filters.page} of ${pages}`}
      </p>
      <CveGrid cves={items} empty="No CVEs match these filters. Try removing one." />
      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3">
          {filters.page > 1 && (
            <Link href={pageHref(filters, filters.page - 1)} className="px-btn px-4 py-2 text-[10px]">
              ◀ Previous
            </Link>
          )}
          {filters.page < pages && (
            <Link href={pageHref(filters, filters.page + 1)} className="px-btn px-4 py-2 text-[10px]">
              Next ▶
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

function pageHref(f: CveFilters, page: number) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.severity.length) p.set("severity", f.severity.join(","));
  if (f.exploited) p.set("exploited", "1");
  if (f.sort !== "newest") p.set("sort", f.sort);
  if (f.period !== "all") p.set("period", f.period);
  p.set("page", String(page));
  return `/cves?${p}`;
}
