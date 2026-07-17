from unittest.mock import MagicMock, patch

from src.graph import (
    discovery_node,
    filter_node,
    tailor_node,
    apply_node,
    outreach_node,
    reply_track_node,
    report_node,
    build_graph,
)

_JOB = {
    "job_url": "https://boards.greenhouse.io/acme/jobs/1",
    "title": "SWE",
    "company": "Acme",
    "description": "Python dev",
    "source": "search",
}

_WATCHLIST_JOB = {**_JOB, "job_url": "https://boards.greenhouse.io/acme/jobs/watchlist", "source": "watchlist"}
_SEARCH_JOB = {**_JOB, "job_url": "https://boards.greenhouse.io/acme/jobs/search", "source": "search"}


# --- discovery_node ---

def test_discovery_node_always_runs_watchlist():
    state = {"jobs_discovered": []}
    with patch("src.graph.watchlist_agent", return_value={"jobs_discovered": [_WATCHLIST_JOB]}) as mock_watch:
        with patch("src.graph._should_run_search_scan", return_value=False):
            result = discovery_node(state)
    mock_watch.assert_called_once()
    assert result["jobs_discovered"] == [_WATCHLIST_JOB]


def test_discovery_node_skips_search_tier_when_not_due():
    state = {"jobs_discovered": []}
    with patch("src.graph.watchlist_agent", return_value={"jobs_discovered": []}):
        with patch("src.graph._should_run_search_scan", return_value=False):
            with patch("src.graph.search_agent") as mock_search:
                with patch("src.graph._mark_scan_run") as mock_mark:
                    discovery_node(state)
    mock_search.assert_not_called()
    mock_mark.assert_not_called()


def test_discovery_node_runs_search_tier_when_due():
    state = {"jobs_discovered": []}
    with patch("src.graph.watchlist_agent", return_value={"jobs_discovered": [_WATCHLIST_JOB]}):
        with patch("src.graph._should_run_search_scan", return_value=True):
            with patch("src.graph.search_agent", return_value={"jobs_discovered": [_SEARCH_JOB]}) as mock_search:
                with patch("src.graph._mark_scan_run") as mock_mark:
                    result = discovery_node(state)
    mock_search.assert_called_once()
    mock_mark.assert_called_once_with("last_search_scan_at")
    urls = {j["job_url"] for j in result["jobs_discovered"]}
    assert urls == {_WATCHLIST_JOB["job_url"], _SEARCH_JOB["job_url"]}


def test_discovery_node_dedupes_overlapping_urls():
    state = {"jobs_discovered": []}
    with patch("src.graph.watchlist_agent", return_value={"jobs_discovered": [_JOB]}):
        with patch("src.graph._should_run_search_scan", return_value=True):
            with patch("src.graph.search_agent", return_value={"jobs_discovered": [_JOB]}):
                with patch("src.graph._mark_scan_run"):
                    result = discovery_node(state)
    assert len(result["jobs_discovered"]) == 1


def test_discovery_node_watchlist_error_continues_to_search_tier():
    state = {"jobs_discovered": []}
    with patch("src.graph.watchlist_agent", side_effect=RuntimeError("scrape failed")):
        with patch("src.graph._should_run_search_scan", return_value=True):
            with patch("src.graph.search_agent", return_value={"jobs_discovered": [_SEARCH_JOB]}):
                with patch("src.graph._mark_scan_run"):
                    with patch("src.graph.post_error") as mock_err:
                        result = discovery_node(state)
    assert result["jobs_discovered"] == [_SEARCH_JOB]
    mock_err.assert_called_once()


def test_discovery_node_search_agent_error_keeps_watchlist_results():
    state = {"jobs_discovered": []}
    with patch("src.graph.watchlist_agent", return_value={"jobs_discovered": [_WATCHLIST_JOB]}):
        with patch("src.graph._should_run_search_scan", return_value=True):
            with patch("src.graph.search_agent", side_effect=RuntimeError("api down")):
                with patch("src.graph._mark_scan_run"):
                    with patch("src.graph.post_error") as mock_err:
                        result = discovery_node(state)
    assert result["jobs_discovered"] == [_WATCHLIST_JOB]
    mock_err.assert_called_once()


def test_discovery_node_check_scan_due_error_skips_search_tier():
    state = {"jobs_discovered": []}
    with patch("src.graph.watchlist_agent", return_value={"jobs_discovered": [_WATCHLIST_JOB]}):
        with patch("src.graph._should_run_search_scan", side_effect=RuntimeError("db down")):
            with patch("src.graph.search_agent") as mock_search:
                with patch("src.graph.post_error") as mock_err:
                    result = discovery_node(state)
    mock_search.assert_not_called()
    assert result["jobs_discovered"] == [_WATCHLIST_JOB]
    mock_err.assert_called_once()


# --- filter_node ---

def test_filter_node_returns_jobs_filtered_key():
    state = {"jobs_discovered": [_JOB], "jobs_filtered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.graph.preference_filter", return_value=[_JOB]):
            with patch("src.graph.dedup_filter", return_value=[_JOB]):
                result = filter_node(state)
    assert "jobs_filtered" in result
    assert result["jobs_filtered"] == [_JOB]


