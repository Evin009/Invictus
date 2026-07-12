-- Single-row Slack OAuth connection (incoming-webhook scope). Replaces the
-- static SLACK_WEBHOOK_URL env var — the backend now reads the webhook URL
-- from here so it can be connected/disconnected from the Settings page
-- without redeploying the cron VM.
create table if not exists slack_integration (
    id uuid primary key default gen_random_uuid(),
    team_name text,
    channel_name text,
    webhook_url text not null,
    access_token text not null,
    connected_at timestamptz default now()
);

alter table slack_integration enable row level security;

-- One row per pipeline run, written by reporter_agent. The dashboard's
-- "Last run" card and the Slack summary message both read this same row,
-- so they can never show different numbers.
create table if not exists run_log (
    id uuid primary key default gen_random_uuid(),
    jobs_discovered int default 0,
    applied int default 0,
    manual_pending int default 0,
    interviews int default 0,
    rejections int default 0,
    replies int default 0,
    outreach_sent int default 0,
    run_at timestamptz default now()
);

alter table run_log enable row level security;

-- Default-deny, matching 20260709184741_fix_rls_and_security.sql: the
-- dashboard's "Last run" card reads this via a Next.js API route on the
-- service_role key, which always bypasses RLS.
