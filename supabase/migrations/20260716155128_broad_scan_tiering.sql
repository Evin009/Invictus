-- Tracks when search_agent/crawler_agent (broad, lower-priority discovery)
-- last ran, so discovery_node can gate them to roughly every 4 hours while
-- watchlist_agent (top-priority companies) runs every hour unconditionally.
alter table agent_settings
  add column if not exists last_broad_scan_at timestamptz;
