-- The "resumes"/"cover-letters" buckets are only ever written/read via the
-- Python backend and Next.js API routes on the service_role key, which always
-- bypasses RLS. The authenticated-read policies added alongside those buckets
-- were premature (no client-side code reads them directly) and break this
-- project's default-deny convention (20260709184741_fix_rls_and_security.sql).
drop policy if exists "Authenticated read resumes" on storage.objects;
drop policy if exists "Authenticated read cover letters" on storage.objects;
