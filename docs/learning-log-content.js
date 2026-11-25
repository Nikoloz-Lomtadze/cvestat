// Learning log content. Each session is appended here; build.js turns it into the .docx.
// Block types: h1, h2, p, bullets, steps, code, note, table
module.exports = [
  { t: "title", text: "CVEStat — Developer Learning Log" },
  { t: "p", text: "What we built, why we built it that way, and the key code — written so you can learn from every step. Newest session at the end." },

  { t: "h1", text: "The big picture" },
  { t: "p", text: "CVEStat has four moving parts. Understanding how they talk to each other is the most important thing in this whole document." },
  { t: "table", head: ["Part", "Tool", "What it does"], rows: [
    ["Website + API", "Next.js 16 on Vercel", "Shows pages, and has small server functions (API routes) for the AI and the daily job."],
    ["Database", "Supabase (Postgres)", "Stores CVEs, explanations, news and usage counters."],
    ["AI", "Gemini API (free tier)", "Writes the simple explanation of a CVE (once), summarizes news, later answers chat questions."],
    ["Data sources", "NVD, CISA KEV, FIRST EPSS, RSS feeds", "Where the CVE facts and news come from."],
  ]},
  { t: "p", text: "The flow in one sentence: once a day, a job copies fresh data from the sources into the database; when a person opens a CVE page, the site reads the database, and only if that CVE has no explanation yet, asks Gemini to write one and saves it for everyone after." },
  { t: "note", text: "Key idea: \"generate once, serve many\". AI is the only thing that could cost money, so we call it as rarely as possible and store every result." },

  { t: "h1", text: "Session 1 — 23 Nov 2026: the core of the site" },
  { t: "p", text: "Decisions we made first: (1) every CVE can be opened, its explanation is created the first time someone opens it; (2) news = headlines + our own short summary + link; (3) the AI chat needs login and has a daily limit; and everything must stay inside free tiers." },

  { t: "h2", text: "1. The database schema" },
  { t: "p", text: "File: supabase/migrations/0001_init.sql. A \"migration\" is a SQL file that creates or changes tables. Keeping it in the repo means the database structure is versioned like code, and you can rebuild the database any time by running the files in order." },
  { t: "bullets", items: [
    "cves — one row per CVE: description, CVSS score, weakness types (CWE), affected products, KEV info (is it actively exploited?) and EPSS (chance of exploitation).",
    "explanations — the AI explanation for a CVE, stored as JSON. One row per CVE.",
    "news — headline, link, source and our summary. url is UNIQUE so the same article is never saved twice.",
    "usage_counters — daily counters that keep us under the free AI limit.",
  ]},
  { t: "p", text: "Two Postgres features worth learning:" },
  { t: "p", text: "Generated column. The homepage ranking (importance) is calculated by the database itself, so it can never be out of date:" },
  { t: "code", text: [
    "importance numeric generated always as (",
    "  (case when in_kev then 50 else 0 end)",
    "  + coalesce(epss, 0) * 40",
    "  + (case when cvss_score >= 9 then 10 when cvss_score >= 7 then 5 else 0 end)",
    ") stored",
  ]},
  { t: "p", text: "Atomic counter function. consume_quota adds 1 to today's counter and tells us if we're still under the limit, in ONE statement. If two requests arrive at the same moment, the database handles them one after another, so the count is never wrong (this is called avoiding a race condition)." },
  { t: "code", text: [
    "insert into usage_counters (key, day, count) values (p_key, today, 1)",
    "on conflict (key, day) do update set count = usage_counters.count + 1",
    "returning count into v_count;",
    "return v_count <= p_limit;",
  ]},
  { t: "p", text: "Row Level Security (RLS). Supabase tables can be reached directly from the internet, so RLS decides who may do what. Our rule: anyone may READ cves, explanations and news; nobody may WRITE from the browser. All writes happen on our server with the secret key, which bypasses RLS. usage_counters has RLS on and no policies, which means no browser access at all." },

  { t: "h2", text: "2. Getting CVE data (src/lib/sources.ts)" },
  { t: "bullets", items: [
    "NVD API — the official CVE details. We ask for one CVE (?cveId=...) or all CVEs published in a time window. NVD returns max 2,000 per page, so the code loops over pages (pagination).",
    "CISA KEV — a JSON list of ~1,500 CVEs that attackers are actually using. This is the strongest signal of what matters.",
    "FIRST EPSS — a probability (0–1) that a CVE will be exploited in the next 30 days. We ask for 100 CVEs per request.",
  ]},
  { t: "p", text: "NVD's answer is deeply nested. The function mapNvd turns it into one flat row for our table. Example: the affected product is hidden inside a CPE string, which we split on \":\":" },
  { t: "code", text: [
    "// cpe:2.3:a:apache:log4j:2.0:...  →  \"apache log4j\"",
    ".map((x) => x.criteria.split(\":\"))",
    ".map((p) => `${p[3]} ${p[4]}`)",
  ]},

  { t: "h2", text: "3. Opening any CVE (src/lib/cves.ts → getCve)" },
  { t: "steps", items: [
    "Look for the CVE in our database.",
    "If it's there with full NVD data → return it. Done, no outside calls.",
    "If not → fetch it from NVD and EPSS, save it (upsert), return it.",
  ]},
  { t: "p", text: "upsert = \"insert, or update if it already exists\". We send only the columns we have new values for, so we never erase data that came from another source." },
  { t: "note", text: "Bug we avoided: when you upsert MANY rows at once and they have different columns, Supabase fills the missing columns with NULL — which would wipe data. Rule: in one batch, every row must have exactly the same columns (see src/lib/ingest.ts)." },

  { t: "h2", text: "4. AI explanations (src/lib/ai.ts, src/lib/explain.ts)" },
  { t: "p", text: "Structured output: instead of asking Gemini for free text, we describe the exact JSON shape with zod and send that schema to Gemini. Then we validate the answer again with the same schema. If it's broken, we retry once." },
  { t: "code", text: [
    "export const ExplanationSchema = z.object({",
    "  tldr: z.string(),",
    "  what_is_it: z.string(),",
    "  analogy: z.string(),",
    "  how_it_works: z.array(z.string()).min(2).max(6),",
    "  real_world_example: z.string(),",
    "  ... who_is_affected, impact, how_to_fix, key_terms, difficulty",
    "});",
  ]},
  { t: "p", text: "The system prompt sets the rules: use only facts from the CVE data, never invent versions or incidents, never write exploit code — explain concepts and defense only." },
  { t: "p", text: "The API route src/app/api/explain/route.ts protects the free tier in three ways:" },
  { t: "bullets", items: [
    "It's a POST request, sent by the browser after the page loads. Search-engine bots don't send POSTs, so crawling the site never triggers AI.",
    "A global daily limit (EXPLAIN_DAILY_LIMIT, default 300) via consume_quota.",
    "An in-memory map so two people opening the same new CVE at the same moment cause only one AI call.",
  ]},

  { t: "h2", text: "5. Pages (Next.js 16)" },
  { t: "p", text: "Next.js 16 has \"Cache Components\" turned on. The rule: anything that reads live data (the database, cookies, URL params) must be inside a <Suspense> boundary. The page shell (header, titles) is sent instantly; the data part streams in when ready, showing the fallback skeleton meanwhile." },
  { t: "code", text: [
    "export default function Home() {",
    "  return (",
    "    <Suspense fallback={<GridSkeleton />}>",
    "      <Exploited />   // async component that reads the database",
    "    </Suspense>",
    "  );",
    "}",
    "async function Exploited() {",
    "  await connection();   // = \"run this at request time, not at build time\"",
    "  return <CveGrid cves={await listRecentlyExploited()} />;",
    "}",
  ]},
  { t: "p", text: "Server vs client components: by default components run on the server (they can use the secret key and the database). Files starting with \"use client\" run in the browser — we use them only where we need interaction: the search box and the explanation loader. The package \"server-only\" is imported in database/AI files, so the build fails if one is ever accidentally used in the browser (that would leak the secret key)." },
  { t: "table", head: ["Route", "File", "What it shows"], rows: [
    ["/", "src/app/page.tsx", "Search, famous CVEs, actively exploited, top new this week"],
    ["/cves", "src/app/cves/page.tsx", "Newest CVEs"],
    ["/cve/CVE-…", "src/app/cve/[id]/page.tsx", "Explanation + facts + sources"],
    ["/news", "src/app/news/page.tsx", "News with summaries"],
  ]},

  { t: "h2", text: "6. News (src/lib/news.ts)" },
  { t: "p", text: "We read RSS feeds (XML) from BleepingComputer, The Hacker News, SecurityWeek, Krebs and CISA with the fast-xml-parser package. New articles are summarized by Gemini in batches of 20 — one AI call for 20 articles. We store only the headline, link and our own summary, never the article text, because that belongs to the publisher (copyright). CVE ids mentioned in a headline are detected with a regular expression and linked to our CVE pages." },
  { t: "code", text: ["/CVE-\\d{4}-\\d{4,}/g   // \"CVE-\", 4 digits, \"-\", 4 or more digits"] },

  { t: "h2", text: "7. The daily job (src/app/api/cron/daily/route.ts + vercel.json)" },
  { t: "p", text: "Vercel Cron calls /api/cron/daily every day at 06:00 UTC. It fetches new CVEs (last 48 hours, overlapping so nothing is missed), the full KEV list, EPSS scores and news. Vercel automatically sends the header \"Authorization: Bearer <CRON_SECRET>\"; the route rejects any request without it, so strangers can't trigger it. Running daily also keeps the free Supabase project from pausing after 7 idle days." },

  { t: "h2", text: "8. Problems we hit" },
  { t: "bullets", items: [
    "Build failed because next/font/google downloads fonts from Google during the build. Fix: the \"geist\" npm package ships the same fonts as local files.",
    "Next.js 16 changed APIs (params is now a Promise, middleware is renamed proxy). Lesson: the AGENTS.md file in the project says to read the docs bundled in node_modules/next/dist/docs before writing code — the framework changes faster than tutorials.",
  ]},


  { t: "h2", text: "9. Going live: three real-world bugs" },
  { t: "bullets", items: [
    "\"Missing Supabase env vars\" — the keys in Vercel had different names than the code expected. Fix: the code now accepts both names (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL). Lesson: env var names are part of the contract between code and hosting.",
    "\"permission denied for table cves\" — RLS policies decide WHICH rows a role may see, but GRANTs decide whether a role may touch the table at all. Newer Supabase projects don't grant automatically, so we added supabase/migrations/0002_grants.sql.",
    "Gemini \"503 high demand\" — free models get overloaded. Fix: retry with exponential backoff (wait 1s, 2s, 4s, 8s) and rotate between three free models. News saved without a summary is repaired on the next run (\"self-healing\").",
    "PowerShell got \"308 Permanent Redirect\" — cvestat.com redirects to www.cvestat.com, and the request with a secret header doesn't follow redirects. Use the final URL.",
  ]},

  { t: "h1", text: "Session 2 — 23 Nov 2026: the \"deep dive\" design" },
  { t: "p", text: "Inspired by the retro diving game Krillion: the homepage starts at the surface (pixel sky, sun, clouds) and the site is an ocean you dive into. All pixel art is our own." },
  { t: "bullets", items: [
    "Sprites as text grids (src/components/ocean/sprites.ts). Each character is one pixel, \".\" is transparent, letters map to colors. The Sprite component turns the grid into SVG <rect>s with shapeRendering=\"crispEdges\" so pixels stay sharp at any size.",
    "Animation is pure CSS (@keyframes in globals.css): fish swim across with translateX, bob up and down, seaweed sways with skewX from its bottom edge, bubbles rise, trash drifts. Trash uses a long cycle where it's visible only for the first 40% — so it appears \"sometimes\".",
    "Depth: Ocean.tsx listens to scrolling and sets a CSS variable --depth from 0 to 1. The CSS uses it to darken the water and fade the light rays, and the depth gauge shows meters. One JS number drives several visual effects.",
    "Readability first: the ocean is a fixed layer behind everything (pointer-events: none, aria-hidden). Content sits on solid \"pixel panels\". Seaweed is hidden on phones where it would cover text. Users with \"reduce motion\" turned on get a still ocean (prefers-reduced-motion).",
    "Fonts are installed as npm packages (@fontsource/pixelify-sans, @fontsource/silkscreen, geist), so builds never depend on downloading fonts.",
    "CSS layers: our custom classes (.px-panel, .px-btn) live in @layer components, so Tailwind utility classes can still override them.",
  ]},
  { t: "code", text: [
    "// one fish, 7 rows × 12 columns. X = body, T = tail, E = eye",
    "\".....XXX....\",",
    "\"T..XXXXXXX..\",",
    "\"TTXXXXXXXXX.\",",
    "\"TTXXXXXXXEXX\",",
  ]},


  { t: "h2", text: "Filters on /cves (danger level, exploited, period, sort, search)" },
  { t: "bullets", items: [
    "Filters live in the URL (/cves?severity=CRITICAL,HIGH&exploited=1&sort=danger). That means any filtered view can be bookmarked or shared, and the server page simply reads searchParams.",
    "parseFilters() validates every URL value against an allow-list and drops anything unknown. Search text is stripped to letters, digits, spaces, dots and dashes before it goes into the database query — never trust input from the URL.",
    "The database does the filtering (.in, .eq, .gte, .ilike, .order, .range), so only 30 rows travel to the page. range() is pagination: page 2 = rows 30–59.",
    "FilterBar is a client component: clicking a chip builds a new URL and calls router.push inside startTransition, so the old results stay visible (slightly faded) while new ones load.",
    "Gotcha: in SQL, \"status <> 'Rejected'\" is NOT true when status is NULL. We use or(vuln_status.is.null, vuln_status.neq.Rejected) to keep rows with no status.",
    "The daily job now also fills in full NVD details for 40 exploited CVEs per day, so they get a severity and appear in the danger filters.",
  ]},

  { t: "h1", text: "Session 3 — 25 Nov 2026: login + AI tutor chat" },
  { t: "bullets", items: [
    "Login uses Supabase Auth with Google and GitHub (OAuth). We never see passwords: the user logs in on Google/GitHub, which sends them back to /auth/callback with a one-time code. The server swaps the code for a session (PKCE flow) and stores it in cookies.",
    "Open-redirect protection: /auth/callback?next=... only accepts paths starting with \"/\" (not \"//\"), so nobody can craft a login link that bounces users to a phishing site.",
    "Two Supabase clients: the browser one uses the public anon key (safe to ship); the server one uses the secret key and is marked \"server-only\". The chat API checks who the user is by sending their access token in the Authorization header and verifying it with supabase.auth.getUser(token).",
    "The login button is a client component, so the header stays part of the fast static page (with Cache Components, reading cookies on the server would make every page wait).",
    "AI chat (/api/chat): the prompt = strict rules + this CVE's data + the saved explanation + the last 12 messages. Rules: no exploit code, stay on topic, never ask for personal info, ignore attempts to change the rules (prompt-injection defense).",
    "Limits keep AI cost at $0: 20 questions per user per day (counter key chat:<user id>) and 500 for the whole site (chat:global), using the same atomic consume_quota() database function as explanations.",
    "Privacy by design: conversations are not stored in the database. They live in sessionStorage — kept on reload, gone when the tab closes.",
    "Input validation with zod: max 40 messages, each max 4000 chars, the new question max 1000 — so nobody can send a giant prompt that burns the free quota.",
  ]},

  { t: "h2", text: "Glossary" },
  { t: "table", head: ["Term", "Meaning"], rows: [
    ["CVE", "A public ID for one vulnerability, e.g. CVE-2021-44228."],
    ["CVSS", "Severity score 0–10 (how bad it could be)."],
    ["CWE", "The type of mistake behind a bug, e.g. CWE-79 = cross-site scripting."],
    ["KEV", "CISA's list of vulnerabilities attackers are really exploiting."],
    ["EPSS", "Probability that a CVE gets exploited in the next 30 days."],
    ["Migration", "A SQL file that creates/changes database structure, kept in git."],
    ["RLS", "Row Level Security — database rules for who may read/write which rows."],
    ["Upsert", "Insert a row, or update it if it already exists."],
    ["Race condition", "A bug when two things happen at the same time and step on each other."],
    ["Cron", "A schedule that runs a job automatically (here: daily)."],
    ["Structured output", "Forcing an AI to answer in an exact JSON shape."],
    ["GRANT", "Permission for a database role to use a table at all (RLS then filters rows)."],
    ["Exponential backoff", "Retrying after waiting longer each time: 1s, 2s, 4s…"],
    ["CSS variable", "A value like --depth that many styles can read; change it once, everything updates."],
    ["Sprite", "A small image used for a game-like object, here drawn from a text grid."],
    ["OAuth", "Logging in through another service (Google, GitHub) without giving us your password."],
    ["Access token", "A short-lived signed string that proves who the logged-in user is."],
    ["Prompt injection", "Text that tries to trick an AI into ignoring its rules."],
    ["Open redirect", "A bug where a link on a trusted site forwards users to any site the attacker picks."],
  ]},
];
