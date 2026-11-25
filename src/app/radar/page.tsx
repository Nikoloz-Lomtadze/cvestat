import type { Metadata } from "next";
import { AttackMap } from "@/components/radar/AttackMap";
import { flag } from "@/lib/flag";
import { getRadar, type Ranked } from "@/lib/radar";

export const metadata: Metadata = {
  title: "Threat Radar — live attack map",
  description: "Where cyberattacks come from and where they go, over the last 24 hours. Real data from Cloudflare Radar.",
};

export default async function RadarPage() {
  const data = await getRadar();

  return (
    <div className="space-y-6">
      <header>
        <p className="label mb-2 text-[11px] text-cyan">◎ Threat Radar</p>
        <h1 className="chroma font-pixel text-4xl font-bold tracking-wide sm:text-5xl">Live attack map</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Real attacks on websites over the last 24 hours, seen across Cloudflare&apos;s network. Lines show the biggest
          routes from the attacking country to the attacked country.
        </p>
      </header>

      {!data ? (
        <div className="px-panel p-5 text-sm text-muted">The radar is offline right now. Check back in a few minutes.</div>
      ) : (
        <>
          <AttackMap pairs={data.pairs} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Bars title="Most attacked countries" color="cyan" items={data.targets} withFlag />
            <Bars title="Top attack sources" color="pink" items={data.origins} withFlag />
            <Bars title="Most attacked industries" color="cyan" items={data.industries} />
            <Bars title="How attacks were stopped" color="pink" items={data.types} />
          </div>

          <section className="px-panel border-cyan! p-5 text-[15px] leading-relaxed">
            <h2 className="label mb-3 text-[11px] text-cyan">How to read this map</h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                These are <b>application-layer (layer 7) attacks</b>: malicious web requests that Cloudflare blocked — DDoS
                floods, hacking attempts caught by the web firewall, bad bots.
              </li>
              <li>
                <b>Source</b> is the country of the attacking IP address. Attackers often use hacked computers, botnets or
                rented servers, so this is rarely where the real attacker lives.
              </li>
              <li>
                <b>Target</b> is the country where the attacked website&apos;s owner is billed — not necessarily where its
                servers are.
              </li>
              <li>
                Percentages are shares of all blocked attacks. Moving dots show the size of each route, not individual
                attacks. Updated every 15 minutes.
              </li>
            </ul>
          </section>

          <p className="text-xs text-muted">
            Data:{" "}
            <a href="https://radar.cloudflare.com/security/application-layer" target="_blank" rel="noreferrer" className="text-cyan underline">
              Cloudflare Radar
            </a>{" "}
            (CC BY-NC 4.0), last 24 hours. Map: Natural Earth. Fetched{" "}
            {new Date(data.updatedAt).toISOString().slice(11, 16)} UTC.
          </p>
        </>
      )}
    </div>
  );
}

function Bars({ title, items, color, withFlag }: { title: string; items: Ranked[]; color: "cyan" | "pink"; withFlag?: boolean }) {
  const max = Math.max(...items.map((i) => i.share), 0.01);
  return (
    <section className="px-panel p-4">
      <h2 className={`label mb-3 text-[11px] ${color === "cyan" ? "text-cyan" : "text-pink"}`}>{title}</h2>
      {items.length === 0 ? (
        <p className="text-xs text-muted">No data.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {items.map((i) => (
            <li key={i.code}>
              <div className="mb-0.5 flex justify-between gap-2">
                <span className="truncate">
                  {withFlag && `${flag(i.code)} `}
                  {i.name}
                </span>
                <span className="font-mono text-muted">{i.share}%</span>
              </div>
              <div className="h-1.5 bg-[#0b1a33]">
                <div className={`h-full ${color === "cyan" ? "bg-cyan" : "bg-pink"}`} style={{ width: `${(i.share / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
