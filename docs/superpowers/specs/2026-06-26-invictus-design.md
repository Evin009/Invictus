# Invictus — Product Design Specification

**Date:** 2026-06-26
**Author:** Evin Bento
**Status:** Design Approved

---

## Overview

Invictus is a fully autonomous, multi-agent AI job application system that runs 24/7 on a cloud VM. It discovers jobs across every major source, tailors your resume and cover letter to each job description using RAG-based retrieval from your own LaTeX resumes, submits applications directly on supported ATS platforms, reaches out to hiring managers, tracks every reply, and reports everything to you hourly via Slack.

Built as a personal learning project to deeply understand AI agents, LangGraph, LangChain, RAG, and Supabase — while also being a fully functional, production-quality automation that actually runs your job search.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Orchestration | LangGraph (single state graph, all agents as nodes) |
| LLM | Claude claude-sonnet-4-6 (via Anthropic API) |
| Vector Store | Supabase pgvector |
| Database | Supabase (Postgres) |
| Browser Automation | Playwright (via MCP) |
| Email | Gmail API (existing MCP connected) |
| Contact Finding | Hunter.io or Apollo.io API |
| Notifications | Slack (incoming webhook, notification-only) |
| Scheduling | cron on DigitalOcean / small cloud VM |
| Resume Compilation | latexmk / pdflatex |
| Language | Python |

---

## Architecture

One LangGraph state graph triggered hourly by cron. Each agent is a node. State flows through the graph per job item. Supabase is the shared persistent store — all agents read from and write to it. Slack is the single surface for notifications and human-in-the-loop approvals.

```
[Search Agent]
[Watchlist Agent]       ──→  [Preference Filter]  ──→  [Dedup Check]
[Career-Page Crawler]
                                                              │
                                                              ▼
                                                  [Resume Tailoring Agent]
                                                              │
                                                              ▼
                                                   [Cover Letter Agent]
                                                              │
                                                              ▼
                                                      [Apply Agent]
                                                     /             \
                                              auto-submit        Slack alert
                                             (Greenhouse,      (captcha/login
                                           Lever, Ashby..)        wall hit)
                                                     \             /
                                                      [Receipt Log]
                                                              │
                                                              ▼
                                                   [Outreach Agent]
                                                  /                \
                                           Gmail auto-send     LinkedIn draft
                                                                → Slack approval
                                                              │
                                                              ▼
                                               [Reply Tracking Agent]
                                                              │
                                                              ▼
                                            [Tracking & Reporting Agent]
                                                              │
                                                              ▼
                                                    Hourly Slack Summary
```

---

## Features / Agents

### 1. Search Agent
**Type:** Automated script agent (minimal LLM involvement)

**What it does:**
- Polls Greenhouse and Lever public job-board APIs every hour using your search terms
- Watches a configurable list of GitHub repos (e.g. community-curated internship/job lists) for new rows added to their tables or README job lists
- Passes every new, unseen posting forward into the pipeline

**Specifications:**
- Sources: Greenhouse API, Lever API, user-configured GitHub repo URLs
- Search terms, role types, and keywords configurable per run
- No scraping — all public, ToS-friendly API calls
- Runs as first node in the LangGraph graph each hour

---

### 2. Watchlist Agent
**Type:** Automated script agent + light browser automation

**What it does:**
- Tracks a user-curated list of specific companies + roles you care about most (dream companies, target employers)
- Checks those companies more aggressively — via Greenhouse/Lever APIs AND their direct LinkedIn/Workday postings AND their own career pages
- "VIP mode" — deeper, broader check than the general Search Agent

**Specifications:**
- User manages watchlist in a Supabase table (company name, careers URL, role keywords)
- Checks every source for each watchlisted company, not just one
- Uses scraping MCP (Playwright) for LinkedIn/Workday postings
- On captcha or login wall: stops, logs, pings Slack with company + job link for manual action
- Runs in parallel with Search Agent at graph start

---

### 3. Broad Career-Page Crawler
**Type:** Agent with LLM (needed to parse varied page layouts)

**What it does:**
- Scrapes a large, configurable list of company career pages directly (not via Greenhouse/Lever APIs)
- Covers companies that host jobs on their own site (common for startups, boutique firms, agencies)
- Adds coverage for the blind spot the Search Agent misses entirely

**Specifications:**
- User maintains a list of career page URLs in Supabase (can be 10 or 500+)
- Visits each URL every hour via Playwright, parses job listings from varied page structures using LLM
- Detects new postings by comparing against previously seen listings stored in Supabase
- On captcha or block: stops for that URL, logs error, pings Slack
- User can add/remove URLs from the crawl list at any time via Supabase table edit

