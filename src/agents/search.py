import json
import re
import urllib.request
from src.state import GraphState, JobItem
from src.config import settings
from src.notifications.slack import post_error
from src.agents.job_meta import (
    infer_degree_level,
    infer_job_type,
    infer_role_category,
    infer_visa_sponsorship,
    infer_workplace,
)


def fetch_greenhouse_jobs(board_token: str, keywords: list[str]) -> list[JobItem]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true"
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    jobs = []
    for j in data.get("jobs", []):
        title = j.get("title", "")
        if not any(kw.lower() in title.lower() for kw in keywords):
            continue
        content = j.get("content", "")
        location = (j.get("location") or {}).get("name")
        jobs.append(JobItem(
            job_url=j["absolute_url"],
            job_id=str(j["id"]),
            title=title,
            company=board_token,
            source="greenhouse",
            description=content,
            ats_platform="greenhouse",
            raw_json=j,
            location=location,
            job_type=infer_job_type(title),
            workplace=infer_workplace(location, content),
            degree_level=infer_degree_level(content),
            visa_sponsorship=infer_visa_sponsorship(content),
            role_category=infer_role_category(title),
        ))
    return jobs


def fetch_lever_jobs(company: str, keywords: list[str]) -> list[JobItem]:
    url = f"https://api.lever.co/v0/postings/{company}?mode=json"
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    if not isinstance(data, list):
        return []
    jobs = []
    for j in data:
        title = j.get("text", "")
        if not any(kw.lower() in title.lower() for kw in keywords):
            continue
        categories = j.get("categories") or {}
        description = j.get("descriptionPlain", "")
        location = categories.get("location")
        jobs.append(JobItem(
            job_url=j["hostedUrl"],
            job_id=j["id"],
            title=title,
            company=company,
            source="lever",
            description=description,
            ats_platform="lever",
            raw_json=j,
            location=location,
            job_type=categories.get("commitment") or infer_job_type(title),
            workplace=infer_workplace(location, j.get("workplaceType")),
            degree_level=infer_degree_level(description),
            visa_sponsorship=infer_visa_sponsorship(description),
            role_category=infer_role_category(title),
        ))
    return jobs


def _strip_tags(cell_html: str) -> str:
    return re.sub(r"<[^>]+>", "", cell_html).strip()


def _first_href(cell_html: str) -> str | None:
    m = re.search(r'href="([^"]+)"', cell_html)
    return m.group(1) if m else None


def _extract_table_rows(html: str) -> list[list[str]]:
    rows = []
    for row_match in re.finditer(r"<tr>(.*?)</tr>", html, re.DOTALL | re.IGNORECASE):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row_match.group(1), re.DOTALL | re.IGNORECASE)
        if cells:
            rows.append(cells)
    return rows


def fetch_github_jobs(repo_url: str, keywords: list[str]) -> list[JobItem]:
    """Curated job-list repos (e.g. SimplifyJobs/vanshb03 intern/new-grad
    lists) publish an HTML table embedded in their README.md — company,
    role, location, application links, age. Sub-roles at the same company
    use '↳' in place of repeating the company name."""
    req = urllib.request.Request(
        repo_url,
        headers={"Authorization": f"token {settings.github_token}"} if settings.github_token else {},
    )
    with urllib.request.urlopen(req) as r:
        content = r.read().decode()

    jobs = []
    last_company = ""
    for cells in _extract_table_rows(content):
        if len(cells) < 3:
            continue
        company_text = _strip_tags(cells[0])
        company = last_company if company_text in ("", "↳") else company_text
        last_company = company

        role = _strip_tags(cells[1])
        if not role or not any(kw.lower() in role.lower() for kw in keywords):
            continue

        location = _strip_tags(cells[2]) if len(cells) > 2 else ""
        job_url = _first_href(cells[3]) if len(cells) > 3 else None
        if not job_url:
            continue

        jobs.append(JobItem(
            job_url=job_url,
            job_id=job_url,
            title=role,
            company=company,
            source="github",
            description=f"{role} — {location}".strip(" —"),
            ats_platform="unknown",
            raw_json={"company": company, "role": role, "location": location},
            location=location or None,
            job_type=infer_job_type(role),
            workplace=infer_workplace(location),
            degree_level=None,
            visa_sponsorship=None,
            role_category=infer_role_category(role),
        ))
    return jobs


# Actively-maintained curated intern/new-grad job list repos — publish an
# HTML job table in README.md, updated daily by their maintainers/community.
GITHUB_JOB_REPOS: list[str] = [
    "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md",
    "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md",
    "https://raw.githubusercontent.com/vanshb03/New-Grad-2026/main/README.md",
]


def _resolve_watchlist_ats(db, row: dict) -> tuple[str, str] | None:
    """Returns the (platform, token) for a watchlist company, detecting and
    caching it on first check. Returns None if no ATS was found (also cached,
    so we don't re-guess-and-verify against Greenhouse/Lever every run)."""
    if row.get("ats_checked_at"):
        platform, token = row.get("ats_platform"), row.get("ats_token")
        return (platform, token) if platform and token else None

    from datetime import datetime, timezone
    from src.agents.ats_detect import detect_ats

    detected = detect_ats(row.get("company_name", ""))
    update = {"ats_checked_at": datetime.now(timezone.utc).isoformat()}
    if detected:
        update["ats_platform"], update["ats_token"] = detected
    db.table("watchlist").update(update).eq("id", row["id"]).execute()
    return detected


def search_agent(state: GraphState) -> dict:
    from src.db.client import get_client
    db = get_client()

    try:
        prefs_rows = db.table("preferences").select("*").limit(1).execute().data
    except Exception as e:
        post_error("search_agent", str(e), {"step": "load_preferences"})
        return {"jobs_discovered": state.get("jobs_discovered", [])}

    keywords = (prefs_rows[0].get("role_keywords") or ["software engineer"]) if prefs_rows else ["software engineer"]
    all_jobs: list[JobItem] = []

    try:
        watchlist_rows = db.table("watchlist").select("*").execute().data or []
    except Exception as e:
        post_error("search_agent", str(e), {"step": "load_watchlist"})
        watchlist_rows = []

    for row in watchlist_rows:
        company = row.get("company_name", "")
        try:
            resolved = _resolve_watchlist_ats(db, row)
        except Exception as e:
            post_error("search_agent", str(e), {"step": "resolve_ats", "company": company})
            continue
        if not resolved:
            continue
        platform, token = resolved
        try:
            if platform == "greenhouse":
                all_jobs.extend(fetch_greenhouse_jobs(token, keywords))
            elif platform == "lever":
                all_jobs.extend(fetch_lever_jobs(token, keywords))
        except Exception as e:
            post_error("search_agent", str(e), {"source": platform, "company": company})

    for repo_url in GITHUB_JOB_REPOS:
        try:
            all_jobs.extend(fetch_github_jobs(repo_url, keywords))
        except Exception as e:
            post_error("search_agent", str(e), {"source": "github", "url": repo_url})

    existing = state.get("jobs_discovered", [])
    seen_urls = {j["job_url"] for j in existing}
    new_jobs = [j for j in all_jobs if j["job_url"] not in seen_urls]
    return {"jobs_discovered": existing + new_jobs}
