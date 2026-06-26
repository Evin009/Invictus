from src.state import JobItem
from src.db.client import get_client


def dedup_filter(jobs: list[JobItem]) -> list[JobItem]:
    if not jobs:
        return []
    db = get_client()
    urls = [j["job_url"] for j in jobs]
    seen = db.table("jobs_seen").select("job_url").in_("job_url", urls).execute().data
    seen_urls = {row["job_url"] for row in seen}
    new_jobs = [j for j in jobs if j["job_url"] not in seen_urls]
    if new_jobs:
        db.table("jobs_seen").insert([
            {
                "job_url": j["job_url"],
                "job_id": j["job_id"],
                "title": j["title"],
                "company": j["company"],
                "source": j["source"],
                "raw_json": j["raw_json"],
            }
            for j in new_jobs
        ]).execute()
    return new_jobs
