import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
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
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
            <Link href="/" className="font-mono text-lg font-bold">
              CVE<span className="text-accent">Stat</span>
            </Link>
            <Link href="/cves" className="text-sm text-muted hover:text-foreground">
              Latest CVEs
            </Link>
            <Link href="/news" className="text-sm text-muted hover:text-foreground">
              News
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">
          Explanations are AI-generated and may contain mistakes — always check the official sources linked on
          each page. This product uses data from the NVD API but is not endorsed or certified by the NVD. Exploit
          data from CISA KEV and FIRST EPSS.
        </footer>
      </body>
    </html>
  );
}
