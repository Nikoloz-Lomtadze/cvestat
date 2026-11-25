import { ANGLER, ANGLER_LURE } from "./ocean/sprites";

const W = Math.max(...ANGLER.rows.map((r) => r.length));
const H = ANGLER.rows.length;

/** The anglerfish logo: pixel sprite + a softly pulsing glow around its lure. */
export function AnglerLogo({ px = 2, className }: { px?: number; className?: string }) {
  return (
    <svg
      width={W * px}
      height={H * px}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      aria-hidden
      className={`overflow-visible ${className ?? ""}`}
    >
      <defs>
        <radialGradient id="angler-lure-glow">
          <stop offset="0" stopColor="#4fd8ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#4fd8ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="lure-glow" cx={ANGLER_LURE.x} cy={ANGLER_LURE.y} r={5} fill="url(#angler-lure-glow)" shapeRendering="auto" />
      {ANGLER.rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={ANGLER.palette[ch]} />,
        ),
      )}
    </svg>
  );
}
