from unittest.mock import MagicMock, patch, call

from src.agents.reporter import generate_report, _fetch_stats, _save_run_log


# --- _fetch_stats ---

def _mock_db_with_counts(jobs_seen=5, applied=3, manual=1, interviews=1, rejections=0, replies=2, outreach=4):
    mock_db = MagicMock()

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "jobs_seen":
            mock_table.select.return_value.gte.return_value.execute.return_value.data = [{}] * jobs_seen
        elif table_name == "applications":
            def apps_select(*args):
                mock_sel = MagicMock()
                def apps_neq(col, val):
                    m = MagicMock()
                    m.gte.return_value.execute.return_value.data = [{}] * applied
                    return m
                def apps_eq(col, val):
                    m = MagicMock()
                    if val == "manual_pending":
                        m.gte.return_value.execute.return_value.data = [{}] * manual
                    elif val == "interview":
                        m.gte.return_value.execute.return_value.data = [{}] * interviews
                    elif val == "rejection":
                        m.gte.return_value.execute.return_value.data = [{}] * rejections
                    else:
                        m.gte.return_value.execute.return_value.data = []
                    return m
                mock_sel.neq = apps_neq
                mock_sel.eq = apps_eq
                return mock_sel
            mock_table.select = apps_select
        elif table_name == "reply_log":
            mock_table.select.return_value.gte.return_value.execute.return_value.data = [{}] * replies
        elif table_name == "outreach_log":
            mock_table.select.return_value.gte.return_value.execute.return_value.data = [{}] * outreach
        return mock_table

    mock_db.table.side_effect = table_side_effect
    return mock_db


_SINCE = "2026-06-26T00:00:00+00:00"


def test_fetch_stats_returns_expected_keys():
    mock_db = _mock_db_with_counts()
    with patch("src.agents.reporter.get_client", return_value=mock_db):
        stats = _fetch_stats(_SINCE)
    assert "jobs_discovered" in stats
    assert "applied" in stats
    assert "manual_pending" in stats
    assert "interviews" in stats
    assert "rejections" in stats
    assert "replies" in stats
    assert "outreach_sent" in stats


def test_fetch_stats_counts_are_correct():
    mock_db = _mock_db_with_counts(jobs_seen=10, applied=4, manual=2, interviews=1, rejections=1, replies=3, outreach=6)
    with patch("src.agents.reporter.get_client", return_value=mock_db):
        stats = _fetch_stats(_SINCE)
    assert stats["jobs_discovered"] == 10
    assert stats["outreach_sent"] == 6
    assert stats["replies"] == 3


# --- generate_report ---

def test_generate_report_posts_slack_summary():
    mock_db = _mock_db_with_counts()
    with patch("src.agents.reporter.get_client", return_value=mock_db):
        with patch("src.agents.reporter.post_summary") as mock_sum:
            result = generate_report(since=_SINCE)
    mock_sum.assert_called_once()
    args = mock_sum.call_args[0][0]
    assert isinstance(args, dict)


def test_generate_report_returns_stats_dict():
    mock_db = _mock_db_with_counts(jobs_seen=7, applied=3)
    with patch("src.agents.reporter.get_client", return_value=mock_db):
        with patch("src.agents.reporter.post_summary"):
            result = generate_report(since=_SINCE)
    assert result["jobs_discovered"] == 7
    assert result["applied"] == 3


def test_generate_report_db_error_alerts_and_returns_empty():
    mock_db = MagicMock()
    mock_db.table.side_effect = Exception("DB error")
    with patch("src.agents.reporter.get_client", return_value=mock_db):
        with patch("src.agents.reporter.post_error") as mock_err:
            with patch("src.agents.reporter.post_summary"):
                result = generate_report(since=_SINCE)
    mock_err.assert_called_once()
    assert result == {}


# --- _save_run_log ---

def test_save_run_log_inserts_stats():
    mock_db = MagicMock()
    stats = {
        "jobs_discovered": 7, "applied": 3, "manual_pending": 1,
        "interviews": 2, "rejections": 0, "replies": 1, "outreach_sent": 4,
    }
    with patch("src.agents.reporter.get_client", return_value=mock_db):
        _save_run_log(stats)
    mock_db.table.assert_called_once_with("run_log")
    payload = mock_db.table.return_value.insert.call_args[0][0]
    assert payload == stats


def test_save_run_log_alerts_and_swallows_db_error():
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.side_effect = Exception("DB error")
    with patch("src.agents.reporter.get_client", return_value=mock_db):
        with patch("src.agents.reporter.post_error") as mock_err:
            _save_run_log({"jobs_discovered": 1})
    mock_err.assert_called_once()


def test_generate_report_saves_run_log():
    mock_db = _mock_db_with_counts()
    with patch("src.agents.reporter.get_client", return_value=mock_db):
        with patch("src.agents.reporter.post_summary"):
            with patch("src.agents.reporter._save_run_log") as mock_save:
                generate_report(since=_SINCE)
    mock_save.assert_called_once()


def test_generate_report_defaults_to_last_24h():
    """generate_report with no since arg uses a 24h lookback, not all-time."""
    mock_db = _mock_db_with_counts()
    with patch("src.agents.reporter.get_client", return_value=mock_db):
        with patch("src.agents.reporter.post_summary"):
            with patch("src.agents.reporter._fetch_stats", return_value={}) as mock_fetch:
                generate_report()
    called_since = mock_fetch.call_args[0][0]
    # Should be an ISO timestamp string, not None
    assert called_since is not None
    assert "T" in called_since  # ISO format