def test_filter_node_db_error_uses_empty_prefs():
    state = {"jobs_discovered": [_JOB]}
    mock_db = MagicMock()
    mock_db.table.side_effect = Exception("DB down")
    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.graph.preference_filter", return_value=[_JOB]) as mock_pf:
            with patch("src.graph.dedup_filter", return_value=[_JOB]):
                with patch("src.graph.post_error"):
                    result = filter_node(state)
    mock_pf.assert_called_once_with([_JOB], {})


def test_filter_node_get_client_error_uses_empty_prefs():
    """get_client() is now inside try — a connection failure should not crash the graph."""
    state = {"jobs_discovered": [_JOB]}
    with patch("src.db.client.get_client", side_effect=Exception("conn refused")):
        with patch("src.graph.preference_filter", return_value=[_JOB]) as mock_pf:
            with patch("src.graph.dedup_filter", return_value=[_JOB]):
                with patch("src.graph.post_error"):
                    result = filter_node(state)
    mock_pf.assert_called_once_with([_JOB], {})


def test_filter_node_empty_discovered_returns_empty():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.graph.preference_filter", return_value=[]):
            with patch("src.graph.dedup_filter", return_value=[]):
                result = filter_node(state)
    assert result["jobs_filtered"] == []


# --- tailor_node ---

def test_tailor_node_returns_tailored_jobs():
    job_w_paths = {**_JOB, "resume_pdf_path": "/tmp/r.pdf", "cover_letter_path": "/tmp/c.pdf"}
    state = {"jobs_filtered": [_JOB]}
    with patch("src.graph.fetch_base_resume_tex", return_value="base tex"):
        with patch("src.graph.tailor_resume", return_value={"resume_pdf_path": "/tmp/r.pdf"}):
            with patch("src.graph.generate_cover_letter", return_value={"cover_letter_path": "/tmp/c.pdf"}):
                result = tailor_node(state)
    assert len(result["jobs_tailored"]) == 1
    assert result["jobs_tailored"][0]["resume_pdf_path"] == "/tmp/r.pdf"


def test_tailor_node_per_job_error_continues():
    state = {"jobs_filtered": [_JOB, _JOB]}
    call_count = {"n": 0}

    def tailor_side(job, base_tex_content):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("compile failed")
        return {"resume_pdf_path": "/tmp/r.pdf"}

    with patch("src.graph.fetch_base_resume_tex", return_value="base tex"):
        with patch("src.graph.tailor_resume", side_effect=tailor_side):
            with patch("src.graph.generate_cover_letter", return_value={"cover_letter_path": "/tmp/c.pdf"}):
                with patch("src.graph.post_error"):
                    result = tailor_node(state)
    assert len(result["jobs_tailored"]) == 1


def test_tailor_node_returns_empty_when_base_resume_missing():
    state = {"jobs_filtered": [_JOB]}
    with patch("src.graph.fetch_base_resume_tex", side_effect=RuntimeError("no resume_document")):
        with patch("src.graph.post_error") as mock_err:
            result = tailor_node(state)
    assert result["jobs_tailored"] == []
    mock_err.assert_called_once()


# --- apply_node ---

def test_apply_node_returns_applied_jobs():
    state = {"jobs_tailored": [{**_JOB, "resume_pdf_path": "/tmp/r.pdf", "cover_letter_path": "/tmp/c.pdf"}]}
    receipt = {**_JOB, "status": "applied", "submission_type": "auto"}
    with patch("src.graph.fetch_agent_settings", return_value={"paused": False, "daily_cap": None}):
        with patch("src.graph.apply_to_job", return_value=receipt):
            result = apply_node(state)
    assert len(result["jobs_applied"]) == 1
    assert result["jobs_applied"][0]["status"] == "applied"


def test_apply_node_per_job_error_continues():
    state = {"jobs_tailored": [_JOB, _JOB]}
    call_count = {"n": 0}

    def apply_side(job, resume, cover):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("playwright crash")
        return {**job, "status": "applied"}

    with patch("src.graph.fetch_agent_settings", return_value={"paused": False, "daily_cap": None}):
        with patch("src.graph.apply_to_job", side_effect=apply_side):
            with patch("src.graph.post_error"):
                result = apply_node(state)
    assert len(result["jobs_applied"]) == 1


def test_apply_node_paused_skips_all_applications():
    state = {"jobs_tailored": [_JOB, _JOB]}
    with patch("src.graph.fetch_agent_settings", return_value={"paused": True, "daily_cap": None}):
        with patch("src.graph.apply_to_job") as mock_apply:
            result = apply_node(state)
    assert result["jobs_applied"] == []
    mock_apply.assert_not_called()


def test_apply_node_stops_at_daily_cap():
    state = {"jobs_tailored": [_JOB, _JOB, _JOB]}
    with patch("src.graph.fetch_agent_settings", return_value={"paused": False, "daily_cap": 2}):
        with patch("src.graph.count_applications_today", return_value=0):
            with patch("src.graph.apply_to_job", return_value={**_JOB, "status": "applied"}) as mock_apply:
                result = apply_node(state)
    assert len(result["jobs_applied"]) == 2
    assert mock_apply.call_count == 2


