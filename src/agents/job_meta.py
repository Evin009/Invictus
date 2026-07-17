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


_REMOTE_RE = re.compile(r"\bremote\b", re.IGNORECASE)
_HYBRID_RE = re.compile(r"\bhybrid\b", re.IGNORECASE)
_ONSITE_RE = re.compile(r"\bon[- ]?site\b|\boffice\b", re.IGNORECASE)


def infer_workplace(location: str | None, explicit: str | None = None) -> str | None:
    """Workplace type from a real field when the source has one (Lever's
    categories.workplaceType), else guessed from location text. Returns None
    rather than a default guess when neither signal is present."""
    for text in (explicit, location):
        if not text:
            continue
        if _REMOTE_RE.search(text):
            return "Remote"
        if _HYBRID_RE.search(text):
            return "Hybrid"
        if _ONSITE_RE.search(text):
            return "Onsite"
    return None


_DEGREE_PATTERNS = [
    ("PhD", re.compile(r"\bph\.?d\b", re.IGNORECASE)),
    ("Master's", re.compile(r"\bmaster'?s?\b", re.IGNORECASE)),
    ("Bachelor's", re.compile(r"\bbachelor'?s?\b", re.IGNORECASE)),
    ("Associate", re.compile(r"\bassociate'?s? degree\b", re.IGNORECASE)),
    ("High school", re.compile(r"\bhigh school\b", re.IGNORECASE)),
]


def infer_degree_level(text: str | None) -> str | None:
    """Best-effort degree requirement from job description text. Checked
    most-senior-first since postings often list multiple acceptable degrees
    ("Bachelor's or Master's") — the most senior mention wins."""
    if not text:
        return None
    for label, pattern in _DEGREE_PATTERNS:
        if pattern.search(text):
            return label
    return None


_VISA_NO_RE = re.compile(
    r"(not (currently |)able to sponsor|unable to sponsor|no(t)? sponsorship|does not (offer|provide) sponsorship|cannot sponsor|without sponsorship)",
    re.IGNORECASE,
)
_VISA_YES_RE = re.compile(
    r"(will sponsor|sponsorship (is |)available|open to sponsor(ing)?|able to sponsor|visa sponsorship (offered|provided))",
    re.IGNORECASE,
)


def infer_visa_sponsorship(text: str | None) -> str | None:
    """Best-effort visa sponsorship signal from job description text — most
    postings don't mention it at all, in which case this returns None rather
    than guessing."""
    if not text:
        return None
    if _VISA_NO_RE.search(text):
        return "No"
    if _VISA_YES_RE.search(text):
        return "Yes"
    return None


_ROLE_CATEGORIES = [
    ("Data", re.compile(r"\bdata (scientist|engineer|analyst|analytics)\b", re.IGNORECASE)),
    ("Design", re.compile(r"\bdesign(er)?\b", re.IGNORECASE)),
    ("Product", re.compile(r"\bproduct (manager|management|owner)\b", re.IGNORECASE)),
    ("Marketing", re.compile(r"\bmarketing\b", re.IGNORECASE)),
    ("Engineering", re.compile(r"\b(engineer|developer|swe|software)\b", re.IGNORECASE)),
]


def infer_role_category(title: str) -> str | None:
    """Coarse role category from the job title. Checked in this order so
    "Data Engineer" lands in Data rather than Engineering."""
    for label, pattern in _ROLE_CATEGORIES:
        if pattern.search(title):
            return label
    return None
