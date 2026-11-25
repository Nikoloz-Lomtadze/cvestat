import "server-only";
import { cacheLife } from "next/cache";

// Cloudflare Radar: real, aggregated attack data from Cloudflare's network (~20% of websites).
// Free API, data licensed CC BY-NC 4.0 (fine for our non-commercial project, attribution required).
// Docs: https://developers.cloudflare.com/radar/investigate/application-layer-attacks/
// RADAR_API_BASE is only for local testing against a fake server.
const API = `${process.env.RADAR_API_BASE ?? "https://api.cloudflare.com/client/v4"}/radar/attacks/layer7`;

export type AttackPair = { from: string; fromName: string; to: string; toName: string; share: number };
export type Ranked = { code: string; name: string; share: number };
export type RadarData = {
  pairs: AttackPair[]; // biggest origin → target country routes
  origins: Ranked[]; // where attacks come from
  targets: Ranked[]; // which countries' websites get attacked
  industries: Ranked[]; // which industries get attacked
  types: Ranked[]; // how attacks were stopped (DDoS, WAF, bots…)
  updatedAt: string;
};

async function cf<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = process.env.CLOUDFLARE_RADAR_TOKEN;
  if (!token) throw new Error("Missing CLOUDFLARE_RADAR_TOKEN");
  const res = await fetch(`${API}${path}?${new URLSearchParams({ dateRange: "1d", format: "json", ...params })}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(25_000), // Radar can be slow on big queries
  });
  if (!res.ok) throw new Error(`Cloudflare Radar ${path}: ${res.status}`);
  const json = (await res.json()) as { success: boolean; result: T };
  if (!json.success) throw new Error(`Cloudflare Radar ${path}: not successful`);
  return json.result;
}

type Top<T> = { top_0: T[] };
type Summary = { summary_0: Record<string, string> };

const pct = (v: string) => Math.round(Number(v) * 100) / 100;
const fromSummary = (s: Record<string, string>, n: number): Ranked[] =>
  Object.entries(s)
    .map(([name, v]) => ({ code: name, name: pretty(name), share: pct(v) }))
    .filter((r) => r.share > 0 && r.name.toLowerCase() !== "other")
    .sort((a, b) => b.share - a.share)
    .slice(0, n);

/** Last 24 hours of attack data. Cached on the server and refreshed every 15 minutes. */
export async function getRadar(): Promise<RadarData | null> {
  "use cache";

  // Each request on its own, so one slow endpoint doesn't take down the whole page.
  const [pairs, origins, targets, industries, types] = await Promise.allSettled([
    // limitPerLocation keeps one huge source country from taking every line on the map
    cf<Top<{ originCountryAlpha2: string; originCountryName: string; targetCountryAlpha2: string; targetCountryName: string; value: string }>>(
      "/top/attacks",
      { limit: "40", limitDirection: "ORIGIN", limitPerLocation: "4" },
    ),
    cf<Top<{ originCountryAlpha2: string; originCountryName: string; value: string }>>("/top/locations/origin", { limit: "10" }),
    cf<Top<{ targetCountryAlpha2: string; targetCountryName: string; value: string }>>("/top/locations/target", { limit: "10" }),
    cf<Summary>("/summary/INDUSTRY", {}),
    cf<Summary>("/summary/MITIGATION_PRODUCT", {}),
  ]);
  const failed = [pairs, origins, targets, industries, types].filter((r) => r.status === "rejected");
  failed.forEach((r) => console.error("radar fetch failed:", (r as PromiseRejectedResult).reason));

  // Without the routes there's no map. Don't keep a failure for long — try again in a minute.
  if (pairs.status === "rejected") {
    cacheLife({ stale: 30, revalidate: 60, expire: 300 });
    return null;
  }
  // Partial data: show it, but retry sooner than usual.
  cacheLife(failed.length ? { stale: 30, revalidate: 120, expire: 3600 } : { stale: 300, revalidate: 900, expire: 86400 });

  const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
  return {
    pairs: pairs.value.top_0.map((p) => ({
      from: p.originCountryAlpha2,
      fromName: p.originCountryName,
      to: p.targetCountryAlpha2,
      toName: p.targetCountryName,
      share: pct(p.value),
    })),
    origins: (ok(origins)?.top_0 ?? []).map((o) => ({ code: o.originCountryAlpha2, name: o.originCountryName, share: pct(o.value) })),
    targets: (ok(targets)?.top_0 ?? []).map((t) => ({ code: t.targetCountryAlpha2, name: t.targetCountryName, share: pct(t.value) })),
    industries: fromSummary(ok(industries)?.summary_0 ?? {}, 8),
    types: fromSummary(ok(types)?.summary_0 ?? {}, 6),
    updatedAt: new Date().toISOString(),
  };
}

const NAMES: Record<string, string> = {
  DDOS: "DDoS protection",
  WAF: "Web firewall (WAF)",
  BOT_MANAGEMENT: "Bot management",
  ACCESS_RULES: "Access rules",
  IP_REPUTATION: "Bad IP reputation",
  API_SHIELD: "API protection",
  DATA_LOSS_PREVENTION: "Data-leak prevention",
};
function pretty(key: string) {
  if (NAMES[key]) return NAMES[key];
  // ALL_CAPS keys → "All Caps"; normal names are kept as they are
  return /^[A-Z_]+$/.test(key) ? key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : key;
}
