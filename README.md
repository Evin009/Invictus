# Invictus

Fully autonomous multi-agent AI job application system. Runs hourly on a cloud VM via cron. A single [LangGraph](https://github.com/langchain-ai/langgraph) state graph drives the entire pipeline: discover jobs, tailor resumes with RAG, submit applications, send cold outreach, track replies, and post a Slack summary. [Supabase](https://supabase.com) is the only persistent store — no local state survives between runs.

A web dashboard (`ui/`) lets you monitor everything the system does and manage your settings without touching the database directly.

## How it works

```
search_agent ─┐
watchlist_agent ─┤─→ filter_node → tailor_node → apply_node → outreach_node → reply_track_node → reporter_agent
crawler_agent ─┘
```

1. **Discover** — search agent (Greenhouse/Lever APIs + GitHub job lists), watchlist agent (VIP companies, deeper check), and crawler agent (broad career-page list) each find new postings and append them to shared state.
2. **Filter** — preference checker (role, location, pay) and dedup check (already-seen jobs) gate the list down to new, relevant jobs only.
3. **Tailor** — resume bullets retrieved by relevance (pgvector + OpenAI embeddings), rewritten by AI to match the job description, recompiled to PDF, capped at 2 pages. Matching cover letter generated and capped at 350 words.
4. **Apply** — Playwright fills out the application on Greenhouse, Lever, Ashby, or Workday. Captchas, login walls, or unknown fields halt the attempt and trigger a manual fallback + Slack alert — never guessed or skipped.
5. **Outreach** — finds contacts at the company, sends a personalized cold email automatically via Gmail, and drafts a LinkedIn message to Slack for manual sending (LinkedIn automation is never used — against their ToS).
6. **Reply tracking** — scans the inbox, classifies replies (interview / rejection / follow-up / other) with AI, updates application status, and pings Slack immediately on interviews and rejections.
7. **Report** — posts an hourly Slack summary: jobs discovered, applications submitted, manual pending, interviews, rejections, replies, outreach sent.

Every agent reads from and writes to Supabase — nothing is held in memory across runs, so a crash mid-cycle never loses progress.

## Setup

### Backend (Python pipeline)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
playwright install chromium
```

Copy `.env.example` to `.env` and fill in every variable — `run.py` will not start until all are set. Use `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) — agents write to every table.

Apply the database schema once by pasting `src/db/schema.sql` into the Supabase SQL editor.

Embed your resumes into pgvector once (re-run whenever resumes change):

```bash
python -c "from src.rag.embedder import embed_resumes; embed_resumes('resumes/')"
```

### Dashboard (Next.js UI)

```bash
cd ui
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

The dashboard runs on `http://localhost:3000`. Sign up with your email on first launch — this creates the Supabase auth user and takes you through the onboarding wizard to configure your profile, preferences, and watchlist.

## Running

```bash
# One full hourly cycle (backend)
python run.py

# Full test suite
pytest

# Single test
pytest tests/test_apply.py::test_detect_greenhouse

# UI type check + lint
cd ui && npm run typecheck && npm run lint
```

In production, `setup/` contains a provisioning script that configures a fresh cloud VM end to end: installs dependencies, creates a dedicated non-root user, registers the hourly cron job, and configures log rotation (14-day retention).

## Data stored

Everything is persisted in Supabase as it happens.

| Table | Role |
|---|---|
| `jobs_seen` | Dedup source of truth — every discovered job by URL |
| `applications` | Full receipt per submission — fields filled, answers, resume/cover letter paths, confirmation, status |
| `outreach_log` | Contacts messaged per job, used for the 30-day cooldown check |
| `reply_log` | Classified email/LinkedIn replies |
| `resume_bullets` | pgvector embeddings of individual resume bullets |
| `user_profile` | Name, email, education, work history for ATS form-fill |
| `preferences` | Locations, seniority, salary floor, role keywords |
| `watchlist` | VIP companies for deeper, targeted checking |
| `crawler_urls` | Career page URLs for the broad crawler |
| `cover_letter_seeds` | Sample cover letters for tone matching |
| `outreach_seeds` | Sample cold messages for tone matching |

`applications.status` moves through `applied` → `interview` → `rejection` → `ghosted`, updated in real time by the reply tracker.

## Hard constraints

Enforced in code, intentionally never relaxed:

- Resume `.tex` files: no formatting/layout changes, no new sections, hard 2-page cap
- Cover letters: 1-page max, 350 words
- LinkedIn messages: drafted to Slack only, never sent automatically
- Apply agent: on captcha, login wall, or unrecognized field — halt and alert, never guess or skip a required field

## Project structure

```
src/
  agents/          # search, watchlist, crawler, tailor, apply, outreach, reply_tracker, reporter
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

See [`docs/build-log.md`](docs/build-log.md) for a plain-language history of what was built in each phase and why decisions were made.
