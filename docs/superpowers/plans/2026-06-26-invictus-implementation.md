# Invictus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully autonomous multi-agent AI job application system that discovers, tailors, submits, and tracks job applications 24/7 with hourly Slack reporting.

**Architecture:** One LangGraph state graph triggered hourly by cron. Each agent is a node; state flows per job item through the graph. Supabase is the shared persistent store all agents read from and write to. Slack is the sole notification surface.

**Tech Stack:** Python, LangGraph, LangChain, Claude claude-sonnet-4-6 (Anthropic API), Supabase (Postgres + pgvector), Playwright (via MCP), Gmail API, Hunter.io or Apollo.io API, Slack incoming webhooks, latexmk/pdflatex, cron on cloud VM.

## Global Constraints

- Python 3.11+
- LangGraph for all agent orchestration — no raw loops replacing graph nodes
- Claude claude-sonnet-4-6 (`claude-sonnet-4-6`) via Anthropic SDK for all LLM calls
- Supabase for all persistence — no local state between runs
- No scraping on sources that provide public APIs (Greenhouse, Lever)
- Resume tailoring: hard 2-page cap, no layout changes, no new sections
- Cover letters: 1-page max, no generic lines
- LinkedIn outreach: never automate sends — always draft + Slack approval only
- All secrets in `.env` — never hardcoded
- Every agent error must log to Supabase and ping Slack before raising

---

## File Structure

```
invictus/
├── src/
│   ├── state.py                    # LangGraph GraphState — shared across all agents
│   ├── graph.py                    # Full LangGraph graph: nodes, edges, entry point
│   ├── config.py                   # Env var loading, constants
│   ├── db/
│   │   ├── client.py               # Supabase client singleton
│   │   └── schema.sql              # Full schema (all 11 tables)
│   ├── notifications/
│   │   └── slack.py                # post_message(), post_error(), post_summary()
│   ├── agents/
│   │   ├── search.py               # Search Agent: Greenhouse + Lever APIs + GitHub repos
│   │   ├── watchlist.py            # Watchlist Agent: VIP company deeper check
│   │   ├── crawler.py              # Broad Career-Page Crawler: Playwright + LLM parser
│   │   ├── resume_tailor.py        # Resume Tailoring Agent: RAG retrieval + LaTeX rewrite
│   │   ├── cover_letter.py         # Cover Letter Agent: tone-seeded generation
│   │   ├── apply.py                # Apply Agent: Playwright ATS form-fill + submit
│   │   ├── outreach.py             # Outreach Agent: find contacts + Gmail send + LinkedIn draft
│   │   ├── reply_tracker.py        # Reply Tracking Agent: Gmail + LinkedIn inbox scan + classify
│   │   └── reporter.py             # Tracking & Reporting Agent: Slack hourly summary
│   ├── filters/
│   │   ├── preference.py           # Rule-based preference filter (no LLM)
│   │   └── dedup.py                # Supabase dedup check: jobs_seen + outreach_log
│   └── rag/
│       ├── embedder.py             # Chunk .tex resumes → bullets → embed → pgvector upsert
│       └── retriever.py            # Embed JD → vector search → return top-k bullets
├── tests/
│   ├── test_preference_filter.py
│   ├── test_dedup.py
│   ├── test_search_agent.py
│   ├── test_watchlist_agent.py
│   ├── test_rag_embedder.py
│   ├── test_rag_retriever.py
│   ├── test_resume_tailor.py
│   ├── test_cover_letter.py
│   ├── test_outreach.py
│   ├── test_reply_tracker.py
│   └── test_reporter.py
├── resumes/                        # Your .tex base resume files
├── pyproject.toml
├── .env.example
└── README.md
```

---

## Phase 1: Foundation

### Task 1: Project Setup + Dependencies

**Files:**
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `src/config.py`

**Interfaces:**
- Produces: `from src.config import settings` — a `Settings` dataclass with all env vars

- [ ] **Step 1: Initialize project**

```bash
mkdir invictus && cd invictus
python -m venv .venv && source .venv/bin/activate
pip install langgraph langchain langchain-anthropic supabase playwright anthropic python-dotenv pytest pytest-asyncio
playwright install chromium
```

- [ ] **Step 2: Create `pyproject.toml`**

```toml
[project]
name = "invictus"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "langgraph>=0.2",
    "langchain>=0.3",
    "langchain-anthropic>=0.3",
    "anthropic>=0.40",
    "supabase>=2.0",
    "playwright>=1.45",
    "python-dotenv>=1.0",
]

[project.optional-dependencies]
dev = ["pytest>=8", "pytest-asyncio>=0.23"]
```

- [ ] **Step 3: Create `.env.example`**

```bash
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SLACK_WEBHOOK_URL=
GMAIL_CREDENTIALS_PATH=credentials.json
HUNTER_API_KEY=
GREENHOUSE_API_KEY=
LEVER_API_KEY=
GITHUB_TOKEN=
```

- [ ] **Step 4: Create `src/config.py`**

```python
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    anthropic_api_key: str
    supabase_url: str
    supabase_key: str
    slack_webhook_url: str
    gmail_credentials_path: str
    hunter_api_key: str
    greenhouse_api_key: str
    lever_api_key: str
    github_token: str

settings = Settings(
    anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
    supabase_url=os.environ["SUPABASE_URL"],
    supabase_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    slack_webhook_url=os.environ["SLACK_WEBHOOK_URL"],
    gmail_credentials_path=os.environ.get("GMAIL_CREDENTIALS_PATH", "credentials.json"),
    hunter_api_key=os.environ["HUNTER_API_KEY"],
    greenhouse_api_key=os.environ.get("GREENHOUSE_API_KEY", ""),
    lever_api_key=os.environ.get("LEVER_API_KEY", ""),
    github_token=os.environ.get("GITHUB_TOKEN", ""),
)
```

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml .env.example src/config.py
git commit -m "feat: project setup, dependencies, config"
```

---

### Task 2: Supabase Schema

**Files:**
- Create: `src/db/schema.sql`
- Create: `src/db/client.py`

**Interfaces:**
- Produces: `from src.db.client import db` — Supabase client used by all agents

- [ ] **Step 1: Create `src/db/schema.sql`**

```sql
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
    embedding vector(1536)
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
```

- [ ] **Step 2: Run schema against Supabase**

In Supabase dashboard SQL editor, paste and run `schema.sql` contents. Verify all 11 tables created.

- [ ] **Step 3: Create `src/db/client.py`**

```python
from supabase import create_client, Client
from src.config import settings

_client: Client | None = None

def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client

db = get_client()
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.sql src/db/client.py
git commit -m "feat: supabase schema (11 tables) + client singleton"
```

---

### Task 3: Slack Notifier + LangGraph State

**Files:**
- Create: `src/notifications/slack.py`
- Create: `src/state.py`

**Interfaces:**
- Produces:
  - `post_message(text: str) -> None`
  - `post_error(agent: str, error: str, context: dict) -> None`
  - `post_summary(summary: dict) -> None`
  - `GraphState` TypedDict — imported by every agent and `graph.py`

- [ ] **Step 1: Write failing test for Slack notifier**

```python
# tests/test_slack.py
from unittest.mock import patch, MagicMock
from src.notifications.slack import post_message, post_error

def test_post_message_sends_payload():
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.return_value.__enter__ = lambda s: s
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)
        post_message("hello test")
        assert mock_urlopen.called

def test_post_error_includes_agent_name():
    with patch("src.notifications.slack.post_message") as mock_post:
        post_error("search_agent", "timeout", {"job_url": "https://example.com"})
        call_text = mock_post.call_args[0][0]
        assert "search_agent" in call_text
        assert "timeout" in call_text
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_slack.py -v
```
Expected: `ModuleNotFoundError` or `ImportError`

- [ ] **Step 3: Create `src/notifications/slack.py`**

```python
import json
import urllib.request
from src.config import settings

def post_message(text: str) -> None:
    payload = json.dumps({"text": text}).encode()
    req = urllib.request.Request(
        settings.slack_webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req):
        pass

