import re
from src.state import JobItem


def make_version_slug(job: JobItem) -> str:
    """Sanitized filename-safe slug from job company + id, max 50 chars."""
    return re.sub(r"[^a-zA-Z0-9_-]", "_", f"{job['company']}_{job['job_id']}")[:50]
