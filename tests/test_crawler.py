from unittest.mock import MagicMock, patch

from src.agents.crawler import crawler_agent


_CRAWLER_ROW = {
    "company_name": "Beta Corp",
    "careers_url": "https://beta.com/careers",
    "active": True,
}

_PARSED_JOBS = [
    {
        "job_url": "https://beta.com/careers/swe",
        "job_id": "https://beta.com/careers/swe",
        "title": "Software Engineer",
        "company": "Beta Corp",
        "source": "crawler",
        "description": "Software Engineer",
        "ats_platform": "unknown",
        "raw_json": {},
    }
]


def test_crawler_agent_returns_discovered_jobs():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [_CRAWLER_ROW]

    with patch("src.agents.crawler.get_client", return_value=mock_db):
        with patch("src.agents.crawler._scrape_career_page", return_value="<html>jobs</html>"):
            with patch("src.agents.crawler._parse_jobs", return_value=_PARSED_JOBS):
                result = crawler_agent(state)

    assert len(result["jobs_discovered"]) == 1
    assert result["jobs_discovered"][0]["source"] == "crawler"


def test_crawler_agent_only_fetches_active_urls():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    with patch("src.agents.crawler.get_client", return_value=mock_db):
        result = crawler_agent(state)

    eq_call = mock_db.table.return_value.select.return_value.eq.call_args[0]
    assert eq_call == ("active", True)
    assert result == {"jobs_discovered": []}


def test_crawler_agent_appends_to_existing():
    existing = [{"job_url": "https://other.com/job/1", "title": "Existing"}]
    state = {"jobs_discovered": existing}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [_CRAWLER_ROW]

    with patch("src.agents.crawler.get_client", return_value=mock_db):
        with patch("src.agents.crawler._scrape_career_page", return_value="<html/>"):
            with patch("src.agents.crawler._parse_jobs", return_value=_PARSED_JOBS):
                result = crawler_agent(state)

    assert len(result["jobs_discovered"]) == 2


def test_crawler_agent_dedupes_against_existing():
    state = {"jobs_discovered": [_PARSED_JOBS[0]]}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [_CRAWLER_ROW]

    with patch("src.agents.crawler.get_client", return_value=mock_db):
        with patch("src.agents.crawler._scrape_career_page", return_value="<html/>"):
            with patch("src.agents.crawler._parse_jobs", return_value=_PARSED_JOBS):
                result = crawler_agent(state)

    assert len(result["jobs_discovered"]) == 1


def test_crawler_agent_per_url_error_continues():
    rows = [_CRAWLER_ROW, {**_CRAWLER_ROW, "company_name": "Gamma", "careers_url": "https://gamma.com/careers"}]
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = rows

    call_count = {"n": 0}
    def scrape_side(url):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("timeout")
        return "<html/>"

    with patch("src.agents.crawler.get_client", return_value=mock_db):
        with patch("src.agents.crawler._scrape_career_page", side_effect=scrape_side):
            with patch("src.agents.crawler._parse_jobs", return_value=_PARSED_JOBS):
                with patch("src.agents.crawler.post_error"):
                    result = crawler_agent(state)

    assert len(result["jobs_discovered"]) == 1


def test_crawler_agent_db_error_returns_existing():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.side_effect = Exception("DB down")

    with patch("src.agents.crawler.get_client", return_value=mock_db):
        with patch("src.agents.crawler.post_error"):
            result = crawler_agent(state)

    assert result == {"jobs_discovered": []}
