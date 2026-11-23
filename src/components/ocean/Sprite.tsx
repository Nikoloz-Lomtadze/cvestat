import type { SpriteArt } from "./sprites";

/** Renders a text-grid sprite as crisp SVG pixels. `px` = size of one pixel on screen. */
export function Sprite({
  art,
  px = 4,
  flip = false,
  className,
  style,
}: {
  art: SpriteArt;
  px?: number;
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const w = Math.max(...art.rows.map((r) => r.length));
  const h = art.rows.length;
  return (
    <svg
      width={w * px}
      height={h * px}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden
      className={className}
      style={{ ...style, transform: flip ? "scaleX(-1)" : undefined }}
    >
      {art.rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={art.palette[ch]} />,
        ),
      )}
    </svg>
  );
}
