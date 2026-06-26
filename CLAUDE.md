# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Plan for Building

Follow this exactly, every phase, every time — no exceptions.

### 1. Phase Start
- Create a branch: `git checkout -b phase-N-<short-name>`
- Stop. Write a concise aim of the phase in caveman style — what it builds, why it matters, nothing else
- Wait for explicit user approval before writing any code

### 2. During the Phase
- Work task by task following the implementation plan
- At the end of each task: stage relevant files, commit with a clear message
- Never batch multiple tasks into one commit

### 3. Phase End
- Push branch to remote: `git push -u origin phase-N-<short-name>`
- Open a PR against `main`
- Run `/code-review` on the PR — address all findings before merging
- Set up and run CI/CD checks (lint, tests must be green)
- Only merge once PR review is clear and CI/CD passes

### 4. Post-Merge
- Stop. Write a bulleted summary using caveman skill:
  - What was built
  - What features are now live
  - Architecture and system design decisions made, and why
  - Plain language — no technical jargon, concise, no fluff

---

## What This Is

Invictus is a fully autonomous multi-agent AI job application system. It runs hourly via cron on a cloud VM. One LangGraph state graph drives everything: agents discover jobs, tailor resumes with RAG, submit applications via Playwright, send cold outreach, track replies, and post a Slack summary. Supabase is the only persistent store — no local state survives between runs.

## Commands

```bash
# Setup
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
playwright install chromium

# Run full pipeline (one hourly cycle)
python run.py

# Run tests
pytest
pytest tests/test_preference_filter.py          # single file
pytest tests/test_apply.py::test_detect_greenhouse  # single test

# Embed resumes into pgvector (run once, re-run when resumes change)
python -c "from src.rag.embedder import embed_resumes; embed_resumes('resumes/')"

# Apply Supabase schema (run once against your project)
# Paste contents of src/db/schema.sql into Supabase dashboard SQL editor
```

## Architecture

### Data Flow (per hourly run)

```
search_agent ─┐
watchlist_agent ─┤─→ filter_node → tailor_node → apply_node → outreach_node → reply_track_node → reporter_agent
crawler_agent ─┘
```

Each node mutates `GraphState` (defined in `src/state.py`). All agents read from and write to Supabase — nothing is held in memory across runs.

### Key Design Decisions

**LangGraph graph** (`src/graph.py`) — single compiled graph, all agents as nodes. Discovery runs sequentially (search → watchlist → crawler), each appending to `state.jobs_discovered`. Filter and tailor nodes process the merged list.

**RAG pipeline** (`src/rag/`) — `.tex` resumes are pre-chunked into individual bullets and stored as pgvector embeddings in `resume_bullets` table. For each JD, the retriever embeds the JD and pulls the top-k most relevant bullets. The tailoring agent rewrites only those bullets in the original `.tex` structure, then compiles to PDF via `latexmk`.

**Apply agent** (`src/agents/apply.py`) — uses Playwright to fill ATS forms. Detects platform by URL pattern (`_detect_ats_platform`). On captcha, login wall, or any unknown field: immediately halts and posts Slack alert with a manual link — never guesses or skips required fields.

**Outreach agent** (`src/agents/outreach.py`) — email via Gmail API (auto-sent), LinkedIn via Slack draft only (never automated — LinkedIn ToS). Skips companies messaged within 30 days (checked in `dedup_filter` via `outreach_log` table).

**Slack** (`src/notifications/slack.py`) — only notification surface. `post_error()` called by every agent on failure before raising. `post_summary()` called by `reporter_agent` at end of each run.

### Supabase Tables

| Table | Role |
|---|---|
| `jobs_seen` | Dedup source of truth — all discovered jobs by URL |
| `applications` | Full receipt per submission (fields, answers, PDF paths, confirmation) |
| `outreach_log` | Contacts messaged per job, used for 30-day cooldown check |
| `reply_log` | Classified email/LinkedIn replies |
| `resume_bullets` | pgvector embeddings of individual resume bullets |
| `user_profile` | Name, email, education, work history for ATS form-fill |
| `preferences` | Locations, seniority, salary floor, role keywords (preference filter) |
| `watchlist` | VIP companies for deeper checking |
| `crawler_urls` | Career page URLs for broad crawler |
| `cover_letter_seeds` | Sample cover letters for tone matching |
| `outreach_seeds` | Sample cold messages for tone matching |

### Embeddings

Anthropic has no native embeddings API. `src/rag/embedder.py` and `src/rag/retriever.py` use a placeholder hash-based embedding. **Replace with a real provider** (e.g. OpenAI `text-embedding-3-small`, Voyage AI `voyage-3-lite`) before running the RAG pipeline for real. The pgvector `match_bullets` SQL function must be created in Supabase — see Task 7 in the implementation plan.

## Data Stored (Future Frontend Ready)

All job search activity is persisted in Supabase as it happens. No schema changes needed to build a dashboard on top.

| What | Table | Key Fields |
|---|---|---|
| Every job applied to | `applications` | title, company, ATS platform, all fields filled, open-ended answers, resume PDF path, cover letter path, confirmation screenshot, submission type (auto/manual), status |
| Application status | `applications.status` | `applied` → `interview` → `rejection` → `ghosted` — updated in real time by reply tracker |
| Every contact messaged | `outreach_log` | contact name, email, LinkedIn URL, job linked, message text sent, channel (email/LinkedIn), timestamp, reply received flag |
| Replies from contacts | `reply_log` | sender, subject, full body, classification (`interview_request` / `rejection` / `follow_up_needed` / `recruiter_reply_to_outreach` / `other`), linked to job |
| Replies from job applications | `reply_log` | same table — classified by LLM, linked back to `applications` via `job_url` |
| All jobs ever discovered | `jobs_seen` | URL, title, company, source, timestamp — full discovery history |

## Implementation Plan

Full step-by-step plan with TDD tasks: `docs/superpowers/plans/2026-06-26-invictus-implementation.md`

Original product spec: `docs/superpowers/specs/2026-06-26-invictus-design.md`

## Required Environment Variables

See `.env.example`. All must be set before `run.py` will start. `SUPABASE_SERVICE_ROLE_KEY` (not anon key) is required — agents write to all tables.

## Resume Tailoring Constraints

Hard rules enforced by `resume_tailor.py` — never relax these:
- No formatting or layout changes to `.tex` files
- No new sections added
- Hard 2-page cap — compile failure or page overflow triggers Slack alert, job held
- Cover letters: 1-page max (350 words)

## LinkedIn Outreach

Never automate LinkedIn message sends. `outreach_agent` drafts messages and posts them to Slack for manual sending. This is intentional — LinkedIn actively bans automation.
