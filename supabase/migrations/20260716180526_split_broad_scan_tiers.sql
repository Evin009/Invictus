-- Splits the single broad-scan gate into two independently-timed tiers:
-- search_agent (Greenhouse/Lever/GitHub — cheap structured APIs) now runs
-- every ~2h, while crawler_agent (real Playwright page scrapes) keeps the
-- more conservative ~4h interval. last_broad_scan_at is dropped since both
-- new columns supersede it.
alter table agent_settings
  add column if not exists last_search_scan_at timestamptz,
  add column if not exists last_crawler_scan_at timestamptz;

update agent_settings
  set last_search_scan_at = last_broad_scan_at,
      last_crawler_scan_at = last_broad_scan_at
  where last_broad_scan_at is not null;

alter table agent_settings
  drop column if exists last_broad_scan_at;