def test_apply_node_daily_cap_already_reached_skips_all():
    state = {"jobs_tailored": [_JOB]}
    with patch("src.graph.fetch_agent_settings", return_value={"paused": False, "daily_cap": 5}):
        with patch("src.graph.count_applications_today", return_value=5):
            with patch("src.graph.apply_to_job") as mock_apply:
                result = apply_node(state)
    assert result["jobs_applied"] == []
    mock_apply.assert_not_called()


def test_apply_node_settings_fetch_error_defaults_to_running():
    state = {"jobs_tailored": [_JOB]}
    with patch("src.graph.fetch_agent_settings", side_effect=RuntimeError("db down")):
        with patch("src.graph.post_error") as mock_err:
            with patch("src.graph.apply_to_job", return_value={**_JOB, "status": "applied"}):
                result = apply_node(state)
    assert len(result["jobs_applied"]) == 1
    mock_err.assert_called_once()


# --- outreach_node ---

def test_outreach_node_returns_outreached_jobs():
    state = {"jobs_applied": [_JOB]}
    with patch("src.graph.run_outreach", return_value={"contacts_reached": 2, "job_url": _JOB["job_url"]}):
        result = outreach_node(state)
    assert len(result["jobs_outreached"]) == 1
    assert result["jobs_outreached"][0]["contacts_reached"] == 2


def test_outreach_node_per_job_error_continues():
    state = {"jobs_applied": [_JOB, _JOB]}
    call_count = {"n": 0}

    def outreach_side(job):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("hunter error")
        return {"contacts_reached": 1, "job_url": job["job_url"]}

    with patch("src.graph.run_outreach", side_effect=outreach_side):
        with patch("src.graph.post_error"):
            result = outreach_node(state)
    assert len(result["jobs_outreached"]) == 1


# --- reply_track_node ---

def test_reply_track_node_calls_scan_replies():
    state = {}
    with patch("src.graph.scan_replies") as mock_scan:
        reply_track_node(state)
    mock_scan.assert_called_once()


def test_reply_track_node_scan_error_does_not_raise():
    state = {}
    with patch("src.graph.scan_replies", side_effect=Exception("Gmail error")):
        with patch("src.graph.post_error"):
            result = reply_track_node(state)
    assert result == {}


# --- report_node ---

def test_report_node_returns_summary():
    state = {}
    stats = {"jobs_discovered": 5, "applied": 3}
    with patch("src.graph.generate_report", return_value=stats):
        result = report_node(state)
    assert result["summary"]["applied"] == 3


def test_report_node_report_error_returns_empty_summary():
    state = {}
    with patch("src.graph.generate_report", side_effect=Exception("DB error")):
        with patch("src.graph.post_error"):
            result = report_node(state)
    assert result["summary"] == {}


# --- _should_run_scan / tier wrappers ---

from src.graph import (
    _should_run_scan,
    _mark_scan_run,
    _should_run_search_scan,
)


def test_should_run_scan_true_when_no_record():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.db.client.get_client", return_value=mock_db):
        assert _should_run_scan("last_search_scan_at", 2) is True


def test_should_run_scan_false_when_recent():
    from datetime import datetime, timezone
    mock_db = MagicMock()
    recent = datetime.now(timezone.utc).isoformat()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"last_search_scan_at": recent}
    ]
    with patch("src.db.client.get_client", return_value=mock_db):
        assert _should_run_scan("last_search_scan_at", 2) is False


def test_should_run_scan_true_when_interval_elapsed():
    from datetime import datetime, timezone, timedelta
    mock_db = MagicMock()
    old = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"last_crawler_scan_at": old}
    ]
    with patch("src.db.client.get_client", return_value=mock_db):
        assert _should_run_scan("last_crawler_scan_at", 4) is True


def test_should_run_search_scan_uses_2h_interval():
    from datetime import datetime, timezone, timedelta
    mock_db = MagicMock()
    just_over_2h = (datetime.now(timezone.utc) - timedelta(hours=2, minutes=1)).isoformat()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"last_search_scan_at": just_over_2h}
    ]
    with patch("src.db.client.get_client", return_value=mock_db):
        assert _should_run_search_scan() is True


# --- _mark_scan_run ---

def test_mark_scan_run_updates_existing_row():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [{"id": "abc"}]
    with patch("src.db.client.get_client", return_value=mock_db):
        _mark_scan_run("last_search_scan_at")
    mock_db.table.return_value.update.assert_called_once()
    assert mock_db.table.return_value.update.call_args[0][0]["last_search_scan_at"]


def test_mark_scan_run_inserts_when_no_row():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.db.client.get_client", return_value=mock_db):
        _mark_scan_run("last_crawler_scan_at")
    mock_db.table.return_value.insert.assert_called_once()


# --- build_graph ---

def test_build_graph_compiles_without_error():
    graph = build_graph()
    assert graph is not None
