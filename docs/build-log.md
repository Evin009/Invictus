# Invictus Build Log

Record of every phase merged to main — aim, what got built, decisions made.

---

## Phase 1: Foundation
**Branch:** `phase-1-foundation` | **PR:** #1 | **Merged:** 2026-06-26

**Aim:** Build the skeleton everything runs on — project installs, all 11 database tables exist, Slack can send messages, and every agent shares the same data contract.

**What got built:**
- Project can be installed and runs with a single command (`pip install -e ".[dev]"`)
- All 11 database tables defined and ready — every job, application, contact, reply, and resume bullet has a home from day one
- Slack notifier live — three functions (`post_message`, `post_error`, `post_summary`) are the only way the system ever talks to you
- Shared data shapes (`GraphState`, `JobItem`) defined — every future agent reads and writes the same structure, nothing gets lost between steps
- CI runs automatically on every push and pull request via GitHub Actions

**Bugs caught in review (fixed before merge):**
- Slack would crash with a confusing error if `SLACK_WEBHOOK_URL` was missing — guarded with early return
- Database client would crash at import time before env vars were loaded — removed eager module-level initialization
- Agent errors could be silently replaced by a Slack network failure — wrapped `post_message` in `post_error` with try/except so original error always surfaces

**Architecture decisions:**
- All env vars default to `""` so tests can import any module without crashing — real validation happens at runtime when values are actually used
- `get_client()` is the DB accessor function — never called at module level, always inside agent functions after env is loaded
- `GraphState` is a TypedDict (not a class) — keeps state as a plain dict, which LangGraph requires

---

---

## Phase 2: Job Discovery
**Branch:** `phase-2-job-discovery` | **PR:** #2 | **Merged:** 2026-06-26

**Aim:** Build job finding — polls Greenhouse, Lever, and GitHub repo lists, filters by preferences, deduplicates against history, and hands off a clean list of new jobs.

**What got built:**
- Search Agent pulls jobs from Greenhouse board APIs, Lever posting APIs, and GitHub curated README lists — keyword-filtered per your role preferences
- Preference Filter gates every job on role keywords, location, and salary floor — rule-based, no LLM, runs fast and cheap before any expensive steps
- Dedup Filter checks every job URL against the `jobs_seen` table — inserts new ones, drops already-seen ones so nothing gets applied to twice

**Bugs caught in review (fixed before merge):**
- Lever API returns a dict on error — iterating it over string keys caused `AttributeError` — guarded with `isinstance(data, list)`
- `prefs_rows[0]["role_keywords"]` raised `KeyError` when column was NULL — switched to safe `.get()` with fallback
- URL stripping in GitHub parser used `rstrip` (strips char set, not suffix) — replaced with targeted regex to avoid truncating legitimate query strings
- `dedup_filter` had no error handling — Supabase failure crashed the whole pipeline silently — wrapped both DB calls with `try/except` + `post_error`
- Salary regex matched bare 5-6 digit numbers (zip codes, job IDs) — now requires `$` prefix, `k` suffix, or salary keyword context

**Architecture decisions:**
- `search_agent` does lightweight in-memory dedup against accumulated state; `dedup_filter` does the authoritative DB dedup — two layers by design, different purposes
- Salary filter only applies when salary is detectable in the description — jobs with no salary info pass through (intentional: most postings omit salary)
- GitHub jobs get `company=""` since company name isn't in the repo list format — outreach agent must handle this gracefully in Phase 6

<!-- New phases appended below as they merge -->
