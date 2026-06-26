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

## Phase 4: Content Generation
**Branch:** `phase-4-content-generation` | **PR:** #4 | **Merged:** 2026-06-26

**Aim:** Build the two document makers — one that rewrites resume bullet points to match each job, compiles it into a PDF, and enforces the 2-page cap; one that writes a tailored cover letter for each job and enforces the 350-word cap.

**What got built:**
- Resume maker: pulls the most relevant resume bullets for each job (from Phase 3), sends them to AI to rewrite using the job's language, swaps the rewrites into the original resume file, compiles to PDF, checks the page count — holds the job and alerts if over 2 pages
- Cover letter maker: pulls a tone example and applicant profile from storage, asks AI to write a job-specific letter, checks it's under 350 words and not empty — holds and alerts if either check fails; saves letter to file
- Shared filename helper — both makers use the same rule to name their output files (company + job ID, special chars stripped)

**Bugs caught before merge:**
- AI often wraps its JSON reply in code fences (```json ...```) despite being told not to — added fence-stripping before trying to parse the reply
- AI might return slightly different wording for the "original" bullet than what was sent — used safe field lookup so a mismatch skips silently instead of crashing
- Empty AI response (API hiccup or content filter) would write an empty cover letter file with no error — added explicit check and alert
- Page count tool had no time limit — could hang the whole pipeline forever on a malformed PDF — added 30-second timeout
- Applicant profile was sent to AI as raw Python syntax (single-quoted keys, `None` instead of `null`) — switched to standard JSON format so AI reads it correctly
- Output file naming logic was copy-pasted in both files — extracted to shared helper so a future change only needs one edit

**Decisions made:**
- Resume maker and cover letter maker are separate agents — each has one job and one set of failure modes
- Both hold the job (raise an error) on any document quality failure — never submit with a bad resume or empty letter
- AI output treated as untrusted text: fences stripped, fields validated, empty response caught before writing to disk

## Phase 5: Application Submission
**Branch:** `phase-5-application-submission` | **PR:** #5 | **Merged:** 2026-06-26

**Aim:** Build the agent that actually submits job applications — detect which job board it is, open the page in a browser, fill the form, and save a record of what happened.

**What got built:**
- Job board detector: reads the job link and identifies which of the four supported platforms it belongs to (Greenhouse, Lever, Ashby, Workday); anything else is immediately flagged for manual submission
- Form filler: opens the job page in a hidden browser, finds standard fields like name, email, phone, LinkedIn, and GitHub, fills them from the saved applicant profile, and uploads the resume and cover letter files
- Safety guards: checks for a captcha or login wall before filling anything — and again after clicking submit, since some boards only show captchas after the form is submitted
- Blank form protection: refuses to click submit if none of the required identity fields (email, first name, last name) were found on the page
- Manual fallback: whenever any guard fires, sends a Slack alert with the job link so the application can be done by hand; saves a record to the database marked as waiting for manual action (not falsely marked as submitted)
- Application record: saves a full receipt to the database after every attempt — auto or manual — including which fields were filled, where the resume and cover letter files live, and the current status

**Bugs caught before merge:**
- Form submit would fire on a completely blank form if the applicant profile wasn't set up — added a check requiring at least one identity field before clicking submit
- Captcha detection only ran at page load; some boards inject a captcha only after you click submit — added a second check after the page settles
- Manual fallback receipts were saved with status "applied" even though no application was submitted — fixed to "manual pending" so the tracker is accurate
- A database failure inside the manual fallback was crashing the whole pipeline — wrapped it so the pipeline keeps running and the Slack alert already sent is the notification
- Resume and cover letter file paths were being buried inside the form-fill record instead of stored in their own dedicated database columns — fixed so they're always top-level and queryable
- Two agents had identical code for reading the applicant profile from the database — removed the duplicate from the apply agent and reused the existing one from the cover letter agent

**Decisions made:**
- Never guess or skip required fields — halt and alert rather than submit a broken form
- Captcha checked twice: once before touching the form, once after submit settles — catches both pre-loaded and post-submit challenges
- Manual fallback always saves a record and always alerts Slack, even if the database write fails
- "Manual pending" and "applied" are distinct statuses — a job routed to manual is not counted as submitted until confirmed

<!-- New phases appended below as they merge -->
