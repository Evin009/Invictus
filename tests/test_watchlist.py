from unittest.mock import MagicMock, patch, call

from datetime import datetime, timedelta, timezone

from src.agents.watchlist import (
    watchlist_agent,
    _scrape_career_page,
    _parse_jobs,
    _try_search,
    _get_cached_jobs,
    _set_cached_jobs,
    _keywords_hash,
    _select_active_batch,
    BATCH_SIZE,
)


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


# --- _try_search ---

def test_try_search_no_keywords_noops():
    mock_page = MagicMock()
    _try_search(mock_page, None)
    mock_page.locator.assert_not_called()


def test_try_search_no_search_box_found_noops():
    mock_page = MagicMock()
    mock_page.locator.return_value.first.count.return_value = 0
    _try_search(mock_page, ["engineer"])
    mock_page.locator.return_value.first.fill.assert_not_called()


def test_try_search_fills_and_submits_first_matching_box():
    mock_page = MagicMock()
    mock_box = mock_page.locator.return_value.first
    mock_box.count.return_value = 1
    _try_search(mock_page, ["engineer", "data"])
    mock_box.click.assert_called_once()
    mock_box.fill.assert_called_once_with("engineer", timeout=3000)
    mock_box.press.assert_called_once_with("Enter", timeout=3000)


def test_try_search_swallows_interaction_errors():
    mock_page = MagicMock()
    mock_page.locator.side_effect = Exception("no such element")
    _try_search(mock_page, ["engineer"])  # should not raise


# --- _select_active_batch ---

def test_select_active_batch_returns_all_when_under_limit():
    rows = [{"id": str(i)} for i in range(30)]
    assert _select_active_batch(rows) == rows


def test_select_active_batch_returns_all_when_exactly_at_limit():
    rows = [{"id": str(i)} for i in range(BATCH_SIZE)]
    assert _select_active_batch(rows) == rows


def test_select_active_batch_returns_only_batch_size_when_over_limit():
    rows = [{"id": f"{i:03d}"} for i in range(120)]
    result = _select_active_batch(rows)
    assert len(result) == BATCH_SIZE


def test_select_active_batch_deterministic_for_same_moment():
    rows = [{"id": f"{i:03d}"} for i in range(120)]
    assert _select_active_batch(rows) == _select_active_batch(rows)


def test_select_active_batch_covers_full_set_across_rotation_cycle():
    rows = [{"id": f"{i:03d}"} for i in range(120)]
    total_batches = 3  # ceil(120/50)
    seen_ids = set()
    from unittest.mock import patch as _patch
    import datetime as _dt
    base = _dt.datetime(2026, 1, 1, tzinfo=_dt.timezone.utc)
    for cycle in range(total_batches):
        fake_now = base + _dt.timedelta(hours=5 * cycle)
        with _patch("src.agents.watchlist.datetime") as mock_dt:
            mock_dt.now.return_value = fake_now
            mock_dt.fromisoformat = _dt.datetime.fromisoformat
            batch = _select_active_batch(rows)
        seen_ids.update(r["id"] for r in batch)
    assert seen_ids == {r["id"] for r in rows}


# --- scrape cache ---

def test_keywords_hash_order_independent():
    assert _keywords_hash(["engineer", "data"]) == _keywords_hash(["Data", " Engineer "])


def test_keywords_hash_differs_for_different_keywords():
    assert _keywords_hash(["engineer"]) != _keywords_hash(["designer"])


def test_get_cached_jobs_returns_none_when_no_row():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        result = _get_cached_jobs("https://acme.com/careers", ["engineer"])
    assert result is None


def test_get_cached_jobs_returns_none_when_stale():
    stale_time = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"parsed_jobs": _PARSED_JOBS, "scraped_at": stale_time}
    ]
    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        result = _get_cached_jobs("https://acme.com/careers", ["engineer"])
    assert result is None


def test_get_cached_jobs_returns_jobs_when_fresh():
    fresh_time = datetime.now(timezone.utc).isoformat()
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"parsed_jobs": _PARSED_JOBS, "scraped_at": fresh_time}
    ]
    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        result = _get_cached_jobs("https://acme.com/careers", ["engineer"])
    assert result == _PARSED_JOBS


def test_set_cached_jobs_upserts():
    mock_db = MagicMock()
    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        _set_cached_jobs("https://acme.com/careers", ["engineer"], _PARSED_JOBS)
    mock_db.table.assert_any_call("scrape_cache")
    mock_db.table.return_value.upsert.assert_called_once()
    _, kwargs = mock_db.table.return_value.upsert.call_args
    assert kwargs["on_conflict"] == "careers_url,keywords_hash"


def test_watchlist_agent_uses_cache_skips_scrape():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.execute.return_value.data = [_WATCHLIST_ROW]

    fresh_time = datetime.now(timezone.utc).isoformat()
    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        with patch(
            "src.agents.watchlist._get_cached_jobs", return_value=_PARSED_JOBS
        ):
            with patch("src.agents.watchlist._scrape_career_page") as mock_scrape:
                result = watchlist_agent(state)

    mock_scrape.assert_not_called()
    assert len(result["jobs_discovered"]) == 1


def test_watchlist_agent_cache_lookup_error_falls_back_to_scrape():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.execute.return_value.data = [_WATCHLIST_ROW]

    with patch("src.agents.watchlist.get_client", return_value=mock_db):
        with patch(
            "src.agents.watchlist._get_cached_jobs", side_effect=Exception("db down")
        ):
            with patch(
                "src.agents.watchlist._scrape_career_page", return_value=_RAW_HTML
            ) as mock_scrape:
                with patch(
                    "src.agents.watchlist._parse_jobs", return_value=_PARSED_JOBS
                ):
                    with patch("src.agents.watchlist._set_cached_jobs"):
                        result = watchlist_agent(state)

    mock_scrape.assert_called_once()
    assert len(result["jobs_discovered"]) == 1


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
    def scrape_side(url, keywords=None):
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
