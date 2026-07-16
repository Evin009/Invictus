import pytest
from unittest.mock import MagicMock, patch

from src.agents.reply_tracker import (
    _classify_reply,
    _find_job_url,
    _save_reply,
    _update_application_status,
    _alert_if_notable,
    _build_relevant_query,
    _already_processed,
    scan_replies,
)

_CLASSIFICATIONS = [
    "interview_request",
    "rejection",
    "follow_up_needed",
    "recruiter_reply_to_outreach",
    "other",
]

_RAW_EMAIL = {
    "sender": "recruiter@acme.com",
    "subject": "Re: Quick note re: Software Engineer at Acme",
    "body": "Thanks for reaching out! We'd love to schedule a call.",
    "message_id": "msg-123",
}


# --- _classify_reply ---

def test_classify_reply_returns_valid_classification():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="interview_request")]
    with patch("src.agents.reply_tracker.anthropic.Anthropic", return_value=mock_client):
        result = _classify_reply("We'd love to chat", "When are you free?")
    assert result in _CLASSIFICATIONS


def test_classify_reply_includes_body_in_prompt():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="rejection")]
    with patch("src.agents.reply_tracker.anthropic.Anthropic", return_value=mock_client):
        _classify_reply("Unfortunately", "We went with another candidate.")
    call_content = mock_client.messages.create.call_args[1]["messages"][0]["content"]
    assert "We went with another candidate." in call_content


def test_classify_reply_unknown_label_falls_back_to_other():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="something_weird")]
    with patch("src.agents.reply_tracker.anthropic.Anthropic", return_value=mock_client):
        result = _classify_reply("Re:", "body text")
    assert result == "other"


def test_classify_reply_empty_response_returns_other():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = []
    with patch("src.agents.reply_tracker.anthropic.Anthropic", return_value=mock_client):
        result = _classify_reply("Re:", "body")
    assert result == "other"


# --- _find_job_url ---

def test_find_job_url_matches_sender_in_outreach_log():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"job_url": "https://boards.greenhouse.io/acme/jobs/123"}
    ]
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        result = _find_job_url("recruiter@acme.com")
    assert result == "https://boards.greenhouse.io/acme/jobs/123"


def test_find_job_url_returns_none_when_no_match():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        result = _find_job_url("unknown@nowhere.com")
    assert result is None


def test_find_job_url_strips_display_name_from_address():
    """Sender from Gmail From header ('Name <addr>') must match bare address in outreach_log."""
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"job_url": "https://boards.greenhouse.io/acme/jobs/99"}
    ]
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        result = _find_job_url("John Smith <recruiter@acme.com>")
    eq_call = mock_db.table.return_value.select.return_value.eq.call_args[0]
    assert eq_call[1] == "recruiter@acme.com"
    assert result == "https://boards.greenhouse.io/acme/jobs/99"


# --- _save_reply ---

def test_save_reply_inserts_to_reply_log():
    mock_db = MagicMock()
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        _save_reply(
            job_url="https://boards.greenhouse.io/acme/jobs/123",
            sender="recruiter@acme.com",
            subject="Re: SWE",
            body="Let's chat",
            classification="interview_request",
            channel="email",
            message_id="msg-abc",
        )
    mock_db.table.assert_called_with("reply_log")
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted["sender"] == "recruiter@acme.com"
    assert inserted["classification"] == "interview_request"
    assert inserted["channel"] == "email"
    assert inserted["message_id"] == "msg-abc"


def test_save_reply_accepts_null_job_url():
    mock_db = MagicMock()
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        _save_reply(
            job_url=None,
            sender="unknown@x.com",
            subject="Re:",
            body="Thanks",
            classification="other",
            channel="email",
        )
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted["job_url"] is None


# --- _update_application_status ---

def test_update_application_status_interview_sets_interview():
    mock_db = MagicMock()
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        _update_application_status("https://example.com/jobs/1", "interview_request")
    mock_db.table.assert_called_with("applications")
    mock_db.table.return_value.update.assert_called_once_with({"status": "interview"})


def test_update_application_status_rejection_sets_rejection():
    mock_db = MagicMock()
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        _update_application_status("https://example.com/jobs/1", "rejection")
    mock_db.table.return_value.update.assert_called_once_with({"status": "rejection"})


def test_update_application_status_other_skips_update():
    mock_db = MagicMock()
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        _update_application_status("https://example.com/jobs/1", "other")
    mock_db.table.return_value.update.assert_not_called()


def test_update_application_status_no_job_url_skips():
    mock_db = MagicMock()
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        _update_application_status(None, "interview_request")
    mock_db.table.assert_not_called()


# --- _alert_if_notable ---

def test_alert_if_notable_posts_on_interview():
    with patch("src.agents.reply_tracker.post_message") as mock_msg:
        _alert_if_notable("interview_request", "recruiter@acme.com", "Let's chat", "https://x.com/job/1")
    mock_msg.assert_called_once()
    assert "interview" in mock_msg.call_args[0][0].lower()


