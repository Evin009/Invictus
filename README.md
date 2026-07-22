# Invictus

Autonomous multi-agent AI job application system. Runs hourly via cron. One [LangGraph](https://github.com/langchain-ai/langgraph) pipeline: finds jobs, tailors resumes with RAG, applies, sends outreach, tracks replies, and posts a Slack summary. [Supabase](https://supabase.com) holds all state — nothing lives in memory between runs.

A dashboard (`ui/`) lets you monitor and configure everything without touching the database.

## The agents

```
search_agent ─┐
watchlist_agent ─┴─→ filter_node → tailor_node → apply_node → outreach_node → reply_track_node → reporter_agent
```

| Agent | File | Purpose |
|---|---|---|
| **Search Agent** | `src/agents/search.py` | Pulls new postings from Greenhouse/Lever (auto-detected per watchlist company) and your monitored GitHub job-list repos, gated to ~every 2h |
| **Watchlist Agent** | `src/agents/watchlist.py` | Deep-checks every watchlist company's career page every hour — batched 50/hour + rotating every 5h once the list grows past 50 |
| **Filter** | `src/filters/` | Drops jobs that don't match your preferences or were already seen |
| **Resume Tailoring Agent** | `src/agents/resume_tailor.py` | Retrieves relevant resume bullets (RAG), rewrites them for the JD, recompiles a 2-page PDF |
| **Cover Letter Agent** | `src/agents/cover_letter.py` | Writes a matching 350-word cover letter in your tone |
| **Apply Agent** | `src/agents/apply.py` | Fills the ATS form with Playwright (Greenhouse/Lever/Ashby/Workday); halts + alerts Slack on captcha, login wall, or unknown field — never guesses |
| **Outreach Agent** | `src/agents/outreach.py` | Finds contacts, auto-sends a cold email via Gmail, drafts LinkedIn messages to Slack for manual send |
| **Reply Tracker** | `src/agents/reply_tracker.py` | Scans your inbox, classifies replies with AI, updates application status, pings Slack on interviews/rejections |
| **Reporter Agent** | `src/agents/reporter.py` | Posts the hourly Slack summary of everything above |

A crash mid-cycle never loses progress — every agent writes straight to Supabase.

## Setup

### Backend

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
playwright install chromium
```

1. Copy `.env.example` to `.env`, fill in every variable. `run.py` won't start otherwise. Use `SUPABASE_SERVICE_ROLE_KEY`, not the anon key.
2. Paste `src/db/schema.sql` into the Supabase SQL editor.
3. Authorize Gmail (for reply tracking): download the OAuth client-secret JSON from Google Cloud Console as `credentials.json`, then run:
   ```bash
   python setup/gmail_auth.py
   ```
   Opens a browser consent flow, writes the token to `gmail_token.json`. While the Google Cloud OAuth screen is in "Testing" status, refresh tokens expire after 7 days — rerun weekly until verified for production.
4. Embed your resumes (re-run whenever resumes change):
   ```bash
   python -c "from src.rag.embedder import embed_resumes; embed_resumes('resumes/')"
   ```

### Dashboard

```bash
cd ui
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Runs at `http://localhost:3000`. Sign up on first launch — sets up your Supabase auth user and walks you through onboarding.

## Running

```bash
python run.py                                        # one full hourly cycle
pytest                                                # full test suite
pytest tests/test_apply.py::test_detect_greenhouse    # single test
cd ui && npm run typecheck && npm run lint            # UI checks
```

`setup/` also has a provisioning script for a fresh cloud VM — installs deps, creates a non-root user, registers the hourly cron job, sets up log rotation.

## Data stored

Everything below is written to Supabase as it happens.

| Table | Role |
|---|---|
| `jobs_seen` | Every discovered job by URL — dedup source of truth |
| `applications` | Full receipt per submission: fields, answers, resume/cover letter paths, confirmation, status |
| `outreach_log` | Contacts messaged per job — 30-day cooldown check |
| `reply_log` | Classified email/LinkedIn replies |
| `resume_bullets` | pgvector embeddings of resume bullets |
| `user_profile` | Name, email, education, work history for ATS form-fill |
| `preferences` | Locations, seniority, salary floor, role keywords |
| `watchlist` | VIP companies for deeper checking (career page + auto-detected ATS platform/token) |
| `github_repos` | Curated GitHub job-list repos monitored by the search agent, user-managed from Profile |
| `cover_letter_seeds` | Sample cover letters for tone matching |
| `outreach_seeds` | Sample cold messages for tone matching |

`applications.status`: `applied` → `interview` → `rejection` → `ghosted`, updated live by the reply tracker.

## Hard constraints

Never relaxed:

- Resume `.tex`: no layout changes, no new sections, 2-page cap
- Cover letters: 1 page, 350 words max
- LinkedIn: drafted to Slack only, never auto-sent
- Apply agent: captcha / login wall / unknown field → halt + alert, never guess or skip

## Project structure

```
src/
  agents/          # search, watchlist, tailor, apply, outreach, reply_tracker, reporter
  rag/             # resume chunking, embedding (OpenAI text-embedding-3-small), retrieval
  db/              # Supabase schema + client
  filters/         # preference filter, dedup check
  notifications/   # Slack alerts (only notification surface)
  graph.py         # LangGraph wiring — the full pipeline
  state.py         # shared GraphState passed between every node
  config.py        # env var loading
ui/
  src/app/         # Next.js App Router pages (dashboard, applications, settings, profile, auth)
  src/components/  # sidebar, stat cards, tables, onboarding wizard, forms
  src/lib/         # Supabase clients, shared TypeScript types
docs/
  build-log.md                       # plain-language record of every shipped phase
  superpowers/plans/                 # implementation plans
  superpowers/specs/                 # original product spec
setup/             # cloud VM provisioning script + seed script
supabase/          # local Supabase config + migrations
tests/             # pytest suite, one file per agent/module
```

See [`docs/build-log.md`](docs/build-log.md) for the plain-language history of what got built and why.
