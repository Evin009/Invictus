from src.state import JobItem
from src.db.client import get_client
from src.notifications.slack import post_error


def dedup_filter(jobs: list[JobItem]) -> list[JobItem]:
    if not jobs:
        return []
    db = get_client()
    urls = [j["job_url"] for j in jobs]
    try:
        seen = db.table("jobs_seen").select("job_url").in_("job_url", urls).execute().data
    except Exception as e:
        post_error("dedup_filter", str(e), {"step": "check_seen", "url_count": len(urls)})
        raise
    seen_urls = {row["job_url"] for row in seen}
    new_jobs = [j for j in jobs if j["job_url"] not in seen_urls]
    if new_jobs:
        try:
            db.table("jobs_seen").insert([
                {
                    "job_url": j["job_url"],
                    "job_id": j["job_id"],
                    "title": j["title"],
                    "company": j["company"],
                    "source": j["source"],
                    "raw_json": j["raw_json"],
                    "location": j.get("location"),
                    "job_type": j.get("job_type"),
                    "workplace": j.get("workplace"),
                    "degree_level": j.get("degree_level"),
                    "visa_sponsorship": j.get("visa_sponsorship"),
                    "role_category": j.get("role_category"),
                }
                for j in new_jobs
            ]).execute()
        except Exception as e:
            post_error("dedup_filter", str(e), {"step": "insert_seen", "new_count": len(new_jobs)})
            raise
    return new_jobs