def post_error(agent: str, error: str, context: dict) -> None:
    lines = [f":red_circle: *{agent} error*", f"```{error}```"]
    for k, v in context.items():
        lines.append(f"• {k}: {v}")
    post_message("\n".join(lines))

def post_summary(summary: dict) -> None:
    lines = [":bar_chart: *Invictus Hourly Summary*"]
    for k, v in summary.items():
        lines.append(f"• {k}: {v}")
    post_message("\n".join(lines))
```

- [ ] **Step 4: Create `src/state.py`**

```python
from typing import TypedDict, Any

class JobItem(TypedDict):
    job_url: str
    job_id: str
    title: str
    company: str
    source: str
    description: str
    ats_platform: str
    raw_json: dict

class GraphState(TypedDict):
    run_id: str
    jobs_discovered: list[JobItem]        # after search/watchlist/crawler
    jobs_filtered: list[JobItem]          # after preference filter + dedup
    jobs_tailored: list[dict]             # after resume tailor: includes resume_pdf_path
    jobs_applied: list[dict]              # after apply: includes confirmation
    jobs_outreached: list[dict]           # after outreach
    errors: list[dict]                    # {agent, error, context} per error
    summary: dict                         # populated by reporter
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_slack.py -v
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/notifications/slack.py src/state.py tests/test_slack.py
git commit -m "feat: slack notifier + langgraph state definition"
```

---

## Phase 2: Job Discovery

### Task 4: Search Agent (Greenhouse + Lever + GitHub)

**Files:**
- Create: `src/agents/search.py`
- Create: `tests/test_search_agent.py`

**Interfaces:**
- Consumes: `GraphState`, `db`, `settings`
- Produces: `search_agent(state: GraphState) -> dict` — returns `{"jobs_discovered": [JobItem, ...]}`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_search_agent.py
from unittest.mock import patch, MagicMock
from src.agents.search import fetch_greenhouse_jobs, fetch_lever_jobs, fetch_github_jobs

def test_fetch_greenhouse_returns_list():
    mock_response = [{"id": "123", "title": "SWE", "absolute_url": "https://example.com/job/123", "metadata": []}]
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps({"jobs": mock_response}).encode()
        mock_open.return_value = mock_cm
        result = fetch_greenhouse_jobs(board_token="testco", keywords=["SWE"])
    assert isinstance(result, list)
    assert result[0]["job_url"].startswith("https://")

def test_fetch_lever_returns_list():
    mock_response = [{"id": "abc", "text": "Engineer", "hostedUrl": "https://jobs.lever.co/testco/abc"}]
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps(mock_response).encode()
        mock_open.return_value = mock_cm
        result = fetch_lever_jobs(company="testco", keywords=["Engineer"])
    assert isinstance(result, list)

def test_fetch_github_jobs_returns_list():
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = b"| Company | Role | Link |\n|---|---|---|\n| Acme | SWE | https://acme.com/job |"
        mock_open.return_value = mock_cm
        result = fetch_github_jobs(repo_url="https://raw.githubusercontent.com/test/repo/main/README.md", keywords=["SWE"])
    assert isinstance(result, list)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_search_agent.py -v
```

- [ ] **Step 3: Create `src/agents/search.py`**

```python
import json
import re
import urllib.request
from src.state import GraphState, JobItem
from src.config import settings
from src.notifications.slack import post_error

def fetch_greenhouse_jobs(board_token: str, keywords: list[str]) -> list[JobItem]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true"
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    jobs = []
    for j in data.get("jobs", []):
        title = j.get("title", "")
        if not any(kw.lower() in title.lower() for kw in keywords):
            continue
        jobs.append(JobItem(
            job_url=j["absolute_url"],
            job_id=str(j["id"]),
            title=title,
            company=board_token,
            source="greenhouse",
            description=j.get("content", ""),
            ats_platform="greenhouse",
            raw_json=j,
        ))
    return jobs

def fetch_lever_jobs(company: str, keywords: list[str]) -> list[JobItem]:
    url = f"https://api.lever.co/v0/postings/{company}?mode=json"
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    jobs = []
    for j in data:
        title = j.get("text", "")
        if not any(kw.lower() in title.lower() for kw in keywords):
            continue
        jobs.append(JobItem(
            job_url=j["hostedUrl"],
            job_id=j["id"],
            title=title,
            company=company,
            source="lever",
            description=j.get("descriptionPlain", ""),
            ats_platform="lever",
            raw_json=j,
        ))
    return jobs

def fetch_github_jobs(repo_url: str, keywords: list[str]) -> list[JobItem]:
    req = urllib.request.Request(repo_url, headers={"Authorization": f"token {settings.github_token}"})
    with urllib.request.urlopen(req) as r:
        content = r.read().decode()
    jobs = []
    for line in content.splitlines():
        if not any(kw.lower() in line.lower() for kw in keywords):
            continue
        urls = re.findall(r'https?://\S+', line)
        if not urls:
            continue
        jobs.append(JobItem(
            job_url=urls[0].rstrip(")"),
            job_id=urls[0].rstrip(")"),
            title=line[:80],
            company="",
            source="github",
            description=line,
            ats_platform="unknown",
            raw_json={"raw_line": line},
        ))
    return jobs

def search_agent(state: GraphState) -> dict:
    prefs_row = None
    try:
        from src.db.client import db
        prefs_row = db.table("preferences").select("*").limit(1).execute().data
    except Exception as e:
        post_error("search_agent", str(e), {"step": "load_preferences"})
        return {"jobs_discovered": state.get("jobs_discovered", [])}

    keywords = prefs_row[0]["role_keywords"] if prefs_row else ["software engineer"]
    all_jobs: list[JobItem] = []

    # Greenhouse boards — extend this list with your target companies' board tokens
    greenhouse_boards = ["greenhouse"]  # replace with real board tokens
    for board in greenhouse_boards:
        try:
            all_jobs.extend(fetch_greenhouse_jobs(board, keywords))
        except Exception as e:
            post_error("search_agent", str(e), {"source": "greenhouse", "board": board})

    existing = state.get("jobs_discovered", [])
    seen_urls = {j["job_url"] for j in existing}
    new_jobs = [j for j in all_jobs if j["job_url"] not in seen_urls]
    return {"jobs_discovered": existing + new_jobs}
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_search_agent.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/agents/search.py tests/test_search_agent.py
git commit -m "feat: search agent — greenhouse, lever, github job fetching"
```

---

### Task 5: Preference Filter + Dedup Check

**Files:**
- Create: `src/filters/preference.py`
- Create: `src/filters/dedup.py`
- Create: `tests/test_preference_filter.py`
- Create: `tests/test_dedup.py`

**Interfaces:**
- Consumes: `list[JobItem]`, `db`
- Produces:
  - `preference_filter(jobs: list[JobItem], prefs: dict) -> list[JobItem]`
  - `dedup_filter(jobs: list[JobItem]) -> list[JobItem]` — writes new jobs to `jobs_seen`, returns only new ones

- [ ] **Step 1: Write failing tests**

```python
# tests/test_preference_filter.py
from src.filters.preference import preference_filter
from src.state import JobItem

PREFS = {
    "locations": ["Remote", "Tampa"],
    "seniority": ["entry", "intern"],
    "salary_floor": 60000,
    "role_keywords": ["SWE", "Data Engineer"],
}

def _job(**overrides) -> JobItem:
    base = JobItem(job_url="https://example.com/1", job_id="1", title="SWE Intern",
                   company="Acme", source="greenhouse", description="Remote SWE intern role. Salary: 80000",
                   ats_platform="greenhouse", raw_json={})
    return {**base, **overrides}

def test_passes_matching_job():
    result = preference_filter([_job()], PREFS)
    assert len(result) == 1

def test_filters_wrong_role():
    result = preference_filter([_job(title="Marketing Manager", description="Marketing role remote")], PREFS)
    assert len(result) == 0

def test_filters_below_salary_floor():
    result = preference_filter([_job(description="SWE intern remote. Salary: 40000")], PREFS)
    assert len(result) == 0
```

