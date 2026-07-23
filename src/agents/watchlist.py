import hashlib
import json
import math
import re
from datetime import datetime, timedelta, timezone

import anthropic
from playwright.sync_api import sync_playwright

from src.agents.job_meta import broad_search_query, infer_job_type, infer_role_category, infer_workplace
from src.config import settings
from src.db.client import get_client
from src.notifications.slack import post_error
from src.state import GraphState, JobItem

CACHE_TTL_HOURS = 1
BATCH_SIZE = 50
ROTATION_INTERVAL_HOURS = 5


def _select_active_batch(rows: list[dict]) -> list[dict]:
    """When the watchlist grows past BATCH_SIZE, only scrape one batch of 50
    per hour, rotating to the next batch every ROTATION_INTERVAL_HOURS. Fully
    stateless — the active batch is derived from wall-clock time, not stored
    anywhere, so it's deterministic across runs without needing DB state.
    Below BATCH_SIZE companies, every row is checked every run (no rotation
    needed)."""
    if len(rows) <= BATCH_SIZE:
        return rows
    ordered = sorted(rows, key=lambda r: r["id"])
    total_batches = math.ceil(len(ordered) / BATCH_SIZE)
    cycle_index = int(datetime.now(timezone.utc).timestamp() // (ROTATION_INTERVAL_HOURS * 3600))
    active_batch = cycle_index % total_batches
    start = active_batch * BATCH_SIZE
    return ordered[start:start + BATCH_SIZE]


def _keywords_hash(keywords: list[str]) -> str:
    normalized = ",".join(sorted(k.strip().lower() for k in keywords))
    return hashlib.sha256(normalized.encode()).hexdigest()


def _get_cached_jobs(careers_url: str, keywords: list[str]) -> list[dict] | None:
    db = get_client()
    kh = _keywords_hash(keywords)
    rows = (
        db.table("scrape_cache")
        .select("parsed_jobs, scraped_at")
        .eq("careers_url", careers_url)
        .eq("keywords_hash", kh)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        return None
    scraped_at = datetime.fromisoformat(rows[0]["scraped_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) - scraped_at > timedelta(hours=CACHE_TTL_HOURS):
        return None
    return rows[0]["parsed_jobs"]


def _set_cached_jobs(careers_url: str, keywords: list[str], jobs: list[dict]) -> None:
    db = get_client()
    kh = _keywords_hash(keywords)
    db.table("scrape_cache").upsert(
        {
            "careers_url": careers_url,
            "keywords_hash": kh,
            "parsed_jobs": jobs,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="careers_url,keywords_hash",
    ).execute()


def watchlist_agent(state: GraphState) -> dict:
    try:
        db = get_client()
        rows = db.table("watchlist").select("*").execute().data or []
    except Exception as e:
        post_error("watchlist_agent", str(e), {"step": "load_watchlist"})
        return {"jobs_discovered": state.get("jobs_discovered", [])}

    if not rows:
        return {"jobs_discovered": state.get("jobs_discovered", [])}

    existing = state.get("jobs_discovered", [])
    seen_urls = {j["job_url"] for j in existing}
    all_jobs: list[JobItem] = []

    for row in _select_active_batch(rows):
        company = row.get("company_name", "")
        url = row.get("careers_url", "")
        keywords = row.get("role_keywords") or []
        if not url:
            continue
        try:
            try:
                cached = _get_cached_jobs(url, keywords)
            except Exception:
                cached = None
            if cached is not None:
                jobs = cached
            else:
                text = _scrape_career_page(url, keywords)
                jobs = _parse_jobs(text, company, url, keywords, source="watchlist")
                try:
                    _set_cached_jobs(url, keywords, jobs)
                except Exception:
                    pass
            for job in jobs:
                if job["job_url"] not in seen_urls:
                    seen_urls.add(job["job_url"])
                    all_jobs.append(job)
        except Exception as e:
            post_error("watchlist_agent", str(e), {"company": company, "url": url})
            continue

    return {"jobs_discovered": existing + all_jobs}


def _looks_like_job_list(items) -> bool:
    if not isinstance(items, list) or not items:
        return False
    sample = items[0]
    if not isinstance(sample, dict):
        return False
    keys = " ".join(str(k).lower() for k in sample.keys())
    return bool(re.search(r"title|position|role|job", keys))


def _extract_job_arrays(obj, found: list, depth: int = 0) -> None:
    if depth > 4:
        return
    if isinstance(obj, list):
        if _looks_like_job_list(obj):
            found.append(obj)
        for item in obj:
            if isinstance(item, (dict, list)):
                _extract_job_arrays(item, found, depth + 1)
    elif isinstance(obj, dict):
        for v in obj.values():
            if isinstance(v, (dict, list)):
                _extract_job_arrays(v, found, depth + 1)


def _register_api_capture(page) -> list[list[dict]]:
    """Many large-company career portals (Google/Meta/Microsoft-style SPAs)
    render results from their own internal JSON API rather than plain HTML —
    the rendered-DOM text scrape misses them, and we can't guess each
    company's private endpoint URL. Instead, capture any JSON response the
    page itself fetches during our automated session that looks like a real
    job-listing array, so the real data reaches Claude even when the visible
    page text doesn't have it."""
    captured: list[list[dict]] = []

    def on_response(response):
        try:
            ctype = response.headers.get("content-type", "")
            if "json" not in ctype or response.status != 200:
                return
            body = response.json()
        except Exception:
            return
        found: list = []
        _extract_job_arrays(body, found)
        captured.extend(found)

    page.on("response", on_response)
    return captured


def _scrape_career_page(url: str, keywords: list[str] | None = None) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            captured = _register_api_capture(page)
            page.goto(url, timeout=30000, wait_until="domcontentloaded")
            # networkidle never fires on pages with persistent background
            # activity (chat widgets, analytics, polling) — wait for it
            # opportunistically but don't fail the whole scrape if it never comes.
            try:
                page.wait_for_load_state("networkidle", timeout=8000)
            except Exception:
                pass
            if page.query_selector("input[type='password']"):
                raise RuntimeError("Login wall detected")
            _try_search(page, keywords)
            try:
                page.wait_for_timeout(1500)  # let any XHR triggered by the search settle
            except Exception:
                pass
            text = page.inner_text("body")
            if captured:
                best = max(captured, key=len)
                api_text = json.dumps(best[:40], default=str)[:6000]
                text = f"{text}\n\n--- Job data captured from page's own API ---\n{api_text}"
            return text
        finally:
            browser.close()


_SEARCH_BOX_SELECTORS = [
    "input[type='search']",
    "input[placeholder*='search' i]",
    "input[placeholder*='job title' i]",
    "input[placeholder*='keyword' i]",
    "input[aria-label*='search' i]",
]

# Some portals (Amazon-style) keep the real search input hidden inside a
# modal/overlay that only opens after clicking a trigger icon — a common
# enough pattern to handle generically rather than per-company.
_SEARCH_REVEAL_SELECTORS = [
    "button[aria-label*='search' i]",
    "a[aria-label*='search' i]",
    "button:has-text('Search')",
]


def _reveal_hidden_search_box(page) -> None:
    for selector in _SEARCH_REVEAL_SELECTORS:
        try:
            trigger = page.locator(selector).first
            if trigger.count() == 0:
                continue
            trigger.click(timeout=3000)
            page.wait_for_timeout(500)
            return
        except Exception:
            continue


def _try_search(page, keywords: list[str] | None) -> None:
    """Large-company career portals (Google/Meta/Apple/Amazon/Microsoft-style)
    render only marketing copy on landing; real listings appear after a search
    is submitted. Best-effort: find a search box, submit a broadened version
    of the first configured keyword (employment-type words like "Intern"
    stripped, so the portal's own search returns co-ops/new-grad roles too,
    not just exact-phrase intern postings), wait for results. Silently
    no-ops on any failure — the caller falls back to whatever's already on
    the page."""
    if not keywords:
        return
    query = broad_search_query(keywords[0])
    revealed = False
    for selector in _SEARCH_BOX_SELECTORS:
        try:
            box = page.locator(selector).first
            if box.count() == 0:
                continue
            if not box.is_visible() and not revealed:
                _reveal_hidden_search_box(page)
                revealed = True
            box.click(timeout=3000)
            box.fill(query, timeout=3000)
            box.press("Enter", timeout=3000)
            try:
                page.wait_for_load_state("networkidle", timeout=6000)
            except Exception:
                page.wait_for_timeout(2000)
            return
        except Exception:
            continue


def _parse_jobs(text: str, company: str, careers_url: str, keywords: list[str], source: str = "watchlist") -> list[JobItem]:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    kw_str = ", ".join(keywords) if keywords else "software engineer"
    truncated = text[:8000]
    prompt = (
        f"You are parsing a company careers page for {company}.\n"
        f"Extract job listings matching these keywords: {kw_str}\n"
        "A listing counts as a match if its title contains one of the keyword phrases directly, "
        "OR if it's an internship/co-op-style role that shares a core role word with a keyword "
        "(e.g. keyword \"Software Engineering Intern\" should also match a real listing titled "
        "\"Software Engineer Co-op\" or \"Backend Intern, Platform Team\") — don't require an exact "
        "phrase match, look for real role matches.\n\n"
        "Return a JSON array of objects with keys: title (string), url (string), location (string), "
        "workplace (one of: Remote, Hybrid, Onsite), degree_level (one of: High school, Associate, "
        "Bachelor's, Master's, PhD), visa_sponsorship (one of: Yes, No), role_category (one of: "
        "Engineering, Design, Product, Data, Marketing).\n"
        "Include a url for each listing if visible; omit the key if no URL is available.\n"
        "Include location if the page shows one for that listing (city/remote); omit the key if not shown.\n"
        "Only include workplace, degree_level, visa_sponsorship, or role_category if the page text actually "
        "states it for that listing — omit the key entirely rather than guessing.\n"
        "If no matching jobs found, return [].\n"
        "Return only the JSON array, no other text.\n\n"
        f"Page text:\n{truncated}"
    )
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    if not response.content:
        return []

    raw = response.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        items = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return []

    if not isinstance(items, list):
        return []

    jobs = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = item.get("title", "").strip()
        if not title:
            continue
        raw_url = item.get("url", "").strip()
        # Use title-based synthetic ID when Claude can't extract a URL so multiple
        # jobs from the same page don't all collapse onto careers_url in dedup.
        job_url = raw_url or f"{careers_url}#{re.sub(r'[^a-z0-9]+', '-', title.lower())}"
        location = (item.get("location") or "").strip() or None
        workplace = (item.get("workplace") or "").strip() or None
        jobs.append(JobItem(
            job_url=job_url,
            job_id=job_url,
            title=title,
            company=company,
            source=source,
            description=title,
            ats_platform="unknown",
            raw_json=item,
            location=location,
            job_type=infer_job_type(title),
            workplace=workplace or infer_workplace(location),
            degree_level=(item.get("degree_level") or "").strip() or None,
            visa_sponsorship=(item.get("visa_sponsorship") or "").strip() or None,
            role_category=(item.get("role_category") or "").strip() or infer_role_category(title),
        ))
    return jobs
