-- Caches parsed job results per (careers_url, keywords) so watchlist_agent
-- can skip a Playwright scrape + Claude parse call when a company's page
-- was already checked with the same keywords within the TTL window.
create table if not exists scrape_cache (
  id uuid primary key default gen_random_uuid(),
  careers_url text not null,
  keywords_hash text not null,
  parsed_jobs jsonb not null default '[]'::jsonb,
  scraped_at timestamptz not null default now(),
  unique (careers_url, keywords_hash)
);

create index if not exists scrape_cache_lookup_idx
  on scrape_cache (careers_url, keywords_hash);