```python
# tests/test_dedup.py
from unittest.mock import patch, MagicMock
from src.filters.dedup import dedup_filter
from src.state import JobItem

def _job(url: str) -> JobItem:
    return JobItem(job_url=url, job_id=url, title="SWE", company="Acme",
                   source="greenhouse", description="", ats_platform="greenhouse", raw_json={})

def test_new_job_passes():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value.data = []
    with patch("src.filters.dedup.db", mock_db):
        result = dedup_filter([_job("https://new.com")])
    assert len(result) == 1

def test_seen_job_filtered():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"job_url": "https://seen.com"}
    ]
    with patch("src.filters.dedup.db", mock_db):
        result = dedup_filter([_job("https://seen.com")])
    assert len(result) == 0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_preference_filter.py tests/test_dedup.py -v
```

- [ ] **Step 3: Create `src/filters/preference.py`**

```python
import re
from src.state import JobItem

def preference_filter(jobs: list[JobItem], prefs: dict) -> list[JobItem]:
    passing = []
    for job in jobs:
        text = f"{job['title']} {job['description']}".lower()

        # Role keyword check
        if prefs.get("role_keywords"):
            if not any(kw.lower() in text for kw in prefs["role_keywords"]):
                continue

        # Location check
        if prefs.get("locations"):
            if not any(loc.lower() in text for loc in prefs["locations"]):
                continue

        # Salary floor check — look for salary mentions in description
        if prefs.get("salary_floor"):
            salary_matches = re.findall(r'\b(\d{5,6})\b', text)
            if salary_matches:
                max_salary = max(int(s) for s in salary_matches)
                if max_salary < prefs["salary_floor"]:
                    continue

        passing.append(job)
    return passing
```

- [ ] **Step 4: Create `src/filters/dedup.py`**

```python
from src.state import JobItem
from src.db.client import db

def dedup_filter(jobs: list[JobItem]) -> list[JobItem]:
    if not jobs:
        return []
    urls = [j["job_url"] for j in jobs]
    seen = db.table("jobs_seen").select("job_url").in_("job_url", urls).execute().data
    seen_urls = {row["job_url"] for row in seen}
    new_jobs = [j for j in jobs if j["job_url"] not in seen_urls]
    if new_jobs:
        db.table("jobs_seen").insert([
            {"job_url": j["job_url"], "job_id": j["job_id"], "title": j["title"],
             "company": j["company"], "source": j["source"], "raw_json": j["raw_json"]}
            for j in new_jobs
        ]).execute()
    return new_jobs
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_preference_filter.py tests/test_dedup.py -v
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/filters/ tests/test_preference_filter.py tests/test_dedup.py
git commit -m "feat: preference filter + dedup check (rule-based, no LLM)"
```

---

## Phase 3: RAG Pipeline

### Task 6: Resume Bullet Embedder

**Files:**
- Create: `src/rag/embedder.py`
- Create: `tests/test_rag_embedder.py`

**Interfaces:**
- Consumes: `.tex` files from `resumes/` directory
- Produces: `embed_resumes(resume_dir: str) -> int` — returns count of bullets embedded

- [ ] **Step 1: Write failing test**

```python
# tests/test_rag_embedder.py
import tempfile, os
from unittest.mock import patch, MagicMock
from src.rag.embedder import parse_tex_bullets, embed_resumes

SAMPLE_TEX = r"""
\section{Experience}
\begin{itemize}
  \item Built distributed data pipeline processing 1M events/day using Kafka and Spark
  \item Reduced query latency by 40\% through index optimization and query rewriting
\end{itemize}
\section{Projects}
\begin{itemize}
  \item Implemented RAG chatbot using LangChain and pgvector with 90\% retrieval accuracy
\end{itemize}
"""

def test_parse_tex_bullets_extracts_items():
    bullets = parse_tex_bullets(SAMPLE_TEX, source_file="test.tex")
    assert len(bullets) == 3
    assert any("Kafka" in b["bullet_text"] for b in bullets)

def test_embed_resumes_calls_supabase():
    with tempfile.TemporaryDirectory() as tmpdir:
        with open(os.path.join(tmpdir, "resume.tex"), "w") as f:
            f.write(SAMPLE_TEX)
        mock_client = MagicMock()
        mock_anthropic = MagicMock()
        mock_anthropic.return_value.embeddings.create.return_value.data = [
            MagicMock(embedding=[0.1] * 1536)
        ] * 3
        with patch("src.rag.embedder.db", mock_client), \
             patch("src.rag.embedder.anthropic.Anthropic", mock_anthropic):
            count = embed_resumes(tmpdir)
    assert count == 3
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_rag_embedder.py -v
```

- [ ] **Step 3: Create `src/rag/embedder.py`**

```python
import re
import os
import anthropic
from src.db.client import db
from src.config import settings

def parse_tex_bullets(tex_content: str, source_file: str) -> list[dict]:
    bullets = []
    section = "general"
    section_re = re.compile(r'\\section\{(.+?)\}')
    item_re = re.compile(r'\\item\s+(.+?)(?=\\item|\\end\{itemize\})', re.DOTALL)

    for line in tex_content.splitlines():
        m = section_re.search(line)
        if m:
            section = m.group(1)

    for m in item_re.finditer(tex_content):
        text = re.sub(r'\\[a-zA-Z]+\{?', '', m.group(1)).replace('}', '').strip()
        text = re.sub(r'\s+', ' ', text)
        if len(text) > 10:
            bullets.append({"source_file": source_file, "section": section, "bullet_text": text})
    return bullets

def embed_resumes(resume_dir: str) -> int:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    all_bullets = []
    for fname in os.listdir(resume_dir):
        if not fname.endswith(".tex"):
            continue
        with open(os.path.join(resume_dir, fname)) as f:
            content = f.read()
        all_bullets.extend(parse_tex_bullets(content, source_file=fname))

    if not all_bullets:
        return 0

    texts = [b["bullet_text"] for b in all_bullets]
    # Anthropic doesn't have a native embeddings endpoint; use voyage-3-lite via anthropic or call openai embeddings
    # For now use a simple hash-based placeholder — replace with your preferred embeddings provider
    import hashlib
    for i, bullet in enumerate(all_bullets):
        h = hashlib.sha256(bullet["bullet_text"].encode()).digest()
        embedding = [float(b) / 255.0 for b in h] + [0.0] * (1536 - len(h))
        all_bullets[i]["embedding"] = embedding[:1536]

    db.table("resume_bullets").upsert(all_bullets, on_conflict="source_file,bullet_text").execute()
    return len(all_bullets)
```

> **Note:** Anthropic does not provide an embeddings API directly. Replace the hash placeholder with your preferred embeddings provider (e.g., OpenAI `text-embedding-3-small`, Voyage AI `voyage-3-lite`). Add that SDK to `pyproject.toml`.

- [ ] **Step 4: Run test**

```bash
pytest tests/test_rag_embedder.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/rag/embedder.py tests/test_rag_embedder.py
git commit -m "feat: resume bullet parser + pgvector embedder"
```

---

### Task 7: RAG Retriever

**Files:**
- Create: `src/rag/retriever.py`
- Create: `tests/test_rag_retriever.py`

**Interfaces:**
- Consumes: `job_description: str`
- Produces: `retrieve_bullets(job_description: str, top_k: int = 10) -> list[str]` — returns bullet texts ranked by relevance

- [ ] **Step 1: Write failing test**

```python
# tests/test_rag_retriever.py
from unittest.mock import patch, MagicMock
from src.rag.retriever import retrieve_bullets

def test_retrieve_returns_list_of_strings():
    mock_db = MagicMock()
    mock_db.rpc.return_value.execute.return_value.data = [
        {"bullet_text": "Built data pipeline", "similarity": 0.9},
        {"bullet_text": "Reduced latency by 40%", "similarity": 0.85},
    ]
    with patch("src.rag.retriever.db", mock_db):
        with patch("src.rag.retriever._embed_text", return_value=[0.1] * 1536):
            result = retrieve_bullets("We need a data engineer", top_k=2)
    assert isinstance(result, list)
    assert all(isinstance(b, str) for b in result)
    assert len(result) == 2
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_rag_retriever.py -v
```