---

### 4. Preference Filter
**Type:** Not an agent — rule-based logic

**What it does:**
- Gates every incoming job against your saved preferences before any expensive tailoring or applying happens
- Ensures no compute or time is wasted on jobs you'd never want

**Specifications:**
- Preferences stored in Supabase: location (city list or "Remote"), seniority (entry/mid/senior/intern), salary floor, role-type keywords (e.g. SWE, Data Engineer, ML)
- Checks each job against all preferences — must pass all to proceed
- Jobs that fail are logged to Supabase with reason (e.g. "filtered: location") and dropped
- No LLM — pure rule-based check, fast and cheap

---

### 5. Dedup / Tracker Check
**Type:** Not an agent — Supabase database lookup

**What it does:**
- Ensures the system never processes the same job twice across hourly runs
- Prevents duplicate applications and duplicate outreach to the same company

**Specifications:**
- Every job that passes the preference filter is checked against a Supabase `jobs_seen` table by job URL/ID
- If already seen: dropped, nothing further happens
- If new: inserted into `jobs_seen` with timestamp and source, then passed forward
- Also checks `outreach_log` table — if contacts at this company were messaged within the last 30 days, outreach step is skipped for that company

---

### 6. Resume Tailoring Agent (RAG-based)
**Type:** Full LLM agent — most AI-intensive step in the pipeline

**What it does:**
- Takes the job description and produces a tailored, ATS-optimized version of your resume compiled to PDF
- Uses RAG (Retrieval-Augmented Generation) to pull the most relevant bullets and experience from across all your base resumes before rewriting

**Specifications:**
- All base `.tex` resumes are chunked into individual bullets, projects, and skills and stored as embeddings in Supabase pgvector
- For each JD: JD is embedded, vector search retrieves the highest-relevance bullets from across all resumes
- LLM rewrites only the retrieved bullets — injecting ATS keywords from the JD, preserving your voice
- Hard constraints enforced:
  - No formatting or layout changes
  - No new sections added
  - Hard 2-page cap — if rewrite exceeds 2 pages, agent retries with smaller edits
  - Original `.tex` structure preserved exactly
- Output compiled to PDF via `latexmk` / `pdflatex`
- On compile failure: Slack alert with error + diff, job held and not submitted until resolved
- Resume version (which bullets were swapped, which JD it was tailored for) logged to Supabase

---

### 7. Cover Letter Agent
**Type:** Full LLM agent

**What it does:**
- Generates a tailored, specific cover letter for each job — written in your voice, referencing the exact role and company

**Specifications:**
- You provide 1-2 sample cover letters you've written — stored in Supabase as tone/style seeds
- For each job: LLM reads JD + company name + your sample letters, generates a fresh cover letter
- References specific details from the JD (role, team, tech stack, company mission)
- Hard length constraint: 1 page max, no filler, no generic lines
- Output saved as `.txt` and `.pdf` per job, path stored in Supabase under that job record

---

### 8. Apply Agent
**Type:** Full LLM agent + Playwright browser automation — most technically complex piece

**What it does:**
- Actually submits your application on the job's ATS platform — fills every field, answers open-ended questions in your voice, attaches resume and cover letter, and hits submit

**Specifications:**
- Supported ATS platforms: Greenhouse, Lever, Ashby, Workday (each requires its own form-filling logic — different field layouts per platform)
- For each field: standard fields (name, email, education, work history) pulled from your profile in Supabase; open-ended questions ("Why do you want to work here?", "Tell us about yourself") answered by LLM using JD context + your profile
- Attaches tailored PDF resume + cover letter to upload fields
- On successful submit: captures confirmation (screenshot or ATS response text)
- On captcha, login wall, or unexpected page state: stops immediately, logs job as "queued — manual action needed," pings Slack with job link + everything pre-filled so you only need to click submit
- Never guesses or skips required fields — if a field can't be confidently answered, halts and pings Slack

---

### 9. Application Receipt Log
**Type:** Not an agent — database write

**What it does:**
- Creates a permanent, detailed record of exactly what went out under your name for every application submitted

**Specifications:**
- Written to Supabase `applications` table immediately after every submission (auto or manual)
- Stores:
  - Job title, company, source URL, ATS platform
  - Exact fields filled and answers given to open-ended questions
  - Resume version used (which bullets were tailored, compiled PDF path)
  - Cover letter version used (file path)
  - Submission timestamp
  - ATS confirmation screenshot or response text
  - Submission type: `auto` or `manual` (you clicked submit)
