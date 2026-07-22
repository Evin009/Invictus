import json
import re
import urllib.error
import urllib.request

GREENHOUSE_BOARD_URL = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
LEVER_POSTINGS_URL = "https://api.lever.co/v0/postings/{token}?mode=json"
ASHBY_BOARD_URL = "https://api.ashbyhq.com/posting-api/job-board/{token}"
SMARTRECRUITERS_POSTINGS_URL = "https://api.smartrecruiters.com/v1/companies/{token}/postings"


def _slug_candidates(company_name: str) -> list[str]:
    """Ordered guesses for a company's Greenhouse/Lever board token, most
    likely first. Real tokens are usually the lowercased company name with
    spaces/punctuation stripped or hyphenated — no reliable way to know which
    without asking each ATS directly, so try both common conventions."""
    lowered = company_name.strip().lower()
    no_sep = re.sub(r"[^a-z0-9]", "", lowered)
    hyphenated = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")
    candidates = [no_sep, hyphenated]
    return list(dict.fromkeys(c for c in candidates if c))


def _verify_greenhouse(token: str) -> bool:
    try:
        req = urllib.request.Request(
            GREENHOUSE_BOARD_URL.format(token=token),
            headers={"User-Agent": "Mozilla/5.0 (compatible; InvictusBot/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            if r.status != 200:
                return False
            data = json.loads(r.read())
        return isinstance(data, dict) and isinstance(data.get("jobs"), list)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return False


def _verify_lever(token: str) -> bool:
    try:
        req = urllib.request.Request(
            LEVER_POSTINGS_URL.format(token=token),
            headers={"User-Agent": "Mozilla/5.0 (compatible; InvictusBot/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            if r.status != 200:
                return False
            data = json.loads(r.read())
        return isinstance(data, list)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return False


def _verify_ashby(token: str) -> bool:
    try:
        req = urllib.request.Request(
            ASHBY_BOARD_URL.format(token=token),
            headers={"User-Agent": "Mozilla/5.0 (compatible; InvictusBot/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            if r.status != 200:
                return False
            data = json.loads(r.read())
        return isinstance(data, dict) and isinstance(data.get("jobs"), list)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return False


def _verify_smartrecruiters(token: str) -> bool:
    """SmartRecruiters' postings endpoint returns 200 with an empty content
    list for ANY company slug, real or not — there's no distinct "not found"
    signal. Requiring totalFound > 0 (real evidence of an actual open
    posting) is the only reliable way to avoid every company slug falsely
    matching this platform. Trade-off: a real SmartRecruiters user with zero
    open reqs at check time won't be detected — safer than the alternative,
    which was every single company (including Apple/Google/Microsoft) falsely
    matching, confirmed live."""
    try:
        req = urllib.request.Request(
            SMARTRECRUITERS_POSTINGS_URL.format(token=token),
            headers={"User-Agent": "Mozilla/5.0 (compatible; InvictusBot/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            if r.status != 200:
                return False
            data = json.loads(r.read())
        return isinstance(data, dict) and isinstance(data.get("content"), list) and data.get("totalFound", 0) > 0
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return False


# Checked in this order per company — most-common-first among companies that
# use a standard ATS rather than a custom portal.
_VERIFIERS = [
    ("greenhouse", _verify_greenhouse),
    ("lever", _verify_lever),
    ("ashby", _verify_ashby),
    ("smartrecruiters", _verify_smartrecruiters),
]


def detect_ats(company_name: str) -> tuple[str, str] | None:
    """Best-effort detection of which ATS a company uses (Greenhouse, Lever,
    Ashby, or SmartRecruiters) and its board token, by guessing common slug
    conventions and verifying live against each platform's public API.
    Returns (platform, token) or None if nothing responds for any guessed
    slug — most companies, especially FAANG-scale ones with custom portals,
    won't resolve here."""
    candidates = _slug_candidates(company_name)
    for platform, verify in _VERIFIERS:
        for token in candidates:
            if verify(token):
                return (platform, token)
    return None