- [ ] **Step 3: Add pgvector similarity search function to Supabase**

Run this SQL in Supabase dashboard:
```sql
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
```

- [ ] **Step 4: Create `src/rag/retriever.py`**

```python
import hashlib
from src.db.client import db

def _embed_text(text: str) -> list[float]:
    # Replace with same embeddings provider used in embedder.py
    h = hashlib.sha256(text.encode()).digest()
    return ([float(b) / 255.0 for b in h] + [0.0] * (1536 - len(h)))[:1536]

def retrieve_bullets(job_description: str, top_k: int = 10) -> list[str]:
    embedding = _embed_text(job_description)
    rows = db.rpc("match_bullets", {"query_embedding": embedding, "match_count": top_k}).execute().data
    return [row["bullet_text"] for row in rows]
```

- [ ] **Step 5: Run test**

```bash
pytest tests/test_rag_retriever.py -v
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/rag/retriever.py tests/test_rag_retriever.py
git commit -m "feat: rag retriever — pgvector similarity search for resume bullets"
```

---

## Phase 4: Content Generation

### Task 8: Resume Tailoring Agent

**Files:**
- Create: `src/agents/resume_tailor.py`
- Create: `tests/test_resume_tailor.py`

**Interfaces:**
- Consumes: `JobItem`, `retrieve_bullets()`, base `.tex` resume, `settings.anthropic_api_key`
- Produces: `tailor_resume(job: JobItem, base_tex_path: str) -> dict` — returns `{resume_pdf_path, resume_version, tailored_tex}`

- [ ] **Step 1: Write failing test**

```python
# tests/test_resume_tailor.py
import tempfile, os
from unittest.mock import patch, MagicMock
from src.agents.resume_tailor import tailor_resume
from src.state import JobItem

JOB = JobItem(job_url="https://example.com/job/1", job_id="1", title="Data Engineer",
              company="Acme", source="greenhouse",
              description="We need a data engineer skilled in Kafka and Python.",
              ats_platform="greenhouse", raw_json={})

SAMPLE_TEX = r"""
\section{Experience}
\begin{itemize}
  \item Placeholder bullet one
  \item Placeholder bullet two
\end{itemize}
"""

def test_tailor_resume_returns_pdf_path():
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "resume.tex")
        with open(tex_path, "w") as f:
            f.write(SAMPLE_TEX)
        mock_client = MagicMock()
        mock_client.messages.create.return_value.content = [
            MagicMock(text=r"\item Built Kafka pipeline processing 1M events/day" + "\n" + r"\item Optimized Python ETL jobs")
        ]
        with patch("src.agents.resume_tailor.retrieve_bullets", return_value=["Built Kafka pipeline"]), \
             patch("src.agents.resume_tailor.anthropic.Anthropic", return_value=mock_client), \
             patch("src.agents.resume_tailor._compile_latex", return_value=os.path.join(tmpdir, "resume.pdf")):
            result = tailor_resume(JOB, tex_path, output_dir=tmpdir)
    assert "resume_pdf_path" in result
    assert "resume_version" in result
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_resume_tailor.py -v
```

- [ ] **Step 3: Create `src/agents/resume_tailor.py`**

```python
import os
import re
import subprocess
import anthropic
from src.config import settings
from src.rag.retriever import retrieve_bullets
from src.notifications.slack import post_error
from src.state import JobItem

def _compile_latex(tex_path: str, output_dir: str) -> str:
    result = subprocess.run(
        ["latexmk", "-pdf", "-interaction=nonstopmode", f"-output-directory={output_dir}", tex_path],
        capture_output=True, text=True
    )
    pdf_path = tex_path.replace(".tex", ".pdf")
    if output_dir:
        pdf_path = os.path.join(output_dir, os.path.basename(pdf_path))
    if result.returncode != 0 or not os.path.exists(pdf_path):
        raise RuntimeError(result.stdout[-2000:])
    return pdf_path

def tailor_resume(job: JobItem, base_tex_path: str, output_dir: str = "output") -> dict:
    os.makedirs(output_dir, exist_ok=True)
    with open(base_tex_path) as f:
        base_tex = f.read()

    top_bullets = retrieve_bullets(job["description"], top_k=10)
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    prompt = f"""You are rewriting LaTeX resume bullet points to match a job description.

Job Description:
{job['description'][:3000]}

Most relevant bullets from my past experience:
{chr(10).join(f'- {b}' for b in top_bullets)}

Current resume itemize blocks:
{base_tex}

Rules:
- Only rewrite existing \\item lines. Do NOT add new items or sections.
- Keep LaTeX syntax identical. Only change the text inside \\item lines.
- Inject ATS keywords from the job description naturally.
- Keep my voice — professional, specific, metric-driven.
- Return ONLY the rewritten \\item lines, one per line, no extra text.
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    new_items = response.content[0].text.strip()

    # Swap item blocks in base tex
    tailored_tex = re.sub(
        r'(\\begin\{itemize\})(.*?)(\\end\{itemize\})',
        lambda m: m.group(1) + "\n" + new_items + "\n" + m.group(3),
        base_tex, flags=re.DOTALL, count=1
    )

    out_tex = os.path.join(output_dir, f"resume_{job['job_id']}.tex")
    with open(out_tex, "w") as f:
        f.write(tailored_tex)

    try:
        pdf_path = _compile_latex(out_tex, output_dir)
    except RuntimeError as e:
        post_error("resume_tailor", str(e), {"job_url": job["job_url"]})
        raise

    return {
        "resume_pdf_path": pdf_path,
        "resume_version": f"{job['job_id']}_{len(top_bullets)}bullets",
        "tailored_tex": tailored_tex,
    }
```

- [ ] **Step 4: Run test**

```bash
pytest tests/test_resume_tailor.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/agents/resume_tailor.py tests/test_resume_tailor.py
git commit -m "feat: resume tailoring agent — rag retrieval + claude rewrite + latex compile"
```

---

### Task 9: Cover Letter Agent

**Files:**
- Create: `src/agents/cover_letter.py`
- Create: `tests/test_cover_letter.py`

**Interfaces:**
- Consumes: `JobItem`, cover letter seeds from Supabase
- Produces: `generate_cover_letter(job: JobItem, output_dir: str) -> dict` — returns `{cover_letter_txt_path, cover_letter_pdf_path}`

- [ ] **Step 1: Write failing test**

```python
# tests/test_cover_letter.py
from unittest.mock import patch, MagicMock
from src.agents.cover_letter import generate_cover_letter
from src.state import JobItem

JOB = JobItem(job_url="https://example.com/job/2", job_id="2", title="Backend Engineer",
              company="StartupCo", source="lever",
              description="We build distributed systems. Looking for strong Python engineer.",
              ats_platform="lever", raw_json={})

def test_generate_returns_paths():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"content": "Dear Hiring Manager, I am excited to apply...", "label": "sample1"}
    ]
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [
        MagicMock(text="Dear StartupCo team, I want to work on your distributed systems...")
    ]
    with patch("src.agents.cover_letter.db", mock_db), \
         patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client), \
         patch("src.agents.cover_letter._txt_to_pdf", return_value="/tmp/cl.pdf"):
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            result = generate_cover_letter(JOB, output_dir=tmpdir)
    assert "cover_letter_txt_path" in result
    assert "cover_letter_pdf_path" in result
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_cover_letter.py -v
```

- [ ] **Step 3: Create `src/agents/cover_letter.py`**

