-- Enable pgvector
create extension if not exists vector;

create table if not exists jobs_seen (
    id uuid primary key default gen_random_uuid(),
    job_url text unique not null,
    job_id text,
    title text,
    company text,
    source text,         -- 'greenhouse' | 'lever' | 'github' | 'crawler' | 'watchlist'
    raw_json jsonb,
    created_at timestamptz default now()
);

create table if not exists applications (
    id uuid primary key default gen_random_uuid(),
    job_url text not null references jobs_seen(job_url),
    title text,
    company text,
    ats_platform text,   -- 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'manual'
    fields_filled jsonb,
    open_ended_answers jsonb,
    resume_version text,
    resume_pdf_path text,
    cover_letter_path text,
    submission_type text, -- 'auto' | 'manual'
    confirmation_screenshot text,
    status text default 'applied',  -- 'applied' | 'interview' | 'rejection' | 'ghosted'
    submitted_at timestamptz default now()
);

create table if not exists outreach_log (
    id uuid primary key default gen_random_uuid(),
    job_url text references jobs_seen(job_url),
    company text,
    contact_name text,
    contact_email text,
    contact_linkedin text,
    contact_title text,
    channel text,        -- 'email' | 'linkedin'
    message_text text,
    sent_at timestamptz default now(),
    reply_received boolean default false
);

create table if not exists reply_log (
    id uuid primary key default gen_random_uuid(),
    job_url text references jobs_seen(job_url),
    channel text,        -- 'email' | 'linkedin'
    sender text,
    subject text,
    body text,
    classification text, -- 'interview_request' | 'rejection' | 'follow_up_needed' | 'generic_acknowledgement' | 'recruiter_reply_to_outreach' | 'other'
    received_at timestamptz default now()
);

create table if not exists resume_bullets (
    id uuid primary key default gen_random_uuid(),
    source_file text,
    section text,
    bullet_text text,
    embedding vector(1536),
    unique (source_file, bullet_text)
);

create table if not exists user_profile (
    id uuid primary key default gen_random_uuid(),
    full_name text,
    email text,
    phone text,
    linkedin_url text,
    github_url text,
    education jsonb,
    work_history jsonb,
    skills text[]
);

create table if not exists preferences (
    id uuid primary key default gen_random_uuid(),
    locations text[],    -- e.g. ['Remote', 'Tampa', 'New York']
    seniority text[],    -- e.g. ['entry', 'intern']
    salary_floor int,
    role_keywords text[] -- e.g. ['SWE', 'Data Engineer', 'ML Engineer']
);

create table if not exists watchlist (
    id uuid primary key default gen_random_uuid(),
    company_name text,
    careers_url text,
    role_keywords text[]
);

create table if not exists crawler_urls (
    id uuid primary key default gen_random_uuid(),
    company_name text,
    careers_url text,
    active boolean default true
);

create table if not exists cover_letter_seeds (
    id uuid primary key default gen_random_uuid(),
    content text,
    label text
);

create table if not exists outreach_seeds (
    id uuid primary key default gen_random_uuid(),
    content text,
    label text
);

-- pgvector similarity search function (run after tables created)
create or replace function match_bullets(query_embedding vector(1536), match_count int)
returns table (bullet_text text, similarity float)
language plpgsql as $$
begin
    return query
    select rb.bullet_text, 1 - (rb.embedding <=> query_embedding) as similarity
    from resume_bullets rb
    order by rb.embedding <=> query_embedding
    limit match_count;
end;
$$;
