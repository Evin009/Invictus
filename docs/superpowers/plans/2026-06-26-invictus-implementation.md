# Invictus Implementation Plan

**Goal:** Build a fully autonomous multi-agent AI job application system that discovers, tailors, submits, and tracks job applications 24/7 with hourly Slack reporting.

**Full spec:** `docs/superpowers/specs/2026-06-26-invictus-design.md`

---

## Phase 1: Foundation ✅

- [x] Task 1: Project setup + dependencies (`pyproject.toml`, `.env.example`, `src/config.py`)
- [x] Task 2: Supabase schema — 11 tables + pgvector + `match_bullets` function (`src/db/schema.sql`, `src/db/client.py`)
- [x] Task 3: Slack notifier + LangGraph state (`src/notifications/slack.py`, `src/state.py`, `tests/test_slack.py`)

---

## Phase 2: Job Discovery

- [x] Task 4: Search Agent — Greenhouse + Lever APIs + GitHub repo watcher (`src/agents/search.py`, `tests/test_search_agent.py`)
- [x] Task 5: Preference Filter + Dedup Check — rule-based, no LLM (`src/filters/preference.py`, `src/filters/dedup.py`, tests)

---

## Phase 3: RAG Pipeline

- [x] Task 6: Resume Bullet Embedder — parse `.tex` → chunk bullets → embed → pgvector upsert (`src/rag/embedder.py`, `tests/test_rag_embedder.py`)
- [x] Task 7: RAG Retriever — embed JD → pgvector similarity search → return top-k bullets (`src/rag/retriever.py`, `tests/test_rag_retriever.py`)

---

## Phase 4: Content Generation

- [x] Task 8: Resume Tailoring Agent — RAG retrieval + Claude rewrite + LaTeX compile (`src/agents/resume_tailor.py`, `tests/test_resume_tailor.py`)
- [x] Task 9: Cover Letter Agent — tone-seeded, 1-page max, JD-specific (`src/agents/cover_letter.py`, `tests/test_cover_letter.py`)

---

## Phase 5: Application Submission

- [x] Task 10: Apply Agent — Playwright ATS form-fill + captcha guard + Slack fallback (`src/agents/apply.py`, `tests/test_apply.py`)

---

## Phase 6: Outreach

- [x] Task 11: Outreach Agent — Hunter.io contacts + Gmail auto-send + LinkedIn Slack draft (`src/agents/outreach.py`, `tests/test_outreach.py`)

---

## Phase 7: Reply Tracking + Reporting

- [ ] Task 12: Reply Tracking Agent — Gmail scan + LLM classify + immediate Slack on interview/rejection (`src/agents/reply_tracker.py`, `tests/test_reply_tracker.py`)
- [ ] Task 13: Tracking & Reporting Agent + full LangGraph graph wired (`src/agents/reporter.py`, `src/graph.py`, `tests/test_reporter.py`)

---

## Phase 8: Deployment

- [ ] Task 14: Watchlist Agent + Broad Career-Page Crawler — Playwright + LLM parser (`src/agents/watchlist.py`, `src/agents/crawler.py`)
- [ ] Task 15: Cron + VM deployment — `run.py` entrypoint + cron setup on DigitalOcean VM
