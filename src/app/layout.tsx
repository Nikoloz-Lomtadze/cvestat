import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import { AuthButton } from "@/components/auth";
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
        <header className="sticky top-0 z-30 border-b-2 border-border bg-[#071a33]/90 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="chroma font-pixel text-2xl font-bold tracking-wider">
              CVESTAT
            </Link>
            <div className="ml-auto flex items-center gap-5 text-xs">
              <Link href="/cves" className="label text-muted hover:text-cyan">
                Find CVEs
              </Link>
              <Link href="/news" className="label text-muted hover:text-cyan">
                News
              </Link>
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
            data from CISA KEV and FIRST EPSS.
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
