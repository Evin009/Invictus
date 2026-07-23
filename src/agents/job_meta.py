import re

_INTERN_RE = re.compile(r"\bintern(ship)?\b", re.IGNORECASE)
_INTERNSHIP_STYLE_RE = re.compile(r"\bintern(ship)?\b|\bco-?op\b", re.IGNORECASE)

# Dropped when extracting "core role words" from a keyword phrase — these
# describe the employment type, not the role itself, and would otherwise
# force an exact-phrase match instead of a broader role match.
_STOPWORDS = {"intern", "internship", "co-op", "coop", "the", "a", "an", "and", "or", "in", "for", "of"}


_WORD_RE = re.compile(r"[a-z]+(?:-[a-z]+)*")  # keeps hyphenated compounds ("co-op") as one token


def _tokenize(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


def _core_role_words(text: str) -> set[str]:
    return {w for w in _tokenize(text) if w not in _STOPWORDS}


_ORIGINAL_CASE_WORD_RE = re.compile(r"[A-Za-z]+(?:-[A-Za-z]+)*")


def broad_search_query(keyword: str) -> str:
    """Strips employment-type words ("Intern", "Co-op") from a keyword
    phrase before typing it into a portal's own search box — searching the
    narrower literal phrase (e.g. "Software Engineering Intern") misses real
    postings the site itself would return for the broader role term (e.g.
    "Software Engineer Co-op", "Backend Intern"). Falls back to the original
    keyword if stripping would leave nothing."""
    words = [w for w in _ORIGINAL_CASE_WORD_RE.findall(keyword) if w.lower() not in _STOPWORDS]
    return " ".join(words) if words else keyword


def matches_keywords(text: str, keywords: list[str]) -> bool:
    """Whether a job posting matches the configured search keywords.

    Two passes: first, the exact-phrase match (fast, precise). If that
    misses, a broader "role match" — true if the posting mentions
    internship/co-op-style employment AND shares a core role word with any
    configured keyword. This catches real postings phrased differently than
    the exact keyword (e.g. keyword "Software Engineering Intern" matching
    a real posting titled "Software Engineer Co-op" or "Backend Intern,
    Engineering"), which the old exact-substring check silently missed.
    """
    if not keywords:
        return True
    t = text.lower()
    for kw in keywords:
        if kw.lower() in t:
            return True
    if not _INTERNSHIP_STYLE_RE.search(t):
        return False
    text_words = _core_role_words(t)
    for kw in keywords:
        kw_words = _core_role_words(kw)
        if kw_words and (kw_words & text_words):
            return True
    return False
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
