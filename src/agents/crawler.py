from src.agents.watchlist import _scrape_career_page, _parse_jobs
from src.db.client import get_client
from src.notifications.slack import post_error
from src.state import GraphState, JobItem


def crawler_agent(state: GraphState) -> dict:
    try:
        db = get_client()
        rows = db.table("crawler_urls").select("*").eq("active", True).execute().data or []
    except Exception as e:
        post_error("crawler_agent", str(e), {"step": "load_crawler_urls"})
        return {"jobs_discovered": state.get("jobs_discovered", [])}

    if not rows:
        return {"jobs_discovered": state.get("jobs_discovered", [])}

    existing = state.get("jobs_discovered", [])
    seen_urls = {j["job_url"] for j in existing}
    all_jobs: list[JobItem] = []

    prefs_keywords: list[str] = []
    try:
        prefs_rows = db.table("preferences").select("role_keywords").limit(1).execute().data or []
        if prefs_rows:
            prefs_keywords = prefs_rows[0].get("role_keywords") or []
    except Exception as e:
        post_error("crawler_agent", str(e), {"step": "load_preferences"})

    for row in rows:
        company = row.get("company_name", "")
        url = row.get("careers_url", "")
        if not url:
            continue
        try:
            text = _scrape_career_page(url)
            jobs = _parse_jobs(text, company, url, prefs_keywords, source="crawler")
            for job in jobs:
                if job["job_url"] not in seen_urls:
                    seen_urls.add(job["job_url"])
                    all_jobs.append(job)
        except Exception as e:
            post_error("crawler_agent", str(e), {"company": company, "url": url})
            continue

    return {"jobs_discovered": existing + all_jobs}
