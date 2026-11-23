import { Sprite } from "./Sprite";
import { CLOUD, SUN } from "./sprites";

// Stepped pixel wave across the full width (160 units): heights cycle 4,3,4,5.
const WAVE = "M0 4" + Array.from({ length: 20 }, (_, i) => `h8V${[4, 3, 4, 5][i % 4]}`).join("");

/** The surface: pixel sky, sun and clouds, ending in a wave line where the "dive" begins. */
export function SkyHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="sky relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden px-4 pb-24 pt-14">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Sprite art={SUN} px={7} className="absolute right-[12%] top-10 hidden opacity-90 sm:block" />
        <div className="cloud absolute top-6" style={{ animationDuration: "160s", animationDelay: "-40s" }}>
          <Sprite art={CLOUD} px={7} />
        </div>
        <div className="cloud absolute top-28" style={{ animationDuration: "220s", animationDelay: "-150s" }}>
          <Sprite art={CLOUD} px={5} />
        </div>
        <div className="cloud absolute top-16" style={{ animationDuration: "190s", animationDelay: "-90s" }}>
          <Sprite art={CLOUD} px={4} />
        </div>
      </div>
      <div className="relative mx-auto max-w-5xl">{children}</div>
      <svg aria-hidden className="absolute inset-x-0 bottom-0 h-10 w-full" viewBox="0 0 160 10" preserveAspectRatio="none" shapeRendering="crispEdges">
        <path d={`${WAVE}V10H0z`} fill="var(--sea-top)" />
        <path d={WAVE} fill="none" stroke="#bff0ff" strokeWidth="0.8" />
      </svg>
    </section>
  );
}
