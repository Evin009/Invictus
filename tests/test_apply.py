import pytest
from unittest.mock import MagicMock, patch

from src.agents.apply import (
    ManualFallbackRequired,
    _build_receipt,
    _detect_ats_platform,
    _has_captcha,
    _has_login_wall,
    _save_application,
    apply_to_job,
)
from src.state import JobItem


def _job(**overrides) -> JobItem:
    base = JobItem(
        job_url="https://boards.greenhouse.io/acme/jobs/123",
        job_id="123",
        title="Software Engineer",
        company="Acme",
        source="greenhouse",
        description="Python engineer role",
        ats_platform="greenhouse",
        raw_json={},
    )
    return {**base, **overrides}


# --- _detect_ats_platform ---

def test_detect_greenhouse():
    assert _detect_ats_platform("https://boards.greenhouse.io/acme/jobs/123") == "greenhouse"


def test_detect_greenhouse_eu():
    assert _detect_ats_platform("https://boards.eu.greenhouse.io/acme/jobs/456") == "greenhouse"


def test_detect_lever():
    assert _detect_ats_platform("https://jobs.lever.co/acme/abc-123") == "lever"


def test_detect_ashby():
    assert _detect_ats_platform("https://jobs.ashbyhq.com/acme/role") == "ashby"


def test_detect_workday():
    assert _detect_ats_platform("https://acme.myworkdayjobs.com/en-US/jobs") == "workday"


def test_detect_workday_subdomain():
    assert _detect_ats_platform("https://acme.workday.com/jobs/apply") == "workday"


def test_detect_unknown_returns_manual():
    assert _detect_ats_platform("https://acme.com/careers/apply") == "manual"


def test_detect_preserves_query_params():
    url = "https://boards.greenhouse.io/acme/jobs/456?gh_src=ref&t=1"
    assert _detect_ats_platform(url) == "greenhouse"


# --- _has_captcha ---

def test_has_captcha_detects_recaptcha_iframe():
    page = MagicMock()
    page.query_selector.side_effect = lambda sel: MagicMock() if "recaptcha" in sel else None
    assert _has_captcha(page) is True


def test_has_captcha_detects_hcaptcha():
    page = MagicMock()
    page.query_selector.side_effect = lambda sel: MagicMock() if "hcaptcha" in sel else None
    assert _has_captcha(page) is True


def test_has_captcha_clean_page_returns_false():
    page = MagicMock()
    page.query_selector.return_value = None
    assert _has_captcha(page) is False


# --- _has_login_wall ---

def test_has_login_wall_detects_password_field():
    page = MagicMock()
    page.query_selector.return_value = MagicMock()
    assert _has_login_wall(page) is True


def test_has_login_wall_clean_page_returns_false():
    page = MagicMock()
    page.query_selector.return_value = None
    assert _has_login_wall(page) is False


# --- _build_receipt ---

def test_build_receipt_shape():
    job = _job()
    receipt = _build_receipt(job, "greenhouse", "auto", {"email": "e@e.com"}, "/r.pdf", "/c.txt")
    assert receipt["job_url"] == job["job_url"]
    assert receipt["title"] == job["title"]
    assert receipt["company"] == job["company"]
    assert receipt["ats_platform"] == "greenhouse"
    assert receipt["submission_type"] == "auto"
    assert receipt["status"] == "applied"
    assert receipt["fields_filled"]["email"] == "e@e.com"
    assert receipt["resume_pdf_path"] == "/r.pdf"
    assert receipt["cover_letter_path"] == "/c.txt"


def test_build_receipt_manual_status():
    job = _job()
    receipt = _build_receipt(job, "manual", "manual", {})
    assert receipt["submission_type"] == "manual"
    assert receipt["status"] == "manual_pending"
    assert receipt["resume_pdf_path"] is None
    assert receipt["cover_letter_path"] is None


# --- _save_application ---

def test_save_application_inserts_to_db():
    mock_db = MagicMock()
    receipt = {"job_url": "https://example.com", "title": "SWE", "company": "Acme"}
    with patch("src.agents.apply.get_client", return_value=mock_db):
        _save_application(receipt)
    mock_db.table.assert_called_once_with("applications")
    mock_db.table.return_value.insert.assert_called_once_with(receipt)


def test_save_application_raises_and_alerts_on_db_error():
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.side_effect = Exception("DB error")
    receipt = {"job_url": "https://example.com"}
    with patch("src.agents.apply.get_client", return_value=mock_db):
        with patch("src.agents.apply.post_error") as mock_err:
            with pytest.raises(Exception, match="DB error"):
                _save_application(receipt)
    mock_err.assert_called_once()


# --- Playwright mocks ---

def _make_playwright_mock():
    """Build sync_playwright() context manager mock returning a clean page (no captcha, no fields)."""
    mock_page = MagicMock()
    mock_page.query_selector.return_value = None  # no captcha, no login wall
    mock_page.locator.return_value.count.return_value = 0  # no matching form fields

    mock_browser = MagicMock()
    mock_browser.new_page.return_value = mock_page

    mock_p = MagicMock()
    mock_p.chromium.launch.return_value = mock_browser

    mock_cm = MagicMock()
    mock_cm.__enter__.return_value = mock_p
    mock_cm.__exit__.return_value = False

    return mock_cm, mock_page, mock_browser


def _profile():
    return {"email": "e@e.com", "first_name": "Evin", "last_name": "Bento"}


# --- apply_to_job ---