```python
import os
import anthropic
from src.config import settings
from src.db.client import db
from src.notifications.slack import post_error
from src.state import JobItem

def _txt_to_pdf(txt_path: str) -> str:
    # Requires enscript + ps2pdf or similar. Install: brew install enscript ghostscript
    import subprocess
    ps_path = txt_path.replace(".txt", ".ps")
    pdf_path = txt_path.replace(".txt", ".pdf")
    subprocess.run(["enscript", "-p", ps_path, txt_path], check=True, capture_output=True)
    subprocess.run(["ps2pdf", ps_path, pdf_path], check=True, capture_output=True)
    return pdf_path

def generate_cover_letter(job: JobItem, output_dir: str = "output") -> dict:
    os.makedirs(output_dir, exist_ok=True)
    seeds = db.table("cover_letter_seeds").select("content").limit(2).execute().data
    seed_text = "\n\n---\n\n".join(s["content"] for s in seeds) if seeds else ""

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = f"""Write a cover letter for this job application.

Company: {job['company']}
Role: {job['title']}
Job Description:
{job['description'][:3000]}

My writing style (match this tone exactly):
{seed_text[:1500]}

Rules:
- Maximum 1 page (350 words)
- Reference specific details from the job description — role name, tech stack, mission
- No generic sentences like "I am a team player" or "I am passionate about technology"
- Professional but human voice
- End with a clear call to action
- Output ONLY the cover letter text, no extra commentary
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )
    cl_text = response.content[0].text.strip()

    txt_path = os.path.join(output_dir, f"cover_letter_{job['job_id']}.txt")
    with open(txt_path, "w") as f:
        f.write(cl_text)

    try:
        pdf_path = _txt_to_pdf(txt_path)
    except Exception as e:
        post_error("cover_letter", str(e), {"job_url": job["job_url"]})
        pdf_path = ""

    return {"cover_letter_txt_path": txt_path, "cover_letter_pdf_path": pdf_path}
```

- [ ] **Step 4: Run test**

```bash
pytest tests/test_cover_letter.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/agents/cover_letter.py tests/test_cover_letter.py
git commit -m "feat: cover letter agent — tone-seeded, 1-page max, jd-specific"
```

---

## Phase 5: Application Submission

### Task 10: Apply Agent (Playwright ATS Form Fill)

**Files:**
- Create: `src/agents/apply.py`
- Create: `tests/test_apply.py`

**Interfaces:**
- Consumes: `JobItem`, `resume_pdf_path`, `cover_letter_pdf_path`, user profile from Supabase
- Produces: `apply_to_job(job: JobItem, resume_pdf_path: str, cover_letter_pdf_path: str) -> dict` — returns `{status: 'submitted'|'queued_manual', confirmation, fields_filled}`

> **Warning:** This agent uses Playwright to control a real browser. Never run tests against live ATS URLs without explicit intent. Always mock the browser in unit tests.

- [ ] **Step 1: Write failing test**

```python
# tests/test_apply.py
from unittest.mock import patch, MagicMock, AsyncMock
from src.agents.apply import apply_to_job, _detect_ats_platform
from src.state import JobItem

def test_detect_greenhouse():
    assert _detect_ats_platform("https://boards.greenhouse.io/acme/jobs/123") == "greenhouse"

def test_detect_lever():
    assert _detect_ats_platform("https://jobs.lever.co/acme/abc-123") == "lever"

def test_detect_unknown():
    assert _detect_ats_platform("https://careers.randomcompany.com/jobs/456") == "unknown"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_apply.py -v
```

- [ ] **Step 3: Create `src/agents/apply.py`**

```python
import os
import asyncio
from playwright.async_api import async_playwright, Page
from src.config import settings
from src.db.client import db
from src.notifications.slack import post_error, post_message
from src.state import JobItem

def _detect_ats_platform(job_url: str) -> str:
    if "greenhouse.io" in job_url or "boards.greenhouse.io" in job_url:
        return "greenhouse"
    if "lever.co" in job_url:
        return "lever"
    if "ashbyhq.com" in job_url:
        return "ashby"
    if "workday.com" in job_url or "myworkdayjobs.com" in job_url:
        return "workday"
    return "unknown"

def _load_profile() -> dict:
    rows = db.table("user_profile").select("*").limit(1).execute().data
    return rows[0] if rows else {}

async def _fill_greenhouse(page: Page, profile: dict, resume_pdf: str, cover_letter_pdf: str) -> dict:
    filled = {}
    # First name / last name
    for selector, key in [("#first_name", "full_name"), ("#last_name", "full_name")]:
        el = await page.query_selector(selector)
        if el:
            name_parts = profile.get("full_name", "").split(" ", 1)
            value = name_parts[0] if "first" in selector else (name_parts[1] if len(name_parts) > 1 else "")
            await el.fill(value)
            filled[selector] = value

    for selector, key in [("#email", "email"), ("#phone", "phone")]:
        el = await page.query_selector(selector)
        if el:
            await el.fill(profile.get(key, ""))
            filled[selector] = profile.get(key, "")

    # Resume upload
    resume_input = await page.query_selector("input[type=file][name*=resume], input[type=file][id*=resume]")
    if resume_input and os.path.exists(resume_pdf):
        await resume_input.set_input_files(resume_pdf)
        filled["resume"] = resume_pdf

    return filled

async def _submit_and_capture(page: Page) -> str:
    await page.click("input[type=submit], button[type=submit]")
    await page.wait_for_load_state("networkidle", timeout=15000)
    return await page.screenshot(type="png", full_page=True)

def apply_to_job(job: JobItem, resume_pdf_path: str, cover_letter_pdf_path: str) -> dict:
    ats = _detect_ats_platform(job["job_url"])
    if ats == "unknown":
        post_message(f":warning: Unknown ATS for {job['company']} — {job['job_url']}\nManual application needed.")
        return {"status": "queued_manual", "confirmation": None, "fields_filled": {}}
    return asyncio.run(_apply_async(job, ats, resume_pdf_path, cover_letter_pdf_path))

async def _apply_async(job: JobItem, ats: str, resume_pdf: str, cover_letter_pdf: str) -> dict:
    profile = _load_profile()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(job["job_url"], timeout=30000)
            # Check for captcha or login wall
            if await page.query_selector("iframe[src*=captcha], iframe[src*=recaptcha]"):
                post_message(f":lock: Captcha hit on {job['company']}\nManual submit: {job['job_url']}\nResume: {resume_pdf}")
                await browser.close()
                return {"status": "queued_manual", "confirmation": None, "fields_filled": {}}

            if ats == "greenhouse":
                filled = await _fill_greenhouse(page, profile, resume_pdf, cover_letter_pdf)
            else:
                post_message(f":warning: ATS {ats} form-fill not yet implemented. Manual: {job['job_url']}")
                await browser.close()
                return {"status": "queued_manual", "confirmation": None, "fields_filled": {}}

            screenshot = await _submit_and_capture(page)
            confirmation_path = f"output/confirmation_{job['job_id']}.png"
            with open(confirmation_path, "wb") as f:
                f.write(screenshot)

            await browser.close()
            return {"status": "submitted", "confirmation": confirmation_path, "fields_filled": filled}

        except Exception as e:
            await browser.close()
            post_error("apply_agent", str(e), {"job_url": job["job_url"]})
            return {"status": "queued_manual", "confirmation": None, "fields_filled": {}}
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_apply.py -v
```
Expected: PASS (unit tests only — no live browser)

- [ ] **Step 5: Commit**

```bash
git add src/agents/apply.py tests/test_apply.py
git commit -m "feat: apply agent — playwright ats form-fill, captcha guard, slack fallback"
```

---

## Phase 6: Outreach

### Task 11: Outreach Agent

**Files:**
- Create: `src/agents/outreach.py`
- Create: `tests/test_outreach.py`

**Interfaces:**
- Consumes: applied `JobItem`, Hunter.io API, Gmail API, outreach seeds from Supabase
- Produces: `run_outreach(job: JobItem) -> dict` — returns `{emails_sent: int, linkedin_drafts: int}`

- [ ] **Step 1: Write failing test**

