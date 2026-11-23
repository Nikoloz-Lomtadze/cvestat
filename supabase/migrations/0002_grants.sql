-- CVEStat — table permissions
-- Newer Supabase projects don't automatically give API roles access to new tables.
-- RLS policies (in 0001) say WHICH rows a role may see; GRANTs say whether the role may touch the table at all.
-- Both are needed.

-- Our server (secret key) may do everything.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Visitors may only read public content (RLS still applies on top of this).
grant select on public.cves, public.explanations, public.news to anon, authenticated;
