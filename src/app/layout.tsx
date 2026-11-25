import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import { Suspense } from "react";
import { AnglerLogo } from "@/components/AnglerLogo";
import { AuthButton } from "@/components/auth";
import { Links, NavLinks } from "@/components/NavLinks";
import { Ocean } from "@/components/ocean/Ocean";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cvestat.com"),
  title: { default: "CVEStat — CVEs explained simply", template: "%s · CVEStat" },
  description:
    "Learn new and famous CVEs in plain English: simple explanations, real-world examples, and an AI tutor for every vulnerability.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Ocean />
        <header className="sticky top-0 z-30 border-b-2 border-border bg-[#061428]/95 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-3 sm:gap-6 sm:px-4">
            <Link href="/" className="group flex shrink-0 items-center gap-1.5 sm:gap-2" aria-label="CVEStat home">
              <AnglerLogo className="h-6 w-auto shrink-0 transition-transform group-hover:-translate-y-0.5 sm:h-9" />
              <span className="chroma font-pixel text-base font-bold tracking-wider sm:text-2xl">CVESTAT</span>
            </Link>
            <div className="ml-auto flex items-center gap-1 whitespace-nowrap text-[10px] sm:gap-2 sm:text-[13px]">
              <Suspense fallback={<Links />}>
                <NavLinks />
              </Suspense>
              <AuthButton />
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="relative z-10 border-t-2 border-border bg-[#040d1c]/90 px-4 py-6 text-center text-xs text-muted">
          <p className="label mb-2 text-[10px] text-cyan">CVEStat · the deep dive into vulnerabilities</p>
          <p className="mx-auto max-w-3xl">
            Explanations are AI-generated and may contain mistakes — always check the official sources linked on
            each page. This product uses data from the NVD API but is not endorsed or certified by the NVD. Exploit
            data from CISA KEV and FIRST EPSS. Attack data from Cloudflare Radar (CC BY-NC 4.0).
          </p>
          <p className="mt-2">
            <Link href="/privacy" className="underline hover:text-cyan">
              Privacy policy
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
