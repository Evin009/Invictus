from datetime import datetime, timezone, timedelta

from src.db.client import get_client
from src.notifications.slack import post_error, post_summary


def generate_report(since: str | None = None) -> dict:
    """Fetch run stats from DB and post Slack summary. Returns stats dict.

    since: ISO8601 UTC timestamp; if provided, counts are filtered to rows created after this time.
    Defaults to 24 hours ago so cron summaries reflect the last cycle, not all-time totals.
    """
    if since is None:
        since = (datetime.now(tz=timezone.utc) - timedelta(hours=24)).isoformat()
    try:
        stats = _fetch_stats(since)
    except Exception as e:
        post_error("reporter", str(e), {})
        return {}
    _save_run_log(stats)
    post_summary(stats)
    return stats


def _save_run_log(stats: dict) -> None:
    """Persist this run's stats so the dashboard's 'Last run' card and the
    Slack summary always show the same numbers — one insert, two readers."""
    try:
        db = get_client()
        db.table("run_log").insert({
            "jobs_discovered": stats.get("jobs_discovered", 0),
            "applied": stats.get("applied", 0),
            "manual_pending": stats.get("manual_pending", 0),
            "interviews": stats.get("interviews", 0),
            "rejections": stats.get("rejections", 0),
            "replies": stats.get("replies", 0),
            "outreach_sent": stats.get("outreach_sent", 0),
        }).execute()
    except Exception as e:
        post_error("reporter", str(e), {"step": "save_run_log"})


def _fetch_stats(since: str) -> dict:
    db = get_client()
    return {
        "jobs_discovered": len(db.table("jobs_seen").select("id").gte("created_at", since).execute().data or []),
        "applied": len(db.table("applications").select("id").neq("status", "manual_pending").gte("submitted_at", since).execute().data or []),
        "manual_pending": len(db.table("applications").select("id").eq("status", "manual_pending").gte("submitted_at", since).execute().data or []),
        "interviews": len(db.table("applications").select("id").eq("status", "interview").gte("submitted_at", since).execute().data or []),
        "rejections": len(db.table("applications").select("id").eq("status", "rejection").gte("submitted_at", since).execute().data or []),
        "replies": len(db.table("reply_log").select("id").gte("received_at", since).execute().data or []),
        "outreach_sent": len(db.table("outreach_log").select("id").gte("sent_at", since).execute().data or []),
    }
