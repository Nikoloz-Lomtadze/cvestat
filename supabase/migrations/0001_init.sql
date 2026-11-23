-- CVEStat — initial database schema
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- ============ CVEs ============
-- One row per CVE. Filled by the daily job, or on demand when someone opens a CVE page.
create table if not exists public.cves (
  id                  text primary key check (id ~ '^CVE-[0-9]{4}-[0-9]{4,}$'),
  published           timestamptz,
  last_modified       timestamptz,
  vuln_status         text,                         -- e.g. Analyzed, Awaiting Analysis, Rejected
  description         text,
  cvss_score          numeric(3,1),
  cvss_severity       text,                         -- LOW / MEDIUM / HIGH / CRITICAL
  cvss_vector         text,
  cvss_version        text,
  cwes                text[] not null default '{}', -- weakness types, e.g. CWE-79
  affected            text[] not null default '{}', -- "vendor product" pairs
  refs                jsonb  not null default '[]', -- [{url, tags}]
  in_kev              boolean not null default false, -- CISA "Known Exploited" catalog
  kev_name            text,
  kev_description     text,
  kev_date_added      date,
  kev_due_date        date,
  kev_required_action text,
  kev_ransomware      boolean,
  epss                numeric,                      -- probability of exploitation in next 30 days (0–1)
  epss_percentile     numeric,
  -- Our homepage ranking score, calculated by the database automatically:
  -- exploited in the wild +50, exploit probability x40, critical +10 / high +5
  importance          numeric generated always as (
                        (case when in_kev then 50 else 0 end)
                        + coalesce(epss, 0) * 40
                        + (case when cvss_score >= 9 then 10 when cvss_score >= 7 then 5 else 0 end)
                      ) stored,
  nvd_synced_at       timestamptz,                  -- null = we only have KEV data, fetch NVD on view
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists cves_published_idx  on public.cves (published desc);
create index if not exists cves_importance_idx on public.cves (importance desc);
create index if not exists cves_kev_idx        on public.cves (kev_date_added desc) where in_kev;

-- ============ AI explanations ============
-- Generated once per CVE, then served to everyone.
create table if not exists public.explanations (
  cve_id     text primary key references public.cves(id) on delete cascade,
  content    jsonb not null,
  model      text,
  reviewed   boolean not null default false,  -- true = checked by a human
  created_at timestamptz not null default now()
);

-- ============ News ============
create table if not exists public.news (
  id           bigint generated always as identity primary key,
  url          text not null unique,
  source       text not null,
  title        text not null,
  published_at timestamptz,
  summary      text,                         -- our own short AI summary
  cve_ids      text[] not null default '{}', -- CVEs mentioned in the headline/summary
  created_at   timestamptz not null default now()
);
create index if not exists news_published_idx on public.news (published_at desc);

-- ============ Usage limits ============
-- Daily counters that keep us inside the free AI tier.
create table if not exists public.usage_counters (
  key   text not null,               -- e.g. 'explain:global' or 'chat:<user id>'
  day   date not null,
  count integer not null default 0,
  primary key (key, day)
);

-- Atomically +1 a counter; returns false when the daily limit is exceeded.
create or replace function public.consume_quota(p_key text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.usage_counters (key, day, count)
  values (p_key, (now() at time zone 'utc')::date, 1)
  on conflict (key, day) do update set count = public.usage_counters.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_quota(text, integer) from public, anon, authenticated;
grant  execute on function public.consume_quota(text, integer) to service_role;

-- ============ Security (Row Level Security) ============
-- Everyone may READ public content. Nobody may WRITE from the browser:
-- all writes go through our server using the secret key, which bypasses RLS.
alter table public.cves           enable row level security;
alter table public.explanations   enable row level security;
alter table public.news           enable row level security;
alter table public.usage_counters enable row level security; -- no policies = no browser access

drop policy if exists "Public read" on public.cves;
create policy "Public read" on public.cves         for select to anon, authenticated using (true);
drop policy if exists "Public read" on public.explanations;
create policy "Public read" on public.explanations for select to anon, authenticated using (true);
drop policy if exists "Public read" on public.news;
create policy "Public read" on public.news         for select to anon, authenticated using (true);