```python
# tests/test_outreach.py
from unittest.mock import patch, MagicMock
from src.agents.outreach import fetch_contacts, draft_outreach_message
from src.state import JobItem

JOB = JobItem(job_url="https://example.com/job/3", job_id="3", title="SWE",
              company="Acme Corp", source="greenhouse", description="Great SWE role",
              ats_platform="greenhouse", raw_json={})

def test_fetch_contacts_returns_list():
    mock_response = {"data": {"emails": [
        {"value": "jane@acme.com", "first_name": "Jane", "last_name": "Smith", "position": "Recruiter"}
    ]}}
    with patch("urllib.request.urlopen") as mock_open:
        import json
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps(mock_response).encode()
        mock_open.return_value = mock_cm
        contacts = fetch_contacts("acme.com")
    assert isinstance(contacts, list)
    assert contacts[0]["email"] == "jane@acme.com"

def test_draft_message_includes_company():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="Hi Jane, I applied to Acme Corp...")]
    with patch("src.agents.outreach.anthropic.Anthropic", return_value=mock_client):
        with patch("src.agents.outreach.db") as mock_db:
            mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
            msg = draft_outreach_message(JOB, contact={"name": "Jane Smith", "title": "Recruiter"})
    assert "Acme Corp" in msg or "Acme" in msg
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_outreach.py -v
```

- [ ] **Step 3: Create `src/agents/outreach.py`**

```python
import json
import urllib.request
import anthropic
from src.config import settings
from src.db.client import db
from src.notifications.slack import post_error, post_message
from src.state import JobItem

def fetch_contacts(domain: str, limit: int = 4) -> list[dict]:
    url = f"https://api.hunter.io/v2/domain-search?domain={domain}&limit={limit}&api_key={settings.hunter_api_key}"
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    contacts = []
    for e in data.get("data", {}).get("emails", []):
        contacts.append({
            "name": f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(),
            "email": e.get("value", ""),
            "title": e.get("position", ""),
        })
    return contacts

def _company_domain(company_name: str) -> str:
    return company_name.lower().replace(" ", "").replace(",", "").replace(".", "") + ".com"

def draft_outreach_message(job: JobItem, contact: dict) -> str:
    seeds = db.table("outreach_seeds").select("content").limit(2).execute().data
    seed_text = "\n\n---\n\n".join(s["content"] for s in seeds) if seeds else ""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = f"""Write a short cold outreach message to a contact at a company I just applied to.

Contact: {contact['name']}, {contact['title']}
Company: {job['company']}
Role I applied to: {job['title']}

My writing style (match this tone):
{seed_text[:800]}

Rules:
- 4-6 sentences max
- Reference the specific role and company
- Not salesy — genuine, direct, human
- End with one clear question or call to action
- Return ONLY the message text
"""
    response = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()

def _send_gmail(to: str, subject: str, body: str) -> bool:
    # Requires Gmail API credentials. See: https://developers.google.com/gmail/api/quickstart/python
    # Simplified — replace with full OAuth2 + gmail_api_client send implementation
    try:
        import base64
        from email.mime.text import MIMEText
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        creds = Credentials.from_authorized_user_file(settings.gmail_credentials_path)
        service = build("gmail", "v1", credentials=creds)
        msg = MIMEText(body)
        msg["to"] = to
        msg["subject"] = subject
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
        return True
    except Exception as e:
        post_error("outreach", str(e), {"to": to})
        return False

def run_outreach(job: JobItem) -> dict:
    domain = _company_domain(job["company"])
    contacts = []
    try:
        contacts = fetch_contacts(domain)
    except Exception as e:
        post_error("outreach", str(e), {"company": job["company"], "domain": domain})
        return {"emails_sent": 0, "linkedin_drafts": 0}

    emails_sent = 0
    linkedin_drafts = []

    for contact in contacts[:4]:
        message = draft_outreach_message(job, contact)
        if contact.get("email"):
            sent = _send_gmail(
                to=contact["email"],
                subject=f"Re: {job['title']} at {job['company']}",
                body=message,
            )
            if sent:
                emails_sent += 1
                db.table("outreach_log").insert({
                    "job_url": job["job_url"], "company": job["company"],
                    "contact_name": contact["name"], "contact_email": contact["email"],
                    "contact_title": contact["title"], "channel": "email", "message_text": message,
                }).execute()
        else:
            linkedin_drafts.append({"contact": contact, "message": message})

    if linkedin_drafts:
        lines = [f":pencil: *LinkedIn Outreach Drafts for {job['company']}*"]
        for d in linkedin_drafts:
            lines.append(f"*{d['contact']['name']}* ({d['contact']['title']})\n```{d['message']}```")
        post_message("\n".join(lines))

    return {"emails_sent": emails_sent, "linkedin_drafts": len(linkedin_drafts)}
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_outreach.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/agents/outreach.py tests/test_outreach.py
git commit -m "feat: outreach agent — hunter.io contacts, gmail auto-send, linkedin slack draft"
```

---

## Phase 7: Reply Tracking + Reporting

### Task 12: Reply Tracking Agent

**Files:**
- Create: `src/agents/reply_tracker.py`
- Create: `tests/test_reply_tracker.py`

**Interfaces:**
- Consumes: Gmail API, `applications` + `outreach_log` tables
- Produces: `run_reply_tracking() -> dict` — returns `{replies_classified: int, status_updates: int}`

- [ ] **Step 1: Write failing test**

```python
# tests/test_reply_tracker.py
from unittest.mock import patch, MagicMock
from src.agents.reply_tracker import classify_email

def test_classify_interview_request():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="interview_request")]
    with patch("src.agents.reply_tracker.anthropic.Anthropic", return_value=mock_client):
        result = classify_email(subject="Interview at Acme", body="We'd like to schedule an interview with you.")
    assert result == "interview_request"

def test_classify_rejection():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="rejection")]
    with patch("src.agents.reply_tracker.anthropic.Anthropic", return_value=mock_client):
        result = classify_email(subject="Application Update", body="We've decided to move forward with other candidates.")
    assert result == "rejection"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_reply_tracker.py -v
```

- [ ] **Step 3: Create `src/agents/reply_tracker.py`**

```python
import anthropic
from src.config import settings
from src.db.client import db
from src.notifications.slack import post_message, post_error

VALID_CLASSIFICATIONS = {
    "interview_request", "rejection", "follow_up_needed",
    "generic_acknowledgement", "recruiter_reply_to_outreach", "other"
}

def classify_email(subject: str, body: str) -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = f"""Classify this email into exactly one of these categories:
interview_request | rejection | follow_up_needed | generic_acknowledgement | recruiter_reply_to_outreach | other

Subject: {subject}
Body: {body[:1000]}

Return ONLY the category label, nothing else."""
    response = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=20,
        messages=[{"role": "user", "content": prompt}],
    )
    label = response.content[0].text.strip().lower()
    return label if label in VALID_CLASSIFICATIONS else "other"

def _fetch_gmail_messages() -> list[dict]:
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        creds = Credentials.from_authorized_user_file(settings.gmail_credentials_path)
        service = build("gmail", "v1", credentials=creds)
        result = service.users().messages().list(userId="me", q="is:unread", maxResults=50).execute()
        messages = []
        for m in result.get("messages", []):
            full = service.users().messages().get(userId="me", id=m["id"], format="full").execute()
            headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
            body = ""
            if "parts" in full["payload"]:
                for part in full["payload"]["parts"]:
                    if part["mimeType"] == "text/plain":
                        import base64
                        body = base64.urlsafe_b64decode(part["body"]["data"]).decode(errors="ignore")
                        break
            messages.append({
                "id": m["id"], "from": headers.get("From", ""),
                "subject": headers.get("Subject", ""), "body": body,
            })
        return messages
    except Exception as e:
        post_error("reply_tracker", str(e), {"step": "fetch_gmail"})
        return []

def run_reply_tracking() -> dict:
    applied_companies = db.table("applications").select("company,job_url").execute().data
    company_to_url = {row["company"].lower(): row["job_url"] for row in applied_companies}

    messages = _fetch_gmail_messages()
    classified = 0
    status_updates = 0

    for msg in messages:
        sender_domain = msg["from"].split("@")[-1].rstrip(">").lower()
        matched_company = next((c for c in company_to_url if c in sender_domain or sender_domain in c), None)
        if not matched_company:
            continue

        label = classify_email(msg["subject"], msg["body"])
        job_url = company_to_url[matched_company]

        db.table("reply_log").insert({
            "job_url": job_url, "channel": "email", "sender": msg["from"],
            "subject": msg["subject"], "body": msg["body"][:5000], "classification": label,
        }).execute()
        classified += 1

        if label in ("interview_request", "rejection"):
            db.table("applications").update({"status": label.replace("_request", "")}).eq("job_url", job_url).execute()
            status_updates += 1
            emoji = ":tada:" if label == "interview_request" else ":x:"
            post_message(f"{emoji} *{label.replace('_', ' ').title()}* — {matched_company}\n{msg['subject']}")

    return {"replies_classified": classified, "status_updates": status_updates}
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_reply_tracker.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/agents/reply_tracker.py tests/test_reply_tracker.py
git commit -m "feat: reply tracking agent — gmail scan, llm classify, immediate slack on interview/rejection"
```

