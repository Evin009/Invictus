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


class ManualFallbackRequired(Exception):
    pass


def _detect_ats_platform(job_url: str) -> str:
    for platform, domains in _ATS_DOMAINS.items():
        if any(domain in job_url for domain in domains):
            return platform
    return "manual"


def apply_to_job(job: JobItem, resume_pdf_path: str, cover_letter_path: str) -> dict:
    """
    Fill ATS form for job via browser automation.
    On captcha, login wall, or unrecognized platform: Slack alert + return manual receipt.
    """
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
                receipt = _build_receipt(job, ats, "auto", filled)
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
        filled["resume_path"] = resume_pdf_path

    cl_loc = page.locator("input[type='file'][name*='cover']")
    if cl_loc.count() > 0:
        cl_loc.first.set_input_files(cover_letter_path)
        filled["cover_letter_path"] = cover_letter_path

    page.locator("[type=submit]").first.click()
    page.wait_for_load_state("networkidle", timeout=15000)

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
    db = get_client()
    rows = db.table("user_profile").select("*").limit(1).execute().data or []
    return rows[0] if rows else {}


def _build_receipt(job: JobItem, ats: str, submission_type: str, filled: dict) -> dict:
    return {
        "job_url": job["job_url"],
        "title": job["title"],
        "company": job["company"],
        "ats_platform": ats,
        "fields_filled": filled,
        "submission_type": submission_type,
        "status": "applied",
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
    _save_application(receipt)
    return receipt
