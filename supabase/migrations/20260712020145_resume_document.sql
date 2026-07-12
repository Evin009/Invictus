-- Base resume .tex lives here (single row), sourced from onboarding's
-- PDF/DOCX-to-LaTeX conversion. Backend fetches tex_content each run instead
-- of reading a local file off the cron VM disk.
--
-- Default-deny RLS, matching 20260709184741_fix_rls_and_security.sql: every
-- read/write goes through the Next.js API routes or the Python backend, both
-- on the service_role key, which always bypasses RLS. No anon/authenticated
-- policy is added here since nothing queries this table directly from the browser.
create table if not exists resume_document (
    id uuid primary key default gen_random_uuid(),
    tex_content text not null,
    source_pdf_path text,
    updated_at timestamptz default now()
);

alter table resume_document enable row level security;

insert into storage.buckets (id, name, public)
values ('resumes-source', 'resumes-source', false)
on conflict (id) do nothing;
