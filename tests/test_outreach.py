import json
import pytest
from unittest.mock import MagicMock, patch, call

from src.agents.outreach import (
    _draft_message,
    _extract_domain,
    _fetch_outreach_seed,
    _find_contacts,
    _is_on_cooldown,
    _log_outreach,
    _post_linkedin_draft,
    _send_email,
    run_outreach,
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


def _contact(**overrides) -> dict:
    base = {
        "name": "Jane Smith",
        "email": "jane@acme.com",
        "linkedin_url": "https://linkedin.com/in/janesmith",
        "title": "Engineering Manager",
    }
    return {**base, **overrides}


_HUNTER_RESPONSE = {
    "data": {
        "emails": [
            {
                "value": "jane@acme.com",
                "first_name": "Jane",
                "last_name": "Smith",
                "position": "Engineering Manager",
                "linkedin": "https://linkedin.com/in/janesmith",
            },
            {
                "value": "bob@acme.com",
                "first_name": "Bob",
                "last_name": "Jones",
                "position": "Recruiter",
                "linkedin": "",
            },
        ]
    }
}


# --- _extract_domain ---

def test_extract_domain_greenhouse_url():
    assert _extract_domain("https://boards.greenhouse.io/acme/jobs/123") == "boards.greenhouse.io"


def test_extract_domain_standard_url():
    assert _extract_domain("https://acme.com/careers") == "acme.com"


def test_extract_domain_strips_www():
    assert _extract_domain("https://www.acme.com/jobs") == "acme.com"


def test_extract_domain_empty_url():
    assert _extract_domain("") == ""


def test_extract_domain_no_scheme():
    assert _extract_domain("not-a-url") == ""


# --- _find_contacts ---

def test_find_contacts_returns_contacts_from_hunter():
    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(_HUNTER_RESPONSE).encode()
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = MagicMock(return_value=False)

    with patch("src.agents.outreach.settings") as mock_settings:
        mock_settings.hunter_api_key = "test-key"
        with patch("src.agents.outreach.urllib.request.urlopen", return_value=mock_resp):
            contacts = _find_contacts(_job())

    assert len(contacts) == 2
    assert contacts[0]["email"] == "jane@acme.com"
    assert contacts[0]["name"] == "Jane Smith"
    assert contacts[0]["title"] == "Engineering Manager"
    assert contacts[0]["linkedin_url"] == "https://linkedin.com/in/janesmith"


def test_find_contacts_no_api_key_returns_empty():
    with patch("src.agents.outreach.settings") as mock_settings:
        mock_settings.hunter_api_key = ""
        contacts = _find_contacts(_job())
    assert contacts == []


def test_find_contacts_http_error_returns_empty_and_alerts():
    with patch("src.agents.outreach.settings") as mock_settings:
        mock_settings.hunter_api_key = "test-key"
        with patch("src.agents.outreach.urllib.request.urlopen", side_effect=Exception("timeout")):
            with patch("src.agents.outreach.post_error") as mock_err:
                contacts = _find_contacts(_job())
    assert contacts == []
    mock_err.assert_called_once()


def test_find_contacts_filters_entries_without_email():
    response = {"data": {"emails": [{"first_name": "No", "last_name": "Email"}]}}
    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(response).encode()
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = MagicMock(return_value=False)

    with patch("src.agents.outreach.settings") as mock_settings:
        mock_settings.hunter_api_key = "key"
        with patch("src.agents.outreach.urllib.request.urlopen", return_value=mock_resp):
            contacts = _find_contacts(_job())
    assert contacts == []


# --- _is_on_cooldown ---

def test_is_on_cooldown_true_when_recent_outreach():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.gte.return_value.limit.return_value.execute.return_value.data = [{"id": "abc"}]
    with patch("src.agents.outreach.get_client", return_value=mock_db):
        assert _is_on_cooldown("jane@acme.com") is True


def test_is_on_cooldown_false_when_no_recent_outreach():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.gte.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.agents.outreach.get_client", return_value=mock_db):
        assert _is_on_cooldown("jane@acme.com") is False


def test_is_on_cooldown_false_for_empty_email():
    assert _is_on_cooldown("") is False


# --- _fetch_outreach_seed ---

def test_fetch_outreach_seed_returns_content():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [{"content": "Hi there"}]
    with patch("src.agents.outreach.get_client", return_value=mock_db):
        assert _fetch_outreach_seed() == "Hi there"


def test_fetch_outreach_seed_returns_empty_when_none():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.agents.outreach.get_client", return_value=mock_db):
        assert _fetch_outreach_seed() == ""


# --- _draft_message ---

def test_draft_message_calls_claude_with_job_context():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="Hey Jane, saw the SWE role at Acme...")]
    with patch("src.agents.outreach.anthropic.Anthropic", return_value=mock_client):
        result = _draft_message(_contact(), _job(), "Tone: conversational")
    assert result == "Hey Jane, saw the SWE role at Acme..."
    call_content = mock_client.messages.create.call_args[1]["messages"][0]["content"]
    assert "Acme" in call_content
    assert "Software Engineer" in call_content


def test_draft_message_empty_response_returns_empty_string():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = []
    with patch("src.agents.outreach.anthropic.Anthropic", return_value=mock_client):
        result = _draft_message(_contact(), _job(), "")
    assert result == ""


def test_draft_message_includes_seed_in_prompt():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="msg")]
    with patch("src.agents.outreach.anthropic.Anthropic", return_value=mock_client):
        _draft_message(_contact(), _job(), seed="Match this tone")
    call_content = mock_client.messages.create.call_args[1]["messages"][0]["content"]
    assert "Match this tone" in call_content


