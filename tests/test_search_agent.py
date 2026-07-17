import json
from unittest.mock import patch, MagicMock
from src.agents.search import fetch_greenhouse_jobs, fetch_lever_jobs, fetch_github_jobs, search_agent, _resolve_watchlist_ats


def test_fetch_greenhouse_returns_matching_jobs():
    mock_jobs = [
        {"id": "123", "title": "SWE Intern", "absolute_url": "https://boards.greenhouse.io/acme/jobs/123", "content": "Python role", "location": {"name": "Hawthorne, CA"}},
        {"id": "456", "title": "Marketing Manager", "absolute_url": "https://boards.greenhouse.io/acme/jobs/456", "content": "Marketing role"},
    ]
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps({"jobs": mock_jobs}).encode()
        mock_open.return_value = mock_cm
        result = fetch_greenhouse_jobs(board_token="acme", keywords=["SWE"])
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["job_url"] == "https://boards.greenhouse.io/acme/jobs/123"
    assert result[0]["source"] == "greenhouse"
    assert result[0]["ats_platform"] == "greenhouse"
    assert result[0]["location"] == "Hawthorne, CA"
    assert result[0]["job_type"] == "Internship"


def test_fetch_greenhouse_empty_board():
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps({"jobs": []}).encode()
        mock_open.return_value = mock_cm
        result = fetch_greenhouse_jobs(board_token="empty", keywords=["SWE"])
    assert result == []


def test_fetch_lever_returns_matching_jobs():
    mock_jobs = [
        {"id": "abc", "text": "Data Engineer", "hostedUrl": "https://jobs.lever.co/acme/abc", "descriptionPlain": "Kafka role", "categories": {"location": "London, United Kingdom", "commitment": "Full-time"}},
        {"id": "def", "text": "Designer", "hostedUrl": "https://jobs.lever.co/acme/def", "descriptionPlain": "Design role"},
    ]
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps(mock_jobs).encode()
        mock_open.return_value = mock_cm
        result = fetch_lever_jobs(company="acme", keywords=["Data Engineer"])
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["job_url"] == "https://jobs.lever.co/acme/abc"
    assert result[0]["source"] == "lever"
    assert result[0]["location"] == "London, United Kingdom"
    assert result[0]["job_type"] == "Full-time"


def test_fetch_lever_empty():
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps([]).encode()
        mock_open.return_value = mock_cm
        result = fetch_lever_jobs(company="empty", keywords=["SWE"])
    assert result == []


# Real curated-repo format (SimplifyJobs/vanshb03 style): HTML table embedded
# in README.md, sub-roles at the same company use '↳' instead of repeating it.
_GITHUB_TABLE = """
<table>
<thead>
<tr><th>Company</th><th>Role</th><th>Location</th><th>Application</th><th>Age</th></tr>
</thead>
<tbody>
<tr>
<td><strong><a href="https://simplify.jobs/c/Acme">Acme</a></strong></td>
<td>Software Engineer Intern - Platform</td>
<td>SF</td>
<td><div align="center"><a href="https://jobs.ashbyhq.com/acme/apply-1">Apply</a></div></td>
<td>0d</td>
</tr>
<tr>
<td>↳</td>
<td>Full-Stack Software Engineer Intern</td>
<td>NYC</td>
<td><div align="center"><a href="https://jobs.ashbyhq.com/acme/apply-2">Apply</a></div></td>
<td>1d</td>
</tr>
<tr>
<td><strong><a href="https://simplify.jobs/c/Other">Other Co</a></strong></td>
<td>Marketing Intern</td>
<td>Remote</td>
<td><div align="center"><a href="https://other.com/apply">Apply</a></div></td>
<td>2d</td>
</tr>
</tbody>
</table>
"""


def _mock_urlopen_with(content: str):
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value.read.return_value = content.encode()
    return mock_cm


def test_fetch_github_jobs_extracts_matching_roles():
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_with(_GITHUB_TABLE)):
        result = fetch_github_jobs(
            repo_url="https://raw.githubusercontent.com/test/repo/main/README.md",
            keywords=["Software Engineer"]
        )
    assert len(result) == 2
    assert result[0]["job_url"] == "https://jobs.ashbyhq.com/acme/apply-1"
    assert result[0]["company"] == "Acme"
    assert result[0]["source"] == "github"
    assert result[0]["location"] == "SF"
    assert result[0]["job_type"] == "Internship"


def test_fetch_github_jobs_carries_company_forward_for_sub_rows():
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_with(_GITHUB_TABLE)):
        result = fetch_github_jobs(
            repo_url="https://raw.githubusercontent.com/test/repo/main/README.md",
            keywords=["Software Engineer"]
        )
    assert result[1]["company"] == "Acme"
    assert result[1]["job_url"] == "https://jobs.ashbyhq.com/acme/apply-2"


def test_fetch_github_no_matches():
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_with(_GITHUB_TABLE)):
        result = fetch_github_jobs(
            repo_url="https://raw.githubusercontent.com/test/repo/main/README.md",
            keywords=["Nonexistent Role"]
        )
    assert result == []


