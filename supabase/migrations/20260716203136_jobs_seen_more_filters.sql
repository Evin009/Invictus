-- Adds the remaining filter-backing fields the browse-jobs dropdowns need:
-- Workplace, Degree Level, Sponsors Visa, Role. All best-effort/nullable —
-- populated when the source (Lever field, or regex/Claude extraction over
-- description text) actually gives a real signal, left null otherwise.
alter table jobs_seen
  add column if not exists workplace text,
  add column if not exists degree_level text,
  add column if not exists visa_sponsorship text,
  add column if not exists role_category text;
