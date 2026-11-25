"use client";

import { useMemo, useState } from "react";
import { Flag } from "@/components/Flag";
import type { AttackPair } from "@/lib/radar";
import { LAND, MAP_H, MAP_W, POINTS } from "./world";

// All land dots as ONE svg path (thousands of <rect>s would be slow).
const LAND_PATH = LAND.flatMap((row, y) =>
  [...row].flatMap((ch, x) => (ch === "#" ? [`M${x + 0.15} ${y + 0.15}h.7v.7h-.7z`] : [])),
).join("");

type Route = AttackPair & { d: string; a: [number, number]; b: [number, number]; i: number };

/** Curved line from a to b, bending "upwards" like a flight path. */
function arc(a: [number, number], b: [number, number]) {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - Math.min(18, dist * 0.35);
  return `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`;
}

export function AttackMap({ pairs }: { pairs: AttackPair[] }) {
  const [active, setActive] = useState<number | null>(null);

  const { routes, local, max } = useMemo(() => {
    const routes: Route[] = [];
    const local: (AttackPair & { p: [number, number] })[] = [];
    pairs.forEach((p, i) => {
      const a = POINTS[p.from];
      const b = POINTS[p.to];
      if (!a || !b) return;
      if (p.from === p.to) local.push({ ...p, p: a });
      else routes.push({ ...p, a, b, d: arc(a, b), i });
    });
    return { routes, local, max: Math.max(...pairs.map((p) => p.share), 0.01) };
  }, [pairs]);

  const width = (share: number) => 0.25 + (share / max) * 0.9;
  const shown = active == null ? null : routes.find((r) => r.i === active);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="px-panel relative overflow-hidden bg-[#040d1c]! p-2">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="radar-map block h-auto w-full" role="img" aria-label="World map of attack routes in the last 24 hours">
          {/* sonar grid */}
          {[...Array(9)].map((_, i) => (
            <line key={`v${i}`} x1={(i + 1) * 18} y1={0} x2={(i + 1) * 18} y2={MAP_H} className="stroke-cyan/5" strokeWidth={0.15} />
          ))}
          <path d={LAND_PATH} className="fill-[#1d4a73]" />

          {/* attack routes */}
          {routes.map((r, n) => {
            const dim = active != null && active !== r.i;
            const hot = n < 5;
            return (
              <g key={r.i} opacity={dim ? 0.12 : 1} onMouseEnter={() => setActive(r.i)} onMouseLeave={() => setActive(null)}>
                <title>{`${r.fromName} → ${r.toName}: ${r.share}% of all attacks`}</title>
                <path d={r.d} fill="none" className={hot ? "stroke-pink/30" : "stroke-cyan/20"} strokeWidth={width(r.share)} />
                <path
                  d={r.d}
                  pathLength={100}
                  fill="none"
                  strokeLinecap="round"
                  className={`radar-comet ${hot ? "stroke-pink" : "stroke-cyan"}`}
                  strokeWidth={width(r.share) + 0.25}
                  style={{ animationDelay: `${(n * 0.37) % 3}s`, animationDuration: `${2.2 + (n % 5) * 0.35}s` }}
                />
                {/* wide invisible line so it's easy to hover */}
                <path d={r.d} fill="none" stroke="transparent" strokeWidth={2.5} />
              </g>
            );
          })}

          {/* origins */}
          {routes.map((r) => (
            <rect key={`o${r.i}`} x={r.a[0] - 0.6} y={r.a[1] - 0.6} width={1.2} height={1.2} className="fill-pink" opacity={active != null && active !== r.i ? 0.2 : 1} />
          ))}

          {/* targets: pulsing rings */}
          {[...new Map(routes.map((r) => [r.to, r.b])).entries()].map(([code, [x, y]], n) => (
            <g key={`t${code}`}>
              <circle cx={x} cy={y} r={0.9} className="fill-cyan" />
              <circle cx={x} cy={y} r={1} className="radar-ping fill-none stroke-cyan" strokeWidth={0.3} style={{ animationDelay: `${(n * 0.5) % 2.5}s` }} />
            </g>
          ))}

          {/* attacks that stay inside one country */}
          {local.map((l, n) => (
            <g key={`l${l.from}`}>
              <title>{`Inside ${l.fromName}: ${l.share}% of all attacks`}</title>
              <circle cx={l.p[0]} cy={l.p[1]} r={1.1} className="fill-pink/80" />
              <circle cx={l.p[0]} cy={l.p[1]} r={1.2} className="radar-ping fill-none stroke-pink" strokeWidth={0.35} style={{ animationDelay: `${n * 0.7}s` }} />
            </g>
          ))}
        </svg>

        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pt-2 text-[10px] text-muted sm:pointer-events-none sm:absolute sm:bottom-2 sm:left-3 sm:p-0">
          <span><span className="mr-1 inline-block h-2 w-2 bg-pink" />Source</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-cyan" />Target</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full border border-pink" />Attacks within a country</span>
        </div>
        {shown && (
          <div className="pointer-events-none absolute right-3 top-3 border-2 border-pink bg-[#0b1a33] px-3 py-2 text-xs">
            <p className="font-medium">
              <Flag code={shown.from} /> {shown.fromName} → <Flag code={shown.to} /> {shown.toName}
            </p>
            <p className="text-muted">{shown.share}% of all attacks in 24h</p>
          </div>
        )}
      </div>

      <div className="px-panel p-4">
        <p className="label mb-3 text-[11px] text-pink">Top attack routes</p>
        <ol className="max-h-[22rem] space-y-1 overflow-y-auto pr-1 text-xs">
          {pairs.map((p, i) => (
            <li
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className={`flex cursor-default items-center justify-between gap-2 border-l-2 px-2 py-1 ${active === i ? "border-pink bg-[#0b1a33]" : "border-transparent"}`}
            >
              <span className="truncate">
                <Flag code={p.from} /> {p.from} → <Flag code={p.to} /> {p.to}
              </span>
              <span className="font-mono text-muted">{p.share}%</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
