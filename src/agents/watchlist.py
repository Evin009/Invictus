import json
import re

import anthropic
from playwright.sync_api import sync_playwright

from src.config import settings
from src.db.client import get_client
from src.notifications.slack import post_error
from src.state import GraphState, JobItem


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

    for row in rows:
        company = row.get("company_name", "")
        url = row.get("careers_url", "")
        keywords = row.get("role_keywords") or []
        if not url:
            continue
        try:
            text = _scrape_career_page(url, keywords)
            jobs = _parse_jobs(text, company, url, keywords, source="watchlist")
            for job in jobs:
                if job["job_url"] not in seen_urls:
                    seen_urls.add(job["job_url"])
                    all_jobs.append(job)
        except Exception as e:
            post_error("watchlist_agent", str(e), {"company": company, "url": url})
            continue

    return {"jobs_discovered": existing + all_jobs}


def _scrape_career_page(url: str, keywords: list[str] | None = None) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
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
            return page.inner_text("body")
        finally:
            browser.close()


def _try_search(page, keywords: list[str] | None) -> None:
    """Large-company career portals (Google/Meta/Apple/Amazon/Microsoft-style)
    render only marketing copy on landing; real listings appear after a search
    is submitted. Best-effort: find a search box, submit the first configured
    keyword, wait for results. Silently no-ops on any failure — the caller
    falls back to whatever's already on the page."""
    if not keywords:
        return
    query = keywords[0]
    selectors = [
        "input[type='search']",
        "input[placeholder*='search' i]",
        "input[placeholder*='job title' i]",
        "input[placeholder*='keyword' i]",
        "input[aria-label*='search' i]",
    ]
    for selector in selectors:
        try:
            box = page.locator(selector).first
            if box.count() == 0:
                continue
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
        f"Extract all job listings matching these keywords: {kw_str}\n\n"
        "Return a JSON array of objects with keys: title (string), url (string).\n"
        "Include a url for each listing if visible; omit the key if no URL is available.\n"
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
        jobs.append(JobItem(
            job_url=job_url,
            job_id=job_url,
            title=title,
            company=company,
            source=source,
            description=title,
            ats_platform="unknown",
            raw_json=item,
        ))
    return jobs
