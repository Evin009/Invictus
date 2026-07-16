import json
import re
import urllib.error
import urllib.request

GREENHOUSE_BOARD_URL = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
LEVER_POSTINGS_URL = "https://api.lever.co/v0/postings/{token}?mode=json"


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


def detect_ats(company_name: str) -> tuple[str, str] | None:
    """Best-effort detection of which ATS (Greenhouse or Lever) a company uses
    and its board token, by guessing common slug conventions and verifying
    live against each platform's public API. Returns (platform, token) or
    None if neither platform responds for any guessed slug — most companies,
    especially FAANG-scale ones with custom portals, won't resolve here."""
    for token in _slug_candidates(company_name):
        if _verify_greenhouse(token):
            return ("greenhouse", token)
    for token in _slug_candidates(company_name):
        if _verify_lever(token):
            return ("lever", token)
    return None
