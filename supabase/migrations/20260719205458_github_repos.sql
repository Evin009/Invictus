-- User-manageable list of curated GitHub job-list repos monitored by
-- search_agent, replacing the hardcoded GITHUB_JOB_REPOS constant (kept in
-- code only as a fallback). raw_readme_url is resolved at add time (branch
-- varies per repo: dev/main/master) so the agent never has to guess.
create table if not exists github_repos (
  id uuid primary key default gen_random_uuid(),
  repo_url text not null unique,
  raw_readme_url text not null,
  added_at timestamptz not null default now()
);

insert into github_repos (repo_url, raw_readme_url) values
  ('https://github.com/SimplifyJobs/Summer2026-Internships', 'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md'),
  ('https://github.com/SimplifyJobs/New-Grad-Positions', 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md'),
  ('https://github.com/vanshb03/New-Grad-2026', 'https://raw.githubusercontent.com/vanshb03/New-Grad-2026/main/README.md')
on conflict (repo_url) do nothing;
