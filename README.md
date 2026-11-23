# CVEStat

CVEs explained simply for junior security specialists — https://cvestat.com

## How it works
- **Daily job** (`/api/cron/daily`, Vercel Cron 06:00 UTC): new CVEs from NVD, CISA KEV catalog, FIRST EPSS scores, security news RSS → Supabase.
- **CVE page** (`/cve/CVE-YYYY-NNNN`): any CVE can be opened. Missing CVEs are fetched from NVD on first view. The AI explanation (Gemini, free tier) is generated the first time a person opens it, then saved for everyone.
- **News** (`/news`): headlines + our own 1–2 sentence AI summary + link to the source.

## Stack
Next.js 16 (App Router, Cache Components) · Supabase (Postgres) · Gemini API · Vercel

## Setup
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in.
3. Run `supabase/migrations/0001_init.sql` in Supabase → SQL Editor.
4. `npm run dev`

## Project layout
```
src/app/            pages and API routes
  page.tsx          homepage
  cve/[id]/         CVE page
  news/             news page
  api/explain/      generates/saves explanations
  api/cron/daily/   daily data update
src/components/     UI pieces
src/lib/            data sources, database, AI
supabase/migrations SQL schema
```
