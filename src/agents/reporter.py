from src.db.client import get_client
from src.notifications.slack import post_error, post_summary


def generate_report() -> dict:
    """Fetch run stats from DB and post Slack summary. Returns stats dict."""
    try:
        stats = _fetch_stats()
    except Exception as e:
        post_error("reporter", str(e), {})
        return {}
    post_summary(stats)
    return stats


def _fetch_stats() -> dict:
    db = get_client()
    return {
        "jobs_discovered": len(db.table("jobs_seen").select("id").execute().data or []),
        "applied": len(db.table("applications").select("id").neq("status", "manual_pending").execute().data or []),
        "manual_pending": len(db.table("applications").select("id").eq("status", "manual_pending").execute().data or []),
        "interviews": len(db.table("applications").select("id").eq("status", "interview").execute().data or []),
        "rejections": len(db.table("applications").select("id").eq("status", "rejection").execute().data or []),
        "replies": len(db.table("reply_log").select("id").execute().data or []),
        "outreach_sent": len(db.table("outreach_log").select("id").execute().data or []),
    }
