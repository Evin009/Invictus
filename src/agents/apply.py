from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

from src.db.client import get_client
from src.notifications.slack import post_error, post_message
from src.state import JobItem

_ATS_DOMAINS: dict[str, list[str]] = {
    "greenhouse": ["boards.greenhouse.io", "boards.eu.greenhouse.io"],
    "lever": ["jobs.lever.co"],
    "ashby": ["jobs.ashbyhq.com"],
    "workday": ["workday.com", "myworkdayjobs.com"],
}

_FIELD_SELECTORS: dict[str, list[str]] = {
    "first_name": ["first_name", "first-name", "firstName"],
    "last_name": ["last_name", "last-name", "lastName"],
    "email": ["email", "email_address"],
    "phone": ["phone", "phone_number", "cell_phone"],
    "linkedin_url": ["linkedin", "linkedin_url", "linkedinProfile"],
    "github_url": ["github", "github_url", "githubProfile"],
}

# At least one of these must appear in filled before submit fires
_REQUIRED_FILL_FIELDS = {"email", "first_name", "last_name"}


class ManualFallbackRequired(Exception):
    pass


def fetch_agent_settings() -> dict:
    """Return {"paused": bool, "daily_cap": int | None} from the Settings page's
    Automation card. Defaults to running, uncapped, if no row exists yet."""
    db = get_client()
    rows = db.table("agent_settings").select("paused,daily_cap").limit(1).execute().data or []
    if not rows:
        return {"paused": False, "daily_cap": None}
    return {"paused": bool(rows[0].get("paused")), "daily_cap": rows[0].get("daily_cap")}


def count_applications_today() -> int:
    """Count applications submitted since midnight UTC, for daily_cap enforcement."""
    db = get_client()
    since = datetime.now(tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    rows = db.table("applications").select("id").gte("submitted_at", since).execute().data or []
    return len(rows)


def _detect_ats_platform(job_url: str) -> str:
    for platform, domains in _ATS_DOMAINS.items():
        if any(domain in job_url for domain in domains):
            return platform
    return "manual"


def apply_to_job(job: JobItem, resume_pdf_path: str, cover_letter_path: str) -> dict:
    ats = _detect_ats_platform(job["job_url"])

    if ats == "manual":
        return _manual_fallback(job, ats, "Unrecognized ATS platform")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                page.goto(job["job_url"], timeout=30000)
                filled = _fill_form(page, resume_pdf_path, cover_letter_path)
                receipt = _build_receipt(job, ats, "auto", filled, resume_pdf_path, cover_letter_path)
            finally:
                browser.close()
    except ManualFallbackRequired as e:
        return _manual_fallback(job, ats, str(e))
    except Exception as e:
        post_error("apply_agent", str(e), {"job_url": job["job_url"]})
        raise

    _save_application(receipt)
    return receipt


def _fill_form(page, resume_pdf_path: str, cover_letter_path: str) -> dict:
    """Fill standard fields and upload files. Raises ManualFallbackRequired on guard conditions."""
    if _has_captcha(page):
        raise ManualFallbackRequired("Captcha detected")
    if _has_login_wall(page):
        raise ManualFallbackRequired("Login wall detected")

    profile = _get_profile()
    filled: dict = {}

    for field, names in _FIELD_SELECTORS.items():
        value = profile.get(field, "")
        if not value:
            continue
        for name in names:
            loc = page.locator(f"input[name='{name}'], input[id='{name}']")
            if loc.count() > 0:
                loc.first.fill(str(value))
                filled[field] = value
                break

    resume_loc = page.locator("input[type='file'][name*='resume'], input[type='file'][accept*='.pdf']")
    if resume_loc.count() > 0:
        resume_loc.first.set_input_files(resume_pdf_path)
        filled["resume_uploaded"] = True

    cl_loc = page.locator("input[type='file'][name*='cover']")
    if cl_loc.count() > 0:
        cl_loc.first.set_input_files(cover_letter_path)
        filled["cover_letter_uploaded"] = True

    # Guard: require at least one identity field before firing submit
    if not any(f in filled for f in _REQUIRED_FILL_FIELDS):
        raise ManualFallbackRequired("No required fields (email, first_name, last_name) found on page")

    page.locator("[type=submit]").first.click()
    page.wait_for_load_state("networkidle", timeout=15000)

    # Some ATS platforms inject captchas or login walls only after submit
    if _has_captcha(page) or _has_login_wall(page):
        raise ManualFallbackRequired("Captcha or login wall appeared after submit")

    return filled


def _has_captcha(page) -> bool:
    return (
        page.query_selector("iframe[src*='recaptcha']") is not None
        or page.query_selector(".g-recaptcha") is not None
        or page.query_selector("iframe[src*='hcaptcha']") is not None
    )


def _has_login_wall(page) -> bool:
    return page.query_selector("input[type='password']") is not None


def _get_profile() -> dict:
    # delegates to cover_letter's identical helper to avoid duplication
    from src.agents.cover_letter import _fetch_user_profile
    return _fetch_user_profile()


def _build_receipt(
    job: JobItem,
    ats: str,
    submission_type: str,
    filled: dict,
    resume_pdf_path: str | None = None,
    cover_letter_path: str | None = None,
) -> dict:
    status = "applied" if submission_type == "auto" else "manual_pending"
    return {
        "job_url": job["job_url"],
        "title": job["title"],
        "company": job["company"],
        "ats_platform": ats,
        "fields_filled": filled,
        "resume_pdf_path": resume_pdf_path,
        "cover_letter_path": cover_letter_path,
        "submission_type": submission_type,
        "status": status,
    }


def _save_application(receipt: dict) -> None:
    db = get_client()
    try:
        db.table("applications").insert(receipt).execute()
    except Exception as e:
        post_error("apply_agent", str(e), {"job_url": receipt.get("job_url", "")})
        raise


def _manual_fallback(job: JobItem, ats: str, reason: str) -> dict:
    post_message(f"Manual application needed: {job['job_url']}\nReason: {reason}")
    receipt = _build_receipt(job, ats, "manual", {})
    try:
        _save_application(receipt)
    except Exception:
        pass  # Slack already alerted; don't crash graph node on DB failure
    return receipt
