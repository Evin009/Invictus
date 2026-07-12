-- Single-row control for the Settings page's Automation card. "paused"
-- stops apply_node from submitting new applications (discovery/tailoring/
-- reporting keep running); "daily_cap" stops it once that many applications
-- have been submitted since midnight UTC.
create table if not exists agent_settings (
    id uuid primary key default gen_random_uuid(),
    paused boolean not null default false,
    daily_cap int,
    updated_at timestamptz default now()
);

alter table agent_settings enable row level security;
