-- Adds structured metadata captured at discovery time so the browse-jobs
-- filter dropdowns (Location, Job Type) can actually filter real data
-- instead of comparing against fields that never existed on jobs_seen.
alter table jobs_seen
  add column if not exists location text,
  add column if not exists job_type text;
