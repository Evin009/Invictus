-- Fix Supabase security advisor findings (all ERROR-level RLS gaps + function search_path warning).
--
-- Invictus is a single-user app: every server route uses the service_role key
-- (createClient() in src/lib/supabase.ts), which always bypasses RLS — so enabling
-- RLS here does not change any app behavior served through the Next.js API routes.
-- It only closes direct public access via the PostgREST Data API using the anon key,
-- which is shipped to the browser by design and was previously able to read/write
-- every table listed below with zero restriction.
--
-- The one exception is `user_profile`, which the client queries directly (via the
-- anon/authenticated-scoped browser client) on ui/src/app/check-email/page.tsx, but
-- only after the user has an authenticated session. That page only ever SELECTs
-- full_name, so authenticated gets SELECT only; all writes continue to go through
-- the server (service_role, bypasses RLS regardless).

alter table jobs_seen           enable row level security;
alter table applications        enable row level security;
alter table outreach_log        enable row level security;
alter table reply_log           enable row level security;
alter table resume_bullets      enable row level security;
alter table user_profile        enable row level security;
alter table preferences         enable row level security;
alter table watchlist           enable row level security;
alter table crawler_urls        enable row level security;
alter table cover_letter_seeds  enable row level security;
alter table outreach_seeds      enable row level security;

-- user_profile: authenticated may read (client-side check for full_name after
-- sign-in); writes still go exclusively through service_role in the API routes.
create policy "authenticated can read profile"
  on user_profile for select
  to authenticated
  using (true);

-- All other tables get RLS enabled with no policies — default-deny for anon and
-- authenticated. service_role (used by every Next.js API route) always bypasses
-- RLS, so app functionality is unaffected.

-- Function search_path hardening (advisor: function_search_path_mutable).
-- Pin search_path so the function can't be hijacked by objects created earlier
-- in a caller's search_path, and schema-qualify the table it reads.
create or replace function match_bullets(query_embedding vector(1536), match_count int)
returns table (bullet_text text, similarity float)
language plpgsql
set search_path = ''
as $$
begin
    return query
    select rb.bullet_text, 1 - (rb.embedding <=> query_embedding) as similarity
    from public.resume_bullets rb
    order by rb.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- Move the vector extension out of the public schema (advisor: extension_in_public).
create schema if not exists extensions;
alter extension vector set schema extensions;