def test_fetch_github_skips_rows_without_application_link():
    table = """
<table><tbody>
<tr>
<td>Acme</td>
<td>Software Engineer Intern</td>
<td>SF</td>
</tr>
</tbody></table>
"""
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_with(table)):
        result = fetch_github_jobs(
            repo_url="https://raw.githubusercontent.com/test/repo/main/README.md",
            keywords=["Software Engineer"]
        )
    assert result == []


# --- _resolve_watchlist_ats ---

def test_resolve_watchlist_ats_returns_cached_result_without_detecting():
    mock_db = MagicMock()
    row = {"id": "1", "company_name": "Acme", "ats_platform": "greenhouse", "ats_token": "acme", "ats_checked_at": "2026-01-01T00:00:00Z"}
    with patch("src.agents.ats_detect.detect_ats") as mock_detect:
        result = _resolve_watchlist_ats(mock_db, row)
    mock_detect.assert_not_called()
    assert result == ("greenhouse", "acme")


def test_resolve_watchlist_ats_cached_none_returns_none_without_detecting():
    mock_db = MagicMock()
    row = {"id": "1", "company_name": "Acme", "ats_platform": None, "ats_token": None, "ats_checked_at": "2026-01-01T00:00:00Z"}
    with patch("src.agents.ats_detect.detect_ats") as mock_detect:
        result = _resolve_watchlist_ats(mock_db, row)
    mock_detect.assert_not_called()
    assert result is None


def test_resolve_watchlist_ats_detects_and_caches_when_unchecked():
    mock_db = MagicMock()
    row = {"id": "1", "company_name": "Acme", "ats_checked_at": None}
    with patch("src.agents.ats_detect.detect_ats", return_value=("lever", "acme")):
        result = _resolve_watchlist_ats(mock_db, row)
    assert result == ("lever", "acme")
    mock_db.table.assert_any_call("watchlist")
    update_call = mock_db.table.return_value.update.call_args[0][0]
    assert update_call["ats_platform"] == "lever"
    assert update_call["ats_token"] == "acme"
    assert "ats_checked_at" in update_call


def test_resolve_watchlist_ats_caches_none_when_not_found():
    mock_db = MagicMock()
    row = {"id": "1", "company_name": "Unknown Co", "ats_checked_at": None}
    with patch("src.agents.ats_detect.detect_ats", return_value=None):
        result = _resolve_watchlist_ats(mock_db, row)
    assert result is None
    update_call = mock_db.table.return_value.update.call_args[0][0]
    assert "ats_platform" not in update_call
    assert "ats_checked_at" in update_call


# --- search_agent ---

def test_search_agent_uses_resolved_watchlist_ats():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()

    def table_side(name):
        m = MagicMock()
        if name == "preferences":
            m.select.return_value.limit.return_value.execute.return_value.data = [{"role_keywords": ["engineer"]}]
        elif name == "watchlist":
            m.select.return_value.execute.return_value.data = [
                {"id": "1", "company_name": "Acme", "ats_platform": "greenhouse", "ats_token": "acme", "ats_checked_at": "2026-01-01T00:00:00Z"}
            ]
        return m

    mock_db.table.side_effect = table_side

    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.agents.search.fetch_greenhouse_jobs", return_value=[{"job_url": "https://boards.greenhouse.io/acme/jobs/1", "source": "greenhouse"}]) as mock_gh:
            with patch("src.agents.search.fetch_github_jobs", return_value=[]):
                result = search_agent(state)

    mock_gh.assert_called_once_with("acme", ["engineer"])
    assert len(result["jobs_discovered"]) == 1


def test_search_agent_fetches_github_curated_repos():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()

    def table_side(name):
        m = MagicMock()
        if name == "preferences":
            m.select.return_value.limit.return_value.execute.return_value.data = [{"role_keywords": ["engineer"]}]
        elif name == "watchlist":
            m.select.return_value.execute.return_value.data = []
        return m

    mock_db.table.side_effect = table_side

    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.agents.search.fetch_github_jobs", return_value=[{"job_url": "https://acme.com/apply", "source": "github"}]) as mock_gh:
            result = search_agent(state)

    assert mock_gh.call_count == len(__import__("src.agents.search", fromlist=["GITHUB_JOB_REPOS"]).GITHUB_JOB_REPOS)
    assert len(result["jobs_discovered"]) >= 1


def test_search_agent_watchlist_error_still_gets_github_jobs():
    state = {"jobs_discovered": []}
    mock_db = MagicMock()

    def table_side(name):
        m = MagicMock()
        if name == "preferences":
            m.select.return_value.limit.return_value.execute.return_value.data = []
        elif name == "watchlist":
            m.select.return_value.execute.side_effect = Exception("db down")
        return m

    mock_db.table.side_effect = table_side

    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.agents.search.fetch_github_jobs", return_value=[{"job_url": "https://acme.com/apply", "source": "github"}]):
            with patch("src.agents.search.post_error") as mock_err:
                result = search_agent(state)

    assert len(result["jobs_discovered"]) >= 1
    mock_err.assert_called()
