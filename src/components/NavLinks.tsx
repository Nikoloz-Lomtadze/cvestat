"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; short?: string; match: string[] }[] = [
  { href: "/cves", label: "Find CVEs", short: "CVEs", match: ["/cves", "/cve/"] },
  { href: "/news", label: "News", match: ["/news"] },
  { href: "/radar", label: "Radar", match: ["/radar"] },
];

/** Header links: bright pixel "buttons", the current page is highlighted. */
export function NavLinks() {
  return <Links path={usePathname()} />;
}

/** Same links without the highlight — shown for a split second while the page address loads. */
export function Links({ path = "" }: { path?: string }) {
  return (
    <>
      {LINKS.map((l) => {
        const active = !!path && l.match.some((m) => path.startsWith(m));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`nav-btn label ${active ? "nav-btn-active" : ""}`}
          >
            {l.short ? (
              <>
                <span className="sm:hidden">{l.short}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </>
            ) : (
              l.label
            )}
          </Link>
        );
      })}
    </>
  );
}
