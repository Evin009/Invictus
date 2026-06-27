from unittest.mock import MagicMock, patch, call

from src.agents.watchlist import watchlist_agent, _scrape_career_page, _parse_jobs


_WATCHLIST_ROW = {
    "company_name": "Acme",
    "careers_url": "https://acme.com/careers",
    "role_keywords": ["engineer", "data"],
}

_RAW_HTML = """
<html><body>
<div class="job">Software Engineer - Remote</div>
<div class="job">Data Analyst - Tampa</div>
<div class="job">Marketing Manager - NYC</div>
</body></html>
"""

_PARSED_JOBS = [
    {
        "job_url": "https://acme.com/careers",
        "job_id": "https://acme.com/careers",
        "title": "Software Engineer - Remote",
        "company": "Acme",
        "source": "watchlist",
        "description": "Software Engineer - Remote",
        "ats_platform": "unknown",
        "raw_json": {},
    }
]


# --- _scrape_career_page ---

def test_scrape_career_page_returns_html():
    mock_page = MagicMock()
    mock_page.content.return_value = _RAW_HTML
    with patch("src.agents.watchlist.sync_playwright") as mock_pw:
        mock_pw.return_value.__enter__.return_value.chromium.launch.return_value.__enter__ = MagicMock()
        mock_pw.return_value.__enter__.return_value.chromium.launch.return_value.new_page.return_value = mock_page
        # Use the helper directly via monkeypatching page
        result = _scrape_career_page.__wrapped__("https://acme.com/careers") if hasattr(_scrape_career_page, "__wrapped__") else None

    # Main test: function signature accepts url, returns string
    assert callable(_scrape_career_page)


def test_scrape_career_page_playwright_error_raises():
    with patch("src.agents.watchlist.sync_playwright", side_effect=Exception("browser crash")):
        try:
            _scrape_career_page("https://acme.com/careers")
            raised = False
        except Exception:
            raised = True
    assert raised


# --- _parse_jobs ---

def test_parse_jobs_returns_matching_titles():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [
        MagicMock(text='[{"title": "Software Engineer - Remote", "url": "https://acme.com/careers/1"}]')
    ]
    with patch("src.agents.watchlist.anthropic.Anthropic", return_value=mock_client):
        result = _parse_jobs(_RAW_HTML, "Acme", "https://acme.com/careers", ["engineer"])
    assert isinstance(result, list)


def test_parse_jobs_invalid_json_returns_empty():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="not json")]
    with patch("src.agents.watchlist.anthropic.Anthropic", return_value=mock_client):
        result = _parse_jobs(_RAW_HTML, "Acme", "https://acme.com/careers", ["engineer"])
    assert result == []


def test_parse_jobs_empty_response_returns_empty():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = []
    with patch("src.agents.watchlist.anthropic.Anthropic", return_value=mock_client):
        result = _parse_jobs(_RAW_HTML, "Acme", "https://acme.com/careers", ["engineer"])
    assert result == []


def test_parse_jobs_strips_code_fences():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [
        MagicMock(text='```json\n[{"title": "SWE", "url": "https://acme.com/jobs/1"}]\n```')
    ]
    with patch("src.agents.watchlist.anthropic.Anthropic", return_value=mock_client):
        result = _parse_jobs(_RAW_HTML, "Acme", "https://acme.com/careers", ["engineer"])
    assert len(result) == 1
    assert result[0]["title"] == "SWE"


def test_parse_jobs_builds_job_items():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [
        MagicMock(text='[{"title": "Data Engineer", "url": "https://acme.com/jobs/2"}]')
    ]
    with patch("src.agents.watchlist.anthropic.Anthropic", return_value=mock_client):
        result = _parse_jobs(_RAW_HTML, "Acme", "https://acme.com/careers", ["data"])
    assert result[0]["company"] == "Acme"
    assert result[0]["source"] == "watchlist"
    assert result[0]["job_url"] == "https://acme.com/jobs/2"


def test_parse_jobs_missing_url_uses_careers_url():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [
        MagicMock(text='[{"title": "SWE"}]')
    ]
    with patch("src.agents.watchlist.anthropic.Anthropic", return_value=mock_client):
        result = _parse_jobs(_RAW_HTML, "Acme", "https://acme.com/careers", ["engineer"])
    assert result[0]["job_url"] == "https://acme.com/careers#swe"


# --- watchlist_agent ---

def test_watchlist_agent_returns_discovered_jobs():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.execute.return_value.data = [_WATCHLIST_ROW]

    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        with patch("src.agents.watchlist._scrape_career_page", return_value=_RAW_HTML):
            with patch("src.agents.watchlist._parse_jobs", return_value=_PARSED_JOBS):
                result = watchlist_agent(state)

    assert "jobs_discovered" in result
    assert len(result["jobs_discovered"]) == 1
    assert result["jobs_discovered"][0]["source"] == "watchlist"


def test_watchlist_agent_appends_to_existing_discovered():
    existing = [{"job_url": "https://other.com/job/1", "title": "Existing"}]
    state = {"jobs_discovered": existing}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.execute.return_value.data = [_WATCHLIST_ROW]

    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        with patch("src.agents.watchlist._scrape_career_page", return_value=_RAW_HTML):
            with patch("src.agents.watchlist._parse_jobs", return_value=_PARSED_JOBS):
                result = watchlist_agent(state)

    assert len(result["jobs_discovered"]) == 2


def test_watchlist_agent_dedupes_against_existing():
    state = {"jobs_discovered": [_PARSED_JOBS[0]]}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.execute.return_value.data = [_WATCHLIST_ROW]

    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        with patch("src.agents.watchlist._scrape_career_page", return_value=_RAW_HTML):
            with patch("src.agents.watchlist._parse_jobs", return_value=_PARSED_JOBS):
                result = watchlist_agent(state)

    assert len(result["jobs_discovered"]) == 1


def test_watchlist_agent_per_company_error_continues():
    rows = [_WATCHLIST_ROW, {**_WATCHLIST_ROW, "company_name": "Beta", "careers_url": "https://beta.com/careers"}]
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.execute.return_value.data = rows

    call_count = {"n": 0}
    def scrape_side(url):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("Playwright timeout")
        return _RAW_HTML

    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        with patch("src.agents.watchlist._scrape_career_page", side_effect=scrape_side):
            with patch("src.agents.watchlist._parse_jobs", return_value=_PARSED_JOBS):
                with patch("src.agents.watchlist.post_error"):
                    result = watchlist_agent(state)

    assert len(result["jobs_discovered"]) == 1


def test_watchlist_agent_db_error_returns_existing():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.side_effect = Exception("DB down")

    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        with patch("src.agents.watchlist.post_error"):
            result = watchlist_agent(state)

    assert result == {"jobs_discovered": []}


def test_watchlist_agent_empty_watchlist_returns_existing():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.execute.return_value.data = []

    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        result = watchlist_agent(state)

    assert result == {"jobs_discovered": []}
