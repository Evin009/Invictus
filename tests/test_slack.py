from unittest.mock import patch, MagicMock
from src.notifications.slack import post_message, post_error, post_summary


def test_post_message_sends_payload():
    with patch("urllib.request.urlopen") as mock_urlopen, \
         patch("src.notifications.slack.settings") as mock_settings:
        mock_settings.slack_webhook_url = "https://hooks.slack.com/test"
        mock_cm = MagicMock()
        mock_cm.__enter__ = lambda s: s
        mock_cm.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_cm
        post_message("hello test")
    assert mock_urlopen.called


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
