from unittest.mock import MagicMock, patch

from src.graph import (
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
    with patch("src.graph.tailor_resume", return_value={"resume_pdf_path": "/tmp/r.pdf"}):
        with patch("src.graph.generate_cover_letter", return_value={"cover_letter_path": "/tmp/c.pdf"}):
            result = tailor_node(state)
    assert len(result["jobs_tailored"]) == 1
    assert result["jobs_tailored"][0]["resume_pdf_path"] == "/tmp/r.pdf"


def test_tailor_node_per_job_error_continues():
    state = {"jobs_filtered": [_JOB, _JOB]}
    call_count = {"n": 0}

    def tailor_side(job, path):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("compile failed")
        return {"resume_pdf_path": "/tmp/r.pdf"}

    with patch("src.graph.tailor_resume", side_effect=tailor_side):
        with patch("src.graph.generate_cover_letter", return_value={"cover_letter_path": "/tmp/c.pdf"}):
            with patch("src.graph.post_error"):
                result = tailor_node(state)
    assert len(result["jobs_tailored"]) == 1


# --- apply_node ---

def test_apply_node_returns_applied_jobs():
    state = {"jobs_tailored": [{**_JOB, "resume_pdf_path": "/tmp/r.pdf", "cover_letter_path": "/tmp/c.pdf"}]}
    receipt = {**_JOB, "status": "applied", "submission_type": "auto"}
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

    with patch("src.graph.apply_to_job", side_effect=apply_side):
        with patch("src.graph.post_error"):
            result = apply_node(state)
    assert len(result["jobs_applied"]) == 1


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


# --- build_graph ---

def test_build_graph_compiles_without_error():
    graph = build_graph()
    assert graph is not None
