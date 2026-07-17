import re

_INTERN_RE = re.compile(r"\bintern(ship)?\b", re.IGNORECASE)
_CONTRACT_RE = re.compile(r"\bcontract(or)?\b", re.IGNORECASE)
_PART_TIME_RE = re.compile(r"\bpart[- ]time\b", re.IGNORECASE)


def infer_job_type(title: str) -> str:
    """Best-effort employment-type guess from a job title. Used when the
    source doesn't give us a real field (Greenhouse, GitHub curated lists,
    Claude-parsed career pages). Lever's categories.commitment is a real
    field and should be preferred over this when available."""
    if _INTERN_RE.search(title):
        return "Internship"
    if _CONTRACT_RE.search(title):
        return "Contract"
    if _PART_TIME_RE.search(title):
        return "Part-time"
    return "Full-time"