def test_apply_to_job_unknown_ats_triggers_manual_fallback():
    job = _job(job_url="https://acme.com/careers/apply", ats_platform="manual")
    mock_db = MagicMock()
    with patch("src.agents.apply.get_client", return_value=mock_db):
        with patch("src.agents.apply.post_message") as mock_msg:
            result = apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    assert result["submission_type"] == "manual"
    assert result["status"] == "manual_pending"
    mock_msg.assert_called_once()
    mock_db.table.return_value.insert.assert_called_once()


def test_apply_to_job_captcha_triggers_manual_fallback():
    job = _job()
    mock_cm, mock_page, _ = _make_playwright_mock()
    mock_page.query_selector.side_effect = lambda sel: MagicMock() if "recaptcha" in sel else None

    mock_db = MagicMock()
    with patch("src.agents.apply.sync_playwright", return_value=mock_cm):
        with patch("src.agents.apply.get_client", return_value=mock_db):
            with patch("src.agents.apply.post_message") as mock_msg:
                result = apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    assert result["submission_type"] == "manual"
    mock_msg.assert_called_once()


def test_apply_to_job_login_wall_triggers_manual_fallback():
    job = _job()
    mock_cm, mock_page, _ = _make_playwright_mock()
    mock_page.query_selector.side_effect = lambda sel: MagicMock() if "password" in sel else None

    mock_db = MagicMock()
    with patch("src.agents.apply.sync_playwright", return_value=mock_cm):
        with patch("src.agents.apply.get_client", return_value=mock_db):
            with patch("src.agents.apply.post_message") as mock_msg:
                result = apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    assert result["submission_type"] == "manual"
    mock_msg.assert_called_once()


def test_apply_to_job_no_required_fields_triggers_manual_fallback():
    # count=0 means no fields found; empty profile means filled stays {}; guard fires
    job = _job()
    mock_cm, mock_page, _ = _make_playwright_mock()

    mock_db = MagicMock()
    with patch("src.agents.apply.sync_playwright", return_value=mock_cm):
        with patch("src.agents.apply.get_client", return_value=mock_db):
            with patch("src.agents.apply._get_profile", return_value={}):
                with patch("src.agents.apply.post_message") as mock_msg:
                    result = apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    assert result["submission_type"] == "manual"
    mock_msg.assert_called_once()


def test_apply_to_job_post_submit_captcha_triggers_manual_fallback():
    # pre-submit: clean; locator fills email; post-submit: recaptcha appears
    job = _job()
    mock_cm, mock_page, _ = _make_playwright_mock()
    mock_page.locator.return_value.count.return_value = 1
    # 4 None = pre-submit captcha(3) + login_wall(1); then MagicMock = post-submit recaptcha
    mock_page.query_selector.side_effect = [None, None, None, None, MagicMock()]

    mock_db = MagicMock()
    with patch("src.agents.apply.sync_playwright", return_value=mock_cm):
        with patch("src.agents.apply.get_client", return_value=mock_db):
            with patch("src.agents.apply._get_profile", return_value=_profile()):
                with patch("src.agents.apply.post_message") as mock_msg:
                    result = apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    assert result["submission_type"] == "manual"
    mock_msg.assert_called_once()


def test_apply_to_job_success_saves_to_db():
    job = _job()
    mock_cm, mock_page, _ = _make_playwright_mock()
    mock_page.locator.return_value.count.return_value = 1  # form fields found

    mock_db = MagicMock()
    with patch("src.agents.apply.sync_playwright", return_value=mock_cm):
        with patch("src.agents.apply.get_client", return_value=mock_db):
            with patch("src.agents.apply._get_profile", return_value=_profile()):
                result = apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    assert result["submission_type"] == "auto"
    assert result["status"] == "applied"
    assert result["resume_pdf_path"] == "/tmp/resume.pdf"
    assert result["cover_letter_path"] == "/tmp/cover.txt"
    mock_db.table.return_value.insert.assert_called_once()


def test_apply_to_job_success_fills_profile_fields():
    job = _job()
    mock_cm, mock_page, _ = _make_playwright_mock()
    mock_page.locator.return_value.count.return_value = 1

    mock_db = MagicMock()
    with patch("src.agents.apply.sync_playwright", return_value=mock_cm):
        with patch("src.agents.apply.get_client", return_value=mock_db):
            with patch("src.agents.apply._get_profile", return_value=_profile()):
                result = apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    assert "email" in result["fields_filled"]


def test_apply_to_job_unexpected_error_alerts_and_reraises():
    job = _job()
    mock_cm = MagicMock()
    mock_cm.__enter__.side_effect = RuntimeError("Network down")
    mock_cm.__exit__.return_value = False

    with patch("src.agents.apply.sync_playwright", return_value=mock_cm):
        with patch("src.agents.apply.post_error") as mock_err:
            with pytest.raises(RuntimeError, match="Network down"):
                apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    mock_err.assert_called_once()


def test_apply_to_job_manual_fallback_saves_to_db():
    job = _job(job_url="https://unknown.com/jobs/123")
    mock_db = MagicMock()
    with patch("src.agents.apply.get_client", return_value=mock_db):
        with patch("src.agents.apply.post_message"):
            apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    mock_db.table.return_value.insert.assert_called_once()
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted["status"] == "manual_pending"
    assert inserted["submission_type"] == "manual"


def test_apply_to_job_manual_fallback_db_error_does_not_crash():
    # _save_application raises, but _manual_fallback swallows it and returns receipt
    job = _job(job_url="https://unknown.com/jobs/123")
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.side_effect = Exception("DB down")
    with patch("src.agents.apply.get_client", return_value=mock_db):
        with patch("src.agents.apply.post_message"):
            with patch("src.agents.apply.post_error"):
                result = apply_to_job(job, "/tmp/resume.pdf", "/tmp/cover.txt")
    assert result["submission_type"] == "manual"
