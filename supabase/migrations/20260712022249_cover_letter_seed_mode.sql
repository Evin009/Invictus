-- Lets the user mark their sample cover letter as either a real letter to
-- reuse+edit per job ('reuse') or just a tone reference for a freshly
-- written letter each time ('tone_only', the existing default behavior).
alter table cover_letter_seeds
  add column if not exists mode text not null default 'tone_only'
  check (mode in ('reuse', 'tone_only'));
