-- Private storage buckets for tailored resume PDFs and cover letters.
-- Files are uploaded by the backend under the service role, which bypasses
-- RLS entirely — policies below only govern access via the anon/authenticated
-- key (e.g. a future dashboard fetching signed URLs for the logged-in user).
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cover-letters', 'cover-letters', false)
on conflict (id) do nothing;

create policy "Authenticated read resumes"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'resumes');

create policy "Authenticated read cover letters"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'cover-letters');
