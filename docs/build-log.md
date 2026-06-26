# Invictus Build Log

Record of every phase merged — aim, what got built, decisions made.

---

## Phase 1: Foundation
**Branch:** `phase-1-foundation` | **PR:** #1 | **Merged:** 2026-06-26

**Aim:** Build skeleton everything runs on — project installs, all storage tables exist, alerts can send, all agents share same data shape.

**What got built:**
- Project installs and runs with one command
- All 11 storage tables created — every job, application, contact, reply, and resume piece has a home from day one
- Alert system live — three message types (regular, error, summary) are only way system talks to you via Slack
- Shared data format locked in — every future agent reads and writes same structure, nothing lost between steps
- Automatic checks run on every code change to catch breaks early

**Bugs caught before merge:**
- Alert system crashed with confusing error when Slack address was missing — added early exit so it fails quiet
- Storage connection crashed at startup before settings loaded — moved connection to happen inside agent functions, not at startup
- Agent errors could be silently swallowed by a Slack network failure — wrapped alert call so original error always surfaces

**Decisions made:**
- All settings default to empty so tests can run without real credentials — real failure happens when value actually needed
- Storage only connected when agent function runs, not at startup
- Shared data shape is a plain dictionary — required by orchestration framework

---

## Phase 2: Job Discovery
**Branch:** `phase-2-job-discovery` | **PR:** #2 | **Merged:** 2026-06-26

**Aim:** Build job finder — searches multiple sources, filters by your preferences, drops jobs already seen, hands off clean list of new jobs.

**What got built:**
- Job finder pulls listings from multiple job board websites, filtered by role keywords from your settings
- Preference checker gates every job on role, location, and minimum pay — fast rule-based check runs before any slow/expensive steps
- Duplicate checker looks up every job link against history — saves new ones, drops already-seen so nothing applied to twice

**Bugs caught before merge:**
- One job board sends back a different data shape on error — looping over it grabbed wrong fields — added shape check before looping
- Missing preference column in DB caused crash instead of graceful fallback — switched to safe read with default value
- URL cleanup code was stripping wrong characters from job links — replaced with precise pattern match
- Duplicate checker had no safety net — storage failure crashed whole pipeline silently — wrapped both DB calls with error reporting
- Pay number detector was matching zip codes and team sizes as salaries — tightened pattern to require currency symbol, `k` suffix, or salary keyword context

**Decisions made:**
- Two-layer duplicate check: fast in-memory check during discovery, authoritative DB check after — different purposes, both needed
- Pay filter only applies when pay is visible in job description — jobs with no pay info pass through (most postings omit pay)
- Jobs from one source have no company name — outreach agent handles this gap later in Phase 6

<!-- New phases appended below as they merge -->
