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

<!-- New phases appended below as they merge -->