def test_alert_if_notable_posts_on_rejection():
    with patch("src.agents.reply_tracker.post_message") as mock_msg:
        _alert_if_notable("rejection", "hr@acme.com", "We went another way", "https://x.com/job/1")
    mock_msg.assert_called_once()
    assert "rejection" in mock_msg.call_args[0][0].lower()


def test_alert_if_notable_silent_on_other():
    with patch("src.agents.reply_tracker.post_message") as mock_msg:
        _alert_if_notable("other", "noreply@x.com", "Auto-reply", None)
    mock_msg.assert_not_called()


def test_alert_if_notable_silent_on_follow_up_needed():
    with patch("src.agents.reply_tracker.post_message") as mock_msg:
        _alert_if_notable("follow_up_needed", "hr@x.com", "Thanks for applying", None)
    mock_msg.assert_not_called()


# --- _build_relevant_query ---

def _mock_db_for_query(contact_emails=(), ats_platforms=()):
    mock_db = MagicMock()

    def table_side_effect(name):
        m = MagicMock()
        if name == "outreach_log":
            m.select.return_value.execute.return_value.data = [
                {"contact_email": e} for e in contact_emails
            ]
        elif name == "applications":
            m.select.return_value.execute.return_value.data = [
                {"ats_platform": p} for p in ats_platforms
            ]
        return m

    mock_db.table.side_effect = table_side_effect
    return mock_db


def test_build_relevant_query_none_when_nothing_to_search():
    mock_db = _mock_db_for_query()
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        result = _build_relevant_query()
    assert result is None


def test_build_relevant_query_includes_outreach_contacts():
    mock_db = _mock_db_for_query(contact_emails=["recruiter@acme.com"])
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        result = _build_relevant_query()
    assert result is not None
    assert "from:recruiter@acme.com" in result
    assert "is:unread" in result


def test_build_relevant_query_includes_ats_domains_when_applied():
    mock_db = _mock_db_for_query(ats_platforms=["greenhouse"])
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        result = _build_relevant_query()
    assert result is not None
    assert "from:greenhouse.io" in result


def test_build_relevant_query_manual_only_applications_excluded():
    mock_db = _mock_db_for_query(ats_platforms=["manual"])
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        result = _build_relevant_query()
    assert result is None


# --- _already_processed ---

def test_already_processed_true_when_message_id_found():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [{"id": "1"}]
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        assert _already_processed("msg-1") is True


def test_already_processed_false_when_not_found():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.agents.reply_tracker.get_client", return_value=mock_db):
        assert _already_processed("msg-1") is False


# --- scan_replies ---

_GMAIL_EMAILS = [
    {
        "sender": "recruiter@acme.com",
        "subject": "Re: Quick note",
        "body": "We'd love to schedule!",
        "message_id": "msg-1",
    }
]


def test_scan_replies_processes_emails_and_returns_list():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = []

    with patch("src.agents.reply_tracker._fetch_unread_emails", return_value=_GMAIL_EMAILS):
        with patch("src.agents.reply_tracker._classify_reply", return_value="interview_request"):
            with patch("src.agents.reply_tracker._find_job_url", return_value="https://x.com/job/1"):
                with patch("src.agents.reply_tracker._save_reply") as mock_save:
                    with patch("src.agents.reply_tracker._update_application_status") as mock_update:
                        with patch("src.agents.reply_tracker._alert_if_notable") as mock_alert:
                            result = scan_replies()

    assert len(result) == 1
    assert result[0]["classification"] == "interview_request"
    mock_save.assert_called_once()
    mock_update.assert_called_once()
    mock_alert.assert_called_once()


def test_scan_replies_no_emails_returns_empty():
    with patch("src.agents.reply_tracker._fetch_unread_emails", return_value=[]):
        result = scan_replies()
    assert result == []


def test_scan_replies_per_email_error_continues():
    emails = [
        {"sender": "bad@x.com", "subject": "Re:", "body": "body", "message_id": "1"},
        {"sender": "good@x.com", "subject": "Re:", "body": "body", "message_id": "2"},
    ]

    def classify_side_effect(subject, body):
        if "bad" in subject + body:
            raise RuntimeError("API error")
        return "other"

    with patch("src.agents.reply_tracker._fetch_unread_emails", return_value=emails):
        with patch("src.agents.reply_tracker._classify_reply", side_effect=RuntimeError("API error")):
            with patch("src.agents.reply_tracker._find_job_url", return_value=None):
                with patch("src.agents.reply_tracker.post_error") as mock_err:
                    result = scan_replies()
    # Both fail on classify, both skipped
    assert result == []
    assert mock_err.call_count == 2


def test_scan_replies_gmail_fetch_error_returns_empty_and_alerts():
    with patch("src.agents.reply_tracker._fetch_unread_emails", side_effect=Exception("Gmail auth")):
        with patch("src.agents.reply_tracker.post_error") as mock_err:
            result = scan_replies()
    assert result == []
    mock_err.assert_called_once()
