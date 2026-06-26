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

## Phase 3: RAG Pipeline
**Branch:** `phase-3-rag-pipeline` | **PR:** #3 | **Merged:** 2026-06-26

**Aim:** Build the resume-matching brain — chop resume into individual bullets, turn each into a searchable fingerprint stored in the database, then for any job found: search for the resume bullets that best match that job and hand them to the tailoring step.

**What got built:**
- Resume reader: opens any `.tex` resume file, finds every bullet point, tracks which section it came from (Experience, Projects, Skills, etc.), strips all formatting markup so only plain text remains
- Bullet fingerprinter: converts each plain-text bullet into a 1536-number vector — a mathematical fingerprint that captures the meaning of the text — then saves all fingerprints to the database (skips duplicates, overwrites if bullet changed)
- Job matcher: takes a job description, makes a fingerprint of it, searches the database for the resume bullets whose fingerprints are closest — returns the top matches so only the most relevant experience gets used

**Bugs caught before merge:**
- Same bullet appearing under two different resume sections (e.g. "Python, SQL" under both Skills and Technologies) would silently overwrite the first — fixed the uniqueness rule to include section name
- A bad file in a batch run would crash and skip all remaining files — changed to log the error and keep going
- Database returning empty result could be mistaken for a failure — added safety check so empty is treated as empty, not an error

**Decisions made:**
- Fingerprint function is a stand-in placeholder (math-based, no real AI) — must swap in a real provider before the system goes live; documented clearly, single swap point used by both the saver and the searcher
- On error during batch embed, log and continue — one bad resume file should not block the rest
- Fingerprint uniqueness tracked per file + section + bullet text — same bullet in different sections gets its own entry

<!-- New phases appended below as they merge -->