# --- _post_linkedin_draft ---

def test_post_linkedin_draft_posts_to_slack():
    with patch("src.agents.outreach.post_message") as mock_msg:
        _post_linkedin_draft(_contact(), "Hello Jane", _job())
    mock_msg.assert_called_once()
    posted = mock_msg.call_args[0][0]
    assert "Jane Smith" in posted
    assert "https://linkedin.com/in/janesmith" in posted
    assert "Hello Jane" in posted


def test_post_linkedin_draft_handles_missing_name():
    contact = _contact(name="", linkedin_url="https://linkedin.com/in/x")
    with patch("src.agents.outreach.post_message") as mock_msg:
        _post_linkedin_draft(contact, "Hey", _job())
    mock_msg.assert_called_once()


# --- _log_outreach ---

def test_log_outreach_inserts_correct_fields():
    mock_db = MagicMock()
    with patch("src.agents.outreach.get_client", return_value=mock_db):
        _log_outreach(_contact(), "Hello Jane", _job(), "email")
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted["job_url"] == _job()["job_url"]
    assert inserted["company"] == "Acme"
    assert inserted["contact_email"] == "jane@acme.com"
    assert inserted["channel"] == "email"
    assert inserted["message_text"] == "Hello Jane"


def test_log_outreach_linkedin_channel():
    mock_db = MagicMock()
    with patch("src.agents.outreach.get_client", return_value=mock_db):
        _log_outreach(_contact(), "Hi", _job(), "linkedin")
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted["channel"] == "linkedin"
    assert inserted["contact_linkedin"] == "https://linkedin.com/in/janesmith"


# --- run_outreach ---

def _mock_outreach_deps(contacts, seed="", cooldown=False):
    """Return a context-manager stack of common patches."""
    return [
        patch("src.agents.outreach._find_contacts", return_value=contacts),
        patch("src.agents.outreach._fetch_outreach_seed", return_value=seed),
        patch("src.agents.outreach._is_on_cooldown", return_value=cooldown),
        patch("src.agents.outreach._draft_message", return_value="Hey there"),
        patch("src.agents.outreach._send_email"),
        patch("src.agents.outreach._post_linkedin_draft"),
        patch("src.agents.outreach._log_outreach"),
    ]


def test_run_outreach_no_contacts_returns_zero():
    job = _job()
    patches = _mock_outreach_deps([])
    with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6]:
        result = run_outreach(job)
    assert result["contacts_reached"] == 0
    assert result["job_url"] == job["job_url"]


def test_run_outreach_cooldown_contact_is_skipped():
    job = _job()
    patches = _mock_outreach_deps([_contact()], cooldown=True)
    with patches[0], patches[1], patches[2], patches[3] as mock_draft, patches[4], patches[5], patches[6]:
        result = run_outreach(job)
    assert result["contacts_reached"] == 0
    mock_draft.assert_not_called()


def test_run_outreach_email_contact_sends_and_logs():
    job = _job()
    contact = _contact(linkedin_url="")
    patches = _mock_outreach_deps([contact])
    with patches[0], patches[1], patches[2], patches[3], patches[4] as mock_send, patches[5] as mock_li, patches[6] as mock_log:
        result = run_outreach(job)
    assert result["contacts_reached"] == 1
    mock_send.assert_called_once()
    mock_li.assert_not_called()
    mock_log.assert_called_once_with(contact, "Hey there", job, "email")


def test_run_outreach_linkedin_contact_posts_draft_and_logs():
    job = _job()
    contact = _contact(email="")
    patches = _mock_outreach_deps([contact])
    with patches[0], patches[1], patches[2], patches[3], patches[4] as mock_send, patches[5] as mock_li, patches[6] as mock_log:
        result = run_outreach(job)
    assert result["contacts_reached"] == 1
    mock_send.assert_not_called()
    mock_li.assert_called_once()
    mock_log.assert_called_once_with(contact, "Hey there", job, "linkedin")


def test_run_outreach_both_channels_sends_and_drafts():
    job = _job()
    contact = _contact()  # has both email and linkedin
    patches = _mock_outreach_deps([contact])
    with patches[0], patches[1], patches[2], patches[3], patches[4] as mock_send, patches[5] as mock_li, patches[6] as mock_log:
        result = run_outreach(job)
    assert result["contacts_reached"] == 1
    mock_send.assert_called_once()
    mock_li.assert_called_once()
    assert mock_log.call_count == 2


def test_run_outreach_contact_error_continues_to_next():
    job = _job()
    contacts = [_contact(email="bad@acme.com"), _contact(email="good@acme.com")]

    call_count = {"n": 0}

    def side_effect(c, msg, j):
        call_count["n"] += 1
        if c["email"] == "bad@acme.com":
            raise RuntimeError("Gmail failure")

    patches = _mock_outreach_deps(contacts)
    with patches[0], patches[1], patches[2], patches[3], \
         patch("src.agents.outreach._send_email", side_effect=side_effect), \
         patches[5], patches[6], \
         patch("src.agents.outreach.post_error") as mock_err:
        result = run_outreach(job)
    assert result["contacts_reached"] == 1
    mock_err.assert_called_once()


def test_run_outreach_hunter_error_returns_zero_reached():
    job = _job()
    with patch("src.agents.outreach._find_contacts", return_value=[]):
        with patch("src.agents.outreach._fetch_outreach_seed", return_value=""):
            result = run_outreach(job)
    assert result["contacts_reached"] == 0
