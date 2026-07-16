-- Caches detected ATS platform/board token per watchlist company so
-- search_agent doesn't re-guess-and-verify against Greenhouse/Lever's live
-- APIs on every run. ats_checked_at distinguishes "detected, no ATS found"
-- (ats_platform stays null) from "never checked yet".
alter table watchlist
  add column if not exists ats_platform text,
  add column if not exists ats_token text,
  add column if not exists ats_checked_at timestamptz;
