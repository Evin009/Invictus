# Invictus

Fully autonomous multi-agent AI job application system. Runs hourly on a cloud VM via cron. A single [LangGraph](https://github.com/langchain-ai/langgraph) state graph drives the entire pipeline: discover jobs, tailor resumes with RAG, submit applications, send cold outreach, track replies, and post a Slack summary. [Supabase](https://supabase.com) is the only persistent store — no local state survives between runs.

## How it works

```
search_agent ─┐
watchlist_agent ─┤─→ filter_node → tailor_node → apply_node → outreach_node → reply_track_node → reporter_agent
crawler_agent ─┘
```

1. **Discover** — search agent, watchlist agent (VIP companies), and crawler agent (broad career-page list) each find new job postings and append them to shared state.
2. **Filter** — preference checker (role, location, pay) and dedup check (already-seen jobs) gate the list down to new, relevant jobs.
3. **Tailor** — resume bullets are retrieved by relevance (pgvector + OpenAI embeddings), rewritten by AI to match the job, recompiled to a PDF, and capped at 2 pages. A matching cover letter is generated, capped at 350 words.
4. **Apply** — Playwright fills out the application on Greenhouse, Lever, Ashby, or Workday. Captchas, login walls, or unknown fields halt the attempt and trigger a manual fallback + Slack alert — never guessed or skipped.
5. **Outreach** — finds contacts at the company, sends a personalized cold email automatically via Gmail, and drafts a LinkedIn message to Slack for manual sending (LinkedIn automation is never used — against their ToS).
6. **Reply tracking** — scans the inbox, classifies replies (interview / rejection / follow-up / other) with AI, updates application status, and alerts Slack on interviews and rejections.
7. **Report** — posts an hourly Slack summary: jobs discovered, applications submitted, manual pending, interviews, rejections, replies, outreach sent.

Every agent reads from and writes to Supabase — nothing is held in memory across runs, so a crash mid-cycle never loses progress.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
playwright install chromium
```

Copy `.env.example` to `.env` and fill in every variable — `run.py` will not start until all are set. `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) is required since agents write to every table.

Apply the database schema once, by pasting the contents of `src/db/schema.sql` into the Supabase SQL editor.

Embed your resumes into pgvector once (and again any time resumes change):

```bash
python -c "from src.rag.embedder import embed_resumes; embed_resumes('resumes/')"
```

## Running

```bash
python run.py          # one full hourly cycle
pytest                 # full test suite
pytest tests/test_apply.py::test_detect_greenhouse   # single test
```

In production, `setup/` contains a provisioning script that configures a fresh cloud VM end to end: installs dependencies, creates a dedicated non-root user to run the system, registers the hourly cron job, and sets up log rotation (14-day retention).

## Data stored

Everything is persisted in Supabase as it happens — a future dashboard needs no schema changes.

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

These are enforced in code and intentionally never relaxed:

- Resume `.tex` files: no formatting/layout changes, no new sections, hard 2-page cap
- Cover letters: 1-page max, 350 words
- LinkedIn messages: drafted to Slack only, never sent automatically
- Apply agent: on captcha, login wall, or unrecognized field — halt and alert, never guess or skip a required field

## Project structure

```
src/
  agents/          # search, watchlist, crawler, filter, tailor, apply, outreach, reply tracker, reporter
  rag/              # resume chunking, embedding, retrieval
  db/               # Supabase schema + client
  notifications/    # Slack alerts (only notification surface)
  graph.py          # LangGraph wiring — the full pipeline
  state.py          # shared state shape passed between every node
  config.py         # env var loading
docs/
  build-log.md                         # plain-language record of every shipped phase
  superpowers/plans/                   # implementation plan
  superpowers/specs/                   # original product spec
setup/             # cloud VM provisioning script
tests/             # pytest suite, one file per agent/module
```

See [`docs/build-log.md`](docs/build-log.md) for a plain-language history of what was built in each phase and why, and [`CLAUDE.md`](CLAUDE.md) for the development workflow this repo follows.
