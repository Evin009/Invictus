import json
import re
import urllib.request
from src.state import GraphState, JobItem
from src.config import settings
from src.notifications.slack import post_error


def fetch_greenhouse_jobs(board_token: str, keywords: list[str]) -> list[JobItem]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true"
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    jobs = []
    for j in data.get("jobs", []):
        title = j.get("title", "")
        if not any(kw.lower() in title.lower() for kw in keywords):
            continue
        jobs.append(JobItem(
            job_url=j["absolute_url"],
            job_id=str(j["id"]),
            title=title,
            company=board_token,
            source="greenhouse",
            description=j.get("content", ""),
            ats_platform="greenhouse",
            raw_json=j,
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
        jobs.append(JobItem(
            job_url=j["hostedUrl"],
            job_id=j["id"],
            title=title,
            company=company,
            source="lever",
            description=j.get("descriptionPlain", ""),
            ats_platform="lever",
            raw_json=j,
        ))
    return jobs


def fetch_github_jobs(repo_url: str, keywords: list[str]) -> list[JobItem]:
    req = urllib.request.Request(
        repo_url,
        headers={"Authorization": f"token {settings.github_token}"} if settings.github_token else {},
    )
    with urllib.request.urlopen(req) as r:
        content = r.read().decode()
    jobs = []
    for line in content.splitlines():
        if not any(kw.lower() in line.lower() for kw in keywords):
            continue
        urls = re.findall(r'https?://\S+', line)
        if not urls:
            continue
        job_url = re.sub(r'[)\]."\']+$', '', urls[0])
        jobs.append(JobItem(
            job_url=job_url,
            job_id=job_url,
            title=line[:80].strip(),
            company="",
            source="github",
            description=line,
            ats_platform="unknown",
            raw_json={"raw_line": line},
        ))
    return jobs


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

    # Greenhouse — add your target company board tokens here
    greenhouse_boards: list[str] = []
    for board in greenhouse_boards:
        try:
            all_jobs.extend(fetch_greenhouse_jobs(board, keywords))
        except Exception as e:
            post_error("search_agent", str(e), {"source": "greenhouse", "board": board})

    # Lever — add your target company slugs here
    lever_companies: list[str] = []
    for company in lever_companies:
        try:
            all_jobs.extend(fetch_lever_jobs(company, keywords))
        except Exception as e:
            post_error("search_agent", str(e), {"source": "lever", "company": company})

    # GitHub curated job lists — add raw README URLs here
    github_repos: list[str] = []
    for repo_url in github_repos:
        try:
            all_jobs.extend(fetch_github_jobs(repo_url, keywords))
        except Exception as e:
            post_error("search_agent", str(e), {"source": "github", "url": repo_url})

    existing = state.get("jobs_discovered", [])
    seen_urls = {j["job_url"] for j in existing}
    new_jobs = [j for j in all_jobs if j["job_url"] not in seen_urls]
    return {"jobs_discovered": existing + new_jobs}
