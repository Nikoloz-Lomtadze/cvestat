import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExploitedBadge, SeverityBadge } from "@/components/CveCard";
import { CveChat } from "@/components/CveChat";
import { ExplanationBody, ExplanationLoader } from "@/components/ExplanationView";
import { getCve, getExplanation } from "@/lib/cves";
import { ExplanationSchema } from "@/lib/explain";
import { normalizeCveId } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/cve/[id]">): Promise<Metadata> {
  const { id } = await params;
  const cveId = normalizeCveId(decodeURIComponent(id)) ?? id;
  return {
    title: `${cveId} explained simply`,
    description: `What ${cveId} is, how it works, a real-world example and how to fix it — in plain English.`,
  };
}

export default function CvePage({ params }: PageProps<"/cve/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse px-panel" />}>
      <CveContent params={params} />
    </Suspense>
  );
}

async function CveContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = normalizeCveId(decodeURIComponent(raw));
  if (!id) notFound();
  if (id !== raw) redirect(`/cve/${id}`); // cve-2021-44228 → CVE-2021-44228

  const [cve, saved] = await Promise.all([getCve(id), getExplanation(id)]);
  if (!cve) notFound();

  const parsed = saved ? ExplanationSchema.safeParse(saved.content) : null;
  const rejected = cve.vuln_status === "Rejected";

  return (
    <article className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-6">
        <header>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={cve.cvss_severity} score={cve.cvss_score} />
            {cve.in_kev && <ExploitedBadge />}
          </div>
          <h1 className="chroma font-pixel text-4xl font-bold tracking-wide sm:text-5xl">{cve.id}</h1>
          {cve.kev_name && <p className="mt-1 text-lg">{cve.kev_name}</p>}
        </header>

        {rejected ? (
          <p className="px-panel p-5 text-muted">
            This CVE was rejected by its CNA — it&apos;s a duplicate or not a real vulnerability.
          </p>
        ) : parsed?.success ? (
          <ExplanationBody e={parsed.data} reviewed={saved!.reviewed} />
        ) : (
          <ExplanationLoader id={cve.id} />
        )}

        {!rejected && <CveChat id={cve.id} />}

        <section className="px-panel p-5">
          <h2 className="label mb-3 text-[11px] text-muted">Official description (NVD)</h2>
          <p className="text-sm leading-relaxed text-muted">{cve.description ?? "Not available yet."}</p>
        </section>
      </div>

      <aside className="space-y-4 text-sm">
        <Facts
          rows={[
            ["Published", cve.published?.slice(0, 10)],
            ["Status", cve.vuln_status],
            ["CVSS", cve.cvss_score != null ? `${cve.cvss_score} (v${cve.cvss_version ?? "?"})` : null],
            ["Vector", cve.cvss_vector],
            ["Exploit chance (EPSS)", cve.epss != null ? `${(cve.epss * 100).toFixed(1)}% in 30 days` : null],
            ["Weakness", cve.cwes.join(", ") || null],
          ]}
        />
        {cve.in_kev && (
          <div className="px-panel border-pink! p-4">
            <p className="label mb-2 text-[11px] text-pink">Known exploited (CISA KEV)</p>
            <p className="text-muted">Added {cve.kev_date_added}. Fix due {cve.kev_due_date ?? "—"}.</p>
            {cve.kev_required_action && <p className="mt-2">{cve.kev_required_action}</p>}
          </div>
        )}
        {cve.affected.length > 0 && (
          <div className="px-panel p-4">
            <p className="label mb-2 text-[11px] text-cyan">Affected products</p>
            <ul className="space-y-1 capitalize text-muted">
              {cve.affected.slice(0, 10).map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="px-panel p-4">
          <p className="label mb-2 text-[11px] text-cyan">Sources</p>
          <ul className="space-y-1 break-all">
            <li>
              <a className="text-cyan hover:underline" href={`https://nvd.nist.gov/vuln/detail/${cve.id}`} target="_blank" rel="noreferrer">
                NVD record
              </a>
            </li>
            {cve.refs.filter((r) => /^https?:\/\//i.test(r.url)).slice(0, 8).map((r) => (
              <li key={r.url}>
                <a className="text-muted hover:text-foreground hover:underline" href={r.url} target="_blank" rel="noreferrer nofollow">
                  {hostname(r.url)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </article>
  );
}

function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <dl className="px-panel p-4">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-border py-1.5 last:border-0">
            <dt className="text-muted">{k}</dt>
            <dd className="break-all text-right font-mono text-xs leading-5">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
