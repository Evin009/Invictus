from unittest.mock import patch, MagicMock
from src.notifications.slack import post_message, post_error, post_summary


def _mock_db_with_webhook(url: str | None):
    mock_db = MagicMock()
    data = [{"webhook_url": url}] if url else []
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = data
    return mock_db


def test_post_message_sends_payload():
    with patch("urllib.request.urlopen") as mock_urlopen, \
         patch("src.db.client.get_client", return_value=_mock_db_with_webhook("https://hooks.slack.com/test")):
        mock_cm = MagicMock()
        mock_cm.__enter__ = lambda s: s
        mock_cm.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_cm
        post_message("hello test")
    assert mock_urlopen.called


def test_post_message_noop_when_not_connected():
    with patch("urllib.request.urlopen") as mock_urlopen, \
         patch("src.db.client.get_client", return_value=_mock_db_with_webhook(None)):
        post_message("hello test")
    assert not mock_urlopen.called


def test_post_error_includes_agent_and_error():
    with patch("src.notifications.slack.post_message") as mock_post:
        post_error("search_agent", "timeout", {"job_url": "https://example.com"})
        call_text = mock_post.call_args[0][0]
    assert "search_agent" in call_text
    assert "timeout" in call_text


def test_post_summary_includes_all_keys():
    with patch("src.notifications.slack.post_message") as mock_post:
        post_summary({"Jobs found": 5, "Applied": 2})
        call_text = mock_post.call_args[0][0]
    assert "Jobs found" in call_text
    assert "Applied" in call_text