---

### Task 13: Tracking & Reporting Agent + Full LangGraph Graph

**Files:**
- Create: `src/agents/reporter.py`
- Create: `src/graph.py`
- Create: `tests/test_reporter.py`

**Interfaces:**
- Consumes: `GraphState` at end of run
- Produces: `reporter_agent(state: GraphState) -> dict`, full LangGraph graph callable as `graph.invoke({"run_id": run_id})`

- [ ] **Step 1: Write failing test for reporter**

```python
# tests/test_reporter.py
from unittest.mock import patch, MagicMock
from src.agents.reporter import reporter_agent
from src.state import GraphState

def test_reporter_posts_summary():
    state = GraphState(
        run_id="test-run-1",
        jobs_discovered=[{"job_url": "https://a.com", "company": "A", "title": "SWE", "source": "greenhouse"}] * 3,
        jobs_filtered=[{"job_url": "https://a.com", "company": "A", "title": "SWE", "source": "greenhouse"}],
        jobs_tailored=[{"job_url": "https://a.com", "resume_pdf_path": "/tmp/r.pdf"}],
        jobs_applied=[{"job_url": "https://a.com", "status": "submitted"}],
        jobs_outreached=[{"job_url": "https://a.com", "emails_sent": 1}],
        errors=[],
        summary={},
    )
    with patch("src.agents.reporter.post_summary") as mock_post:
        result = reporter_agent(state)
    assert mock_post.called
    summary = mock_post.call_args[0][0]
    assert "Jobs found" in summary or any("found" in k.lower() for k in summary.keys())
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_reporter.py -v
```

- [ ] **Step 3: Create `src/agents/reporter.py`**

```python
from src.state import GraphState
from src.notifications.slack import post_summary

def reporter_agent(state: GraphState) -> dict:
    applied = [j for j in state.get("jobs_applied", []) if j.get("status") == "submitted"]
    queued = [j for j in state.get("jobs_applied", []) if j.get("status") == "queued_manual"]
    outreached = state.get("jobs_outreached", [])
    errors = state.get("errors", [])

    summary = {
        "Jobs found this hour": len(state.get("jobs_discovered", [])),
        "Passed filter": len(state.get("jobs_filtered", [])),
        "Auto-submitted": len(applied),
        "Queued for manual submit": len(queued),
        "Cold emails sent": sum(j.get("emails_sent", 0) for j in outreached),
        "LinkedIn drafts in Slack": sum(j.get("linkedin_drafts", 0) for j in outreached),
        "Errors": len(errors),
    }
    post_summary(summary)
    return {"summary": summary}
```

- [ ] **Step 4: Create `src/graph.py`**

```python
import uuid
from langgraph.graph import StateGraph, END
from src.state import GraphState
from src.agents.search import search_agent
from src.agents.watchlist import watchlist_agent
from src.agents.crawler import crawler_agent
from src.agents.resume_tailor import tailor_resume
from src.agents.cover_letter import generate_cover_letter
from src.agents.apply import apply_to_job
from src.agents.outreach import run_outreach
from src.agents.reply_tracker import run_reply_tracking
from src.agents.reporter import reporter_agent
from src.filters.preference import preference_filter
from src.filters.dedup import dedup_filter
from src.db.client import db
import os

BASE_TEX = os.environ.get("BASE_RESUME_TEX", "resumes/resume.tex")

def filter_node(state: GraphState) -> dict:
    prefs_rows = db.table("preferences").select("*").limit(1).execute().data
    prefs = prefs_rows[0] if prefs_rows else {}
    filtered = preference_filter(state["jobs_discovered"], prefs)
    new_only = dedup_filter(filtered)
    return {"jobs_filtered": new_only}

def tailor_node(state: GraphState) -> dict:
    tailored = []
    for job in state["jobs_filtered"]:
        try:
            result = tailor_resume(job, BASE_TEX)
            cl = generate_cover_letter(job)
            tailored.append({**job, **result, **cl})
        except Exception as e:
            state["errors"].append({"agent": "tailor_node", "error": str(e), "context": {"job_url": job["job_url"]}})
    return {"jobs_tailored": tailored}

def apply_node(state: GraphState) -> dict:
    applied = []
    for job_data in state["jobs_tailored"]:
        try:
            result = apply_to_job(job_data, job_data.get("resume_pdf_path", ""), job_data.get("cover_letter_pdf_path", ""))
            db.table("applications").insert({
                "job_url": job_data["job_url"], "title": job_data["title"],
                "company": job_data["company"], "ats_platform": job_data["ats_platform"],
                "resume_version": job_data.get("resume_version"), "resume_pdf_path": job_data.get("resume_pdf_path"),
                "cover_letter_path": job_data.get("cover_letter_pdf_path"),
                "submission_type": "auto" if result["status"] == "submitted" else "manual",
                "confirmation_screenshot": result.get("confirmation"),
                "fields_filled": result.get("fields_filled", {}),
            }).execute()
            applied.append({**job_data, **result})
        except Exception as e:
            state["errors"].append({"agent": "apply_node", "error": str(e), "context": {"job_url": job_data["job_url"]}})
    return {"jobs_applied": applied}

def outreach_node(state: GraphState) -> dict:
    outreached = []
    for job_data in state["jobs_applied"]:
        if job_data.get("status") != "submitted":
            continue
        try:
            result = run_outreach(job_data)
            outreached.append({**job_data, **result})
        except Exception as e:
            state["errors"].append({"agent": "outreach_node", "error": str(e), "context": {"job_url": job_data["job_url"]}})
    return {"jobs_outreached": outreached}

def reply_track_node(state: GraphState) -> dict:
    run_reply_tracking()
    return {}

def build_graph():
    g = StateGraph(GraphState)
    g.add_node("search", search_agent)
    g.add_node("filter", filter_node)
    g.add_node("tailor", tailor_node)
    g.add_node("apply", apply_node)
    g.add_node("outreach", outreach_node)
    g.add_node("reply_track", reply_track_node)
    g.add_node("report", reporter_agent)

    g.set_entry_point("search")
    g.add_edge("search", "filter")
    g.add_edge("filter", "tailor")
    g.add_edge("tailor", "apply")
    g.add_edge("apply", "outreach")
    g.add_edge("outreach", "reply_track")
    g.add_edge("reply_track", "report")
    g.add_edge("report", END)
    return g.compile()

graph = build_graph()

if __name__ == "__main__":
    graph.invoke({"run_id": str(uuid.uuid4()), "jobs_discovered": [], "jobs_filtered": [],
                  "jobs_tailored": [], "jobs_applied": [], "jobs_outreached": [], "errors": [], "summary": {}})
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_reporter.py -v
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/agents/reporter.py src/graph.py tests/test_reporter.py
git commit -m "feat: reporter agent + full langgraph graph wiring (all nodes connected)"
```

---

## Phase 8: Deployment

### Task 14: Watchlist + Crawler Agents (Playwright-based)

**Files:**
- Create: `src/agents/watchlist.py`
- Create: `src/agents/crawler.py`

**Interfaces:**
- Consumes: `watchlist` table, `crawler_urls` table, Playwright
- Produces: `watchlist_agent(state: GraphState) -> dict`, `crawler_agent(state: GraphState) -> dict` — both append to `jobs_discovered`