- Viewable in Supabase dashboard; referenced in hourly Slack summary

---

### 10. Outreach Agent
**Type:** Full LLM agent

**What it does:**
- Finds real humans at the company you just applied to and sends them a short, personal intro message the same day you apply — directly increasing the chance a human sees your resume

**Specifications:**
- Takes company name from the just-applied job
- Calls Hunter.io or Apollo.io API to find 3-4 relevant contacts: recruiter, hiring manager, team lead, or relevant department head
- LLM drafts a short (4-6 sentence) intro message in your voice — seeded by example messages you provide, referencing the specific role and company
- **Email channel:** sent automatically via Gmail API, no manual action needed
- **LinkedIn channel:** message drafted and contact list compiled, then posted to Slack for you to send manually — protects your LinkedIn account from automation ban risk
- All contacts, message text, send timestamp, and channel logged to Supabase under the job record
- Skipped entirely if contacts at this company were already messaged within the last 30 days (checked in dedup step)

---

### 11. Reply Tracking Agent
**Type:** Full LLM agent

**What it does:**
- Watches your Gmail inbox and LinkedIn message inbox for any responses related to jobs you've applied to or people you've reached out to — automatically updating application status without you having to manually track anything

**Specifications:**
- Runs every hour alongside the main pipeline as a parallel node
- **Gmail:** scans inbox for emails from domains matching companies in your `applications` table
- LLM classifies each email: `interview_request`, `rejection`, `follow_up_needed`, `generic_acknowledgement`, `recruiter_reply_to_outreach`, or `other`
- **LinkedIn:** scans LinkedIn message inbox for replies to cold outreach messages sent to contacts in the `outreach_log` table
- Updates `applications` table status in Supabase for every classified reply
- On meaningful status change (interview request or rejection): immediate Slack ping — does not wait for the hourly summary
- Keeps full email/message thread stored against the job record in Supabase

---

### 12. Tracking & Reporting Agent
**Type:** Not a full LLM agent — Supabase read + Slack formatter

**What it does:**
- Central record keeper and communicator for the entire system — the thing you actually interact with every hour

**Specifications:**
- Runs as the final node in the LangGraph graph at the end of every hourly run
- Reads all events written to Supabase during the current run
- Posts a structured hourly Slack summary containing:
  - Jobs found this hour (count + source breakdown)
  - Applications auto-submitted (count + company list)
  - Applications queued for your manual action (count + direct links)
  - Cold emails sent (count)
  - LinkedIn outreach drafts waiting for your manual send (count + links)
  - Recruiter replies received + status changes this hour
  - Errors or captchas requiring your attention (with links)
- Full job-by-job history always queryable in Supabase:
  - Status per job (found / tailored / applied / outreach sent / replied / interview / rejected / ghosted)
  - Resume + cover letter version used
  - Contacts reached for that job + their reply status

---

## Supabase Schema (tables)

| Table | Purpose |
|---|---|
| `jobs_seen` | All jobs discovered, dedup source of truth |
| `applications` | Full application receipt per job |
| `outreach_log` | All contacts messaged, per job |
| `reply_log` | Recruiter/contact replies, classified |
| `resume_bullets` | Chunked bullets from all base resumes (pgvector embeddings) |
| `user_profile` | Your info for form-filling (name, education, work history, links) |
| `preferences` | Location, seniority, salary floor, role types |
| `watchlist` | Companies + roles to track aggressively |
| `crawler_urls` | Career page URLs for the Broad Crawler |
| `cover_letter_seeds` | Your sample cover letters for tone matching |
| `outreach_seeds` | Your sample cold messages for tone matching |

---

## Human-in-the-Loop Touchpoints (all via Slack)

| Trigger | What Slack shows you |
|---|---|
| Captcha / login wall hit | Job link + "ready to submit, just needs your click" |
| LinkedIn/Workday application | Pre-filled form link + tailored resume + cover letter ready |
| LaTeX compile failure | Error message + diff of what was attempted |
| LinkedIn outreach | Drafted message + contact list, send manually |
| Interview request received | Immediate ping with company + email thread |
| Rejection received | Immediate ping with company |
| Any agent error | Error summary + what was skipped |

---

## What Invictus Does That Tsenta Does Not

- RAG-based tailoring from your own multiple LaTeX resumes (not a generic resume builder)
- GitHub repo job-list watching (community-curated sources)
- Cold outreach to hiring managers — email auto-sent + LinkedIn manual-send flow
- Slack-native reporting (no separate dashboard to log into)
- Fully open, self-hosted — you own all the data and the code

---
