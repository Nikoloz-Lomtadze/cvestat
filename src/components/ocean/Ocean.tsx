"use client";

import { useEffect, useState } from "react";
import { Sprite } from "./Sprite";
import {
  BAG, BOTTLE, CAN, FISH_A, FISH_B, FISH_C, KELP, SEAWEED_A, SEAWEED_B, SMALL_FISH, type SpriteArt,
} from "./sprites";

// Fixed positions (no randomness) so the server and browser render the same thing.
type Swimmer = { art: SpriteArt; top: string; px: number; dur: number; delay: number; dir: "r" | "l"; opacity: number };

const FISH: Swimmer[] = [
  { art: FISH_A, top: "18%", px: 4, dur: 42, delay: -5, dir: "r", opacity: 0.7 },
  { art: FISH_B, top: "34%", px: 3, dur: 55, delay: -30, dir: "l", opacity: 0.55 },
  { art: SMALL_FISH, top: "27%", px: 3, dur: 28, delay: -12, dir: "r", opacity: 0.5 },
  { art: SMALL_FISH, top: "28.5%", px: 3, dur: 28, delay: -13.2, dir: "r", opacity: 0.45 },
  { art: SMALL_FISH, top: "26%", px: 3, dur: 28, delay: -14, dir: "r", opacity: 0.45 },
  { art: FISH_C, top: "52%", px: 4, dur: 64, delay: -20, dir: "l", opacity: 0.5 },
  { art: FISH_B, top: "68%", px: 4, dur: 48, delay: -40, dir: "r", opacity: 0.45 },
  { art: FISH_A, top: "80%", px: 3, dur: 70, delay: -50, dir: "l", opacity: 0.35 },
];

// Trash appears only now and then (long cycle, visible for part of it).
const TRASH: { art: SpriteArt; top: string; dur: number; delay: number }[] = [
  { art: CAN, top: "40%", dur: 95, delay: -10 },
  { art: BAG, top: "60%", dur: 120, delay: -70 },
  { art: BOTTLE, top: "24%", dur: 140, delay: -100 },
];

const BUBBLES = [
  { left: "8%", size: 6, dur: 11, delay: 0 },
  { left: "12%", size: 4, dur: 14, delay: -6 },
  { left: "88%", size: 5, dur: 12, delay: -3 },
  { left: "92%", size: 7, dur: 16, delay: -9 },
  { left: "47%", size: 4, dur: 18, delay: -12 },
  { left: "70%", size: 3, dur: 13, delay: -4 },
];

/**
 * The underwater world behind every page: water that darkens as you scroll ("dive"),
 * light rays, fish, bubbles, seaweed, and the occasional piece of drifting trash.
 * Purely decorative: pointer-events off, hidden from screen readers, calm for reduced-motion users.
 */
export function Ocean() {
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, window.scrollY / max);
      document.documentElement.style.setProperty("--depth", progress.toFixed(3));
      setDepth(Math.round(window.scrollY / 3));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <div aria-hidden className="ocean pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="ocean-dark absolute inset-0" />
        <div className="ray" style={{ left: "12%" }} />
        <div className="ray" style={{ left: "38%", animationDelay: "-3s" }} />
        <div className="ray" style={{ left: "66%", animationDelay: "-6s" }} />

        {FISH.map((f, i) => (
          <div
            key={i}
            className={`swim swim-${f.dir}`}
            style={{ top: f.top, opacity: f.opacity, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
          >
            <div className="bob" style={{ animationDelay: `${i * -0.7}s` }}>
              <Sprite art={f.art} px={f.px} flip={f.dir === "l"} />
            </div>
          </div>
        ))}

        {TRASH.map((t, i) => (
          <div
            key={i}
            className="trash"
            style={{ top: t.top, animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s` }}
          >
            <div className="tumble">
              <Sprite art={t.art} px={4} />
            </div>
          </div>
        ))}

        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="bubble"
            style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}
          />
        ))}

        {/* Seaweed beds on both edges, away from the reading area */}
        <div className="absolute bottom-0 left-0 hidden items-end gap-1 opacity-70 md:flex">
          <Sprite art={KELP} px={6} className="sway" />
          <Sprite art={SEAWEED_A} px={5} className="sway" style={{ animationDelay: "-1.5s" }} />
          <Sprite art={SEAWEED_B} px={5} className="sway" style={{ animationDelay: "-3s" }} />
        </div>
        <div className="absolute bottom-0 right-0 hidden items-end gap-1 opacity-70 md:flex">
          <Sprite art={SEAWEED_B} px={5} className="sway" style={{ animationDelay: "-2s" }} />
          <Sprite art={KELP} px={6} className="sway" style={{ animationDelay: "-0.5s" }} />
          <Sprite art={SEAWEED_A} px={5} className="sway" style={{ animationDelay: "-2.5s" }} />
        </div>
        <div className="sand absolute inset-x-0 bottom-0 h-2" />
      </div>

      {/* Depth gauge */}
      <div
        aria-hidden
        className="pointer-events-none fixed right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2 font-pixel text-xs text-cyan lg:flex"
      >
        <span className="tracking-widest opacity-70">DEPTH</span>
        <div className="relative h-40 w-1.5 bg-white/10">
          <div className="absolute inset-x-0 top-0 bg-cyan" style={{ height: "calc(var(--depth, 0) * 100%)" }} />
        </div>
        <span className="tabular-nums">{depth} m</span>
      </div>
    </>
  );
}