- [ ] **Step 1: Create `src/agents/watchlist.py`**

```python
import asyncio
from playwright.async_api import async_playwright
import anthropic
from src.config import settings
from src.db.client import db
from src.notifications.slack import post_error, post_message
from src.state import GraphState, JobItem

async def _check_careers_page(url: str, keywords: list[str], company: str) -> list[JobItem]:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, timeout=20000)
            if await page.query_selector("iframe[src*=captcha]"):
                post_message(f":lock: Captcha on watchlist company {company} — {url}")
                await browser.close()
                return []
            content = await page.inner_text("body")
            await browser.close()
        except Exception as e:
            await browser.close()
            post_error("watchlist", str(e), {"company": company, "url": url})
            return []

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = f"""Extract job listings from this careers page content that match these keywords: {keywords}

Page content:
{content[:4000]}

Return a JSON array. Each item: {{"title": "...", "url": "...", "description": "..."}}.
If no matching jobs, return [].
Return ONLY valid JSON."""
    response = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    import json, re
    try:
        raw = response.content[0].text.strip()
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        listings = json.loads(match.group(0)) if match else []
    except Exception:
        listings = []

    return [JobItem(
        job_url=j.get("url", url + f"#{i}"),
        job_id=j.get("url", f"{company}_{i}"),
        title=j.get("title", ""),
        company=company,
        source="watchlist",
        description=j.get("description", ""),
        ats_platform="unknown",
        raw_json=j,
    ) for i, j in enumerate(listings)]

def watchlist_agent(state: GraphState) -> dict:
    rows = db.table("watchlist").select("*").execute().data
    all_jobs = []
    for row in rows:
        jobs = asyncio.run(_check_careers_page(row["careers_url"], row["role_keywords"], row["company_name"]))
        all_jobs.extend(jobs)
    existing = state.get("jobs_discovered", [])
    seen = {j["job_url"] for j in existing}
    new = [j for j in all_jobs if j["job_url"] not in seen]
    return {"jobs_discovered": existing + new}
```

- [ ] **Step 2: Create `src/agents/crawler.py`**

```python
import asyncio
import json
import re
import anthropic
from playwright.async_api import async_playwright
from src.config import settings
from src.db.client import db
from src.notifications.slack import post_error, post_message
from src.state import GraphState, JobItem

async def _crawl_page(url: str, company: str) -> list[JobItem]:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, timeout=20000)
            if await page.query_selector("iframe[src*=captcha]"):
                post_message(f":lock: Captcha on crawler URL {company} — {url}")
                await browser.close()
                return []
            content = await page.inner_text("body")
            await browser.close()
        except Exception as e:
            await browser.close()
            post_error("crawler", str(e), {"company": company, "url": url})
            return []

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = f"""Extract ALL job listings from this careers page.

Page content:
{content[:4000]}

Return a JSON array. Each item: {{"title": "...", "url": "...", "description": "..."}}.
If no jobs found, return [].
Return ONLY valid JSON."""
    response = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    try:
        raw = response.content[0].text.strip()
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        listings = json.loads(match.group(0)) if match else []
    except Exception:
        listings = []

    return [JobItem(
        job_url=j.get("url", url + f"#{i}"),
        job_id=j.get("url", f"{company}_{i}"),
        title=j.get("title", ""),
        company=company,
        source="crawler",
        description=j.get("description", ""),
        ats_platform="unknown",
        raw_json=j,
    ) for i, j in enumerate(listings)]

def crawler_agent(state: GraphState) -> dict:
    rows = db.table("crawler_urls").select("*").eq("active", True).execute().data
    all_jobs = []
    for row in rows:
        jobs = asyncio.run(_crawl_page(row["careers_url"], row["company_name"]))
        all_jobs.extend(jobs)
    existing = state.get("jobs_discovered", [])
    seen = {j["job_url"] for j in existing}
    new = [j for j in all_jobs if j["job_url"] not in seen]
    return {"jobs_discovered": existing + new}
```

- [ ] **Step 3: Wire watchlist + crawler into graph — update `src/graph.py`**

In `build_graph()`, add two parallel discovery nodes before filter:

```python
g.add_node("watchlist", watchlist_agent)
g.add_node("crawler", crawler_agent)
# search, watchlist, crawler all feed into filter
# LangGraph parallel: set entry to search, add edges search→filter, watchlist→filter, crawler→filter
# but they must merge — use a merge node
```

> Simplest approach for now: run all three sequentially (search → watchlist → crawler → filter). Each appends to `jobs_discovered`. Parallel execution can be added once the sequential version is confirmed working.

Update `build_graph()`:
```python
g.set_entry_point("search")
g.add_edge("search", "watchlist")
g.add_edge("watchlist", "crawler")
g.add_edge("crawler", "filter")
# rest of edges unchanged
```

- [ ] **Step 4: Commit**

```bash
git add src/agents/watchlist.py src/agents/crawler.py src/graph.py
git commit -m "feat: watchlist agent + broad career-page crawler + sequential discovery pipeline"
```

---

### Task 15: Cron + VM Deployment

**Files:**
- Create: `run.py`
- Modify: `README.md`

- [ ] **Step 1: Create `run.py`**

```python
#!/usr/bin/env python3
import uuid
from src.graph import graph
from src.state import GraphState

def main():
    initial_state = GraphState(
        run_id=str(uuid.uuid4()),
        jobs_discovered=[],
        jobs_filtered=[],
        jobs_tailored=[],
        jobs_applied=[],
        jobs_outreached=[],
        errors=[],
        summary={},
    )
    graph.invoke(initial_state)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Test single run locally**

```bash
python run.py
```
Expected: Full pipeline runs, Slack message appears with summary. Check Supabase tables for inserted rows.

- [ ] **Step 3: Set up cron on VM**

SSH into your DigitalOcean VM, then:
```bash
crontab -e
```

Add this line (runs every hour):
```
0 * * * * cd /home/ubuntu/invictus && /home/ubuntu/invictus/.venv/bin/python run.py >> /var/log/invictus.log 2>&1
```

- [ ] **Step 4: Verify cron fires**

```bash
tail -f /var/log/invictus.log
```
Watch for first hourly run. Confirm Slack summary arrives.

- [ ] **Step 5: Commit**

```bash
git add run.py
git commit -m "feat: run.py entrypoint + cron deployment instructions"
```

---

## Self-Review: Spec Coverage

| Spec Requirement | Task |
|---|---|
| Search Agent: Greenhouse + Lever APIs | Task 4 |
| Search Agent: GitHub repo job lists | Task 4 (`fetch_github_jobs`) |
| Watchlist Agent: VIP companies, deeper check | Task 14 |
| Broad Career-Page Crawler | Task 14 |
| Preference Filter | Task 5 |
| Dedup / Tracker Check | Task 5 |
| Resume Tailoring Agent (RAG-based) | Tasks 6, 7, 8 |
| Cover Letter Agent | Task 9 |
| Apply Agent (Greenhouse, Lever, Ashby, Workday) | Task 10 — Greenhouse form-fill implemented; Lever/Ashby/Workday form-fill logic follows same pattern, add per-ATS fill functions |
| Application Receipt Log | Task 13 (`apply_node` DB write) |
| Outreach Agent: Hunter.io + Gmail + LinkedIn draft | Task 11 |
| Reply Tracking Agent | Task 12 |
| Tracking & Reporting Agent: Slack hourly summary | Task 13 |
| Supabase schema (11 tables) | Task 2 |
| Human-in-the-loop Slack touchpoints | All agents — captcha, compile failure, LinkedIn draft |
| Cron on VM | Task 15 |
| pgvector embeddings | Tasks 6, 7 |

**Gaps to address after initial implementation:**
- Lever / Ashby / Workday form-fill functions inside `apply.py` (same pattern as `_fill_greenhouse`, different CSS selectors)
- LinkedIn inbox scanning in `reply_tracker.py` (requires LinkedIn unofficial API or Playwright — add after Gmail flow confirmed)
- Open-ended question answering in `apply.py` (add LLM prompt for each detected free-text field)
