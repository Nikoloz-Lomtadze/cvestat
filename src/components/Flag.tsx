"use client";

import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import { useEffect } from "react";
import { flag } from "@/lib/flag";

/**
 * Windows has no flag emoji (🇬🇪 shows as "GE"). This loads a small flag font
 * (Twemoji, CC BY 4.0, self-hosted) — only on systems that need it.
 */
export function FlagPolyfill() {
  useEffect(() => {
    polyfillCountryFlagEmojis("Twemoji Country Flags", "/fonts/TwemojiCountryFlags.woff2");
  }, []);
  return null;
}

export function Flag({ code }: { code: string }) {
  const f = flag(code);
  return f ? <span className="flag-emoji" aria-hidden>{f}</span> : null;
}
