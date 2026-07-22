import json
from unittest.mock import patch, MagicMock
from src.agents.search import (
    fetch_greenhouse_jobs,
    fetch_lever_jobs,
    fetch_github_jobs,
    fetch_ashby_jobs,
    fetch_smartrecruiters_jobs,
    fetch_amazon_jobs,
    search_agent,
    _resolve_watchlist_ats,
)


def _mock_urlopen_json(payload):
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value.read.return_value = json.dumps(payload).encode()
    return mock_cm


def test_fetch_greenhouse_returns_matching_jobs():
    mock_jobs = [
        {"id": "123", "title": "SWE Intern", "absolute_url": "https://boards.greenhouse.io/acme/jobs/123", "content": "Python role, remote friendly. Bachelor's degree required. We will sponsor visas.", "location": {"name": "Hawthorne, CA"}},
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
    assert result[0]["workplace"] == "Remote"
    assert result[0]["degree_level"] == "Bachelor's"
    assert result[0]["visa_sponsorship"] == "Yes"
    assert result[0]["role_category"] == "Engineering"


def test_fetch_greenhouse_empty_board():
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps({"jobs": []}).encode()
        mock_open.return_value = mock_cm
        result = fetch_greenhouse_jobs(board_token="empty", keywords=["SWE"])
    assert result == []


def test_fetch_lever_returns_matching_jobs():
    mock_jobs = [
        {"id": "abc", "text": "Data Engineer", "hostedUrl": "https://jobs.lever.co/acme/abc", "descriptionPlain": "PhD in CS preferred. Unable to sponsor visas at this time.", "categories": {"location": "London, United Kingdom", "commitment": "Full-time"}, "workplaceType": "hybrid"},
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
    assert result[0]["workplace"] == "Hybrid"
    assert result[0]["degree_level"] == "PhD"
    assert result[0]["visa_sponsorship"] == "No"
    assert result[0]["role_category"] == "Data"


def test_fetch_lever_empty():
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps([]).encode()
        mock_open.return_value = mock_cm
        result = fetch_lever_jobs(company="empty", keywords=["SWE"])
    assert result == []


def test_fetch_ashby_returns_matching_jobs():
    mock_jobs = [
        {
            "id": "j1", "title": "Security Engineer, Cloud", "employmentType": "FullTime",
            "location": "New York, NY (HQ)", "workplaceType": "Hybrid",
            "jobUrl": "https://jobs.ashbyhq.com/ramp/j1", "applyUrl": "https://jobs.ashbyhq.com/ramp/j1/application",
            "descriptionHtml": "Bachelor's degree required. We will sponsor visas.",
        },
        {"id": "j2", "title": "Recruiter", "jobUrl": "https://jobs.ashbyhq.com/ramp/j2"},
    ]
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_json({"jobs": mock_jobs})):
        result = fetch_ashby_jobs("ramp", ["Engineer"])
    assert len(result) == 1
    assert result[0]["job_url"] == "https://jobs.ashbyhq.com/ramp/j1"
    assert result[0]["source"] == "ashby"
    assert result[0]["job_type"] == "FullTime"
    assert result[0]["location"] == "New York, NY (HQ)"
    assert result[0]["workplace"] == "Hybrid"
    assert result[0]["degree_level"] == "Bachelor's"
    assert result[0]["visa_sponsorship"] == "Yes"
    assert result[0]["role_category"] == "Engineering"


def test_fetch_ashby_empty_board():
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_json({"jobs": []})):
        result = fetch_ashby_jobs("empty", ["Engineer"])
    assert result == []


def test_fetch_smartrecruiters_returns_matching_jobs():
    mock_postings = [
        {
            "id": "p1", "name": "Software Engineer",
            "location": {"fullLocation": "Austin, TX, United States", "remote": False, "hybrid": False},
            "typeOfEmployment": {"label": "Full-time"},
        },
        {"id": "p2", "name": "Sr. Manager"},
    ]
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_json({"content": mock_postings})):
        result = fetch_smartrecruiters_jobs("visa", ["Engineer"])
    assert len(result) == 1
    assert result[0]["job_url"] == "https://jobs.smartrecruiters.com/visa/p1"
    assert result[0]["source"] == "smartrecruiters"
    assert result[0]["location"] == "Austin, TX, United States"
    assert result[0]["job_type"] == "Full-time"


def test_fetch_smartrecruiters_empty():
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_json({"content": []})):
        result = fetch_smartrecruiters_jobs("empty", ["Engineer"])
    assert result == []


def test_fetch_amazon_jobs_returns_matching_jobs():
    mock_response = {
        "hits": 2,
        "jobs": [
            {
                "id": "1", "id_icims": "10418355", "title": "Software Dev Engineer Intern",
                "job_path": "/en/jobs/10418355/software-dev-engineer-intern",
                "normalized_location": "Dublin, IRL",
                "description": "We will sponsor visas. Bachelor's degree required.",
            },
            {"id": "2", "title": "Sr. Product Manager", "job_path": "/en/jobs/2"},
        ],
    }
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_json(mock_response)):
        result = fetch_amazon_jobs(["Software Dev Engineer Intern"])
    assert len(result) == 1
    assert result[0]["job_url"] == "https://www.amazon.jobs/en/jobs/10418355/software-dev-engineer-intern"
    assert result[0]["source"] == "amazon"
    assert result[0]["company"] == "Amazon"
    assert result[0]["location"] == "Dublin, IRL"
    assert result[0]["job_type"] == "Internship"
    assert result[0]["visa_sponsorship"] == "Yes"
    assert result[0]["degree_level"] == "Bachelor's"


def test_fetch_amazon_jobs_empty():
    with patch("urllib.request.urlopen", return_value=_mock_urlopen_json({"jobs": []})):
        result = fetch_amazon_jobs(["Software Engineer"])
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
    assert result[0]["role_category"] == "Engineering"
    assert result[0]["degree_level"] is None
    assert result[0]["visa_sponsorship"] is None


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
    mock_db = _search_agent_mock_db(watchlist_rows=[
        {"id": "1", "company_name": "Acme", "ats_platform": "greenhouse", "ats_token": "acme", "ats_checked_at": "2026-01-01T00:00:00Z"}
    ])

    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.agents.search.fetch_greenhouse_jobs", return_value=[{"job_url": "https://boards.greenhouse.io/acme/jobs/1", "source": "greenhouse"}]) as mock_gh:
            with patch("src.agents.search.fetch_github_jobs", return_value=[]):
                result = search_agent(state)

    mock_gh.assert_called_once_with("acme", ["engineer"])
    assert len(result["jobs_discovered"]) == 1


def test_search_agent_routes_amazon_to_dedicated_fetcher():
    state = {"jobs_discovered": []}
    mock_db = _search_agent_mock_db(watchlist_rows=[
        {"id": "1", "company_name": "amazon", "careers_url": "https://www.amazon.jobs"}
    ])

    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.agents.search.fetch_amazon_jobs", return_value=[{"job_url": "https://www.amazon.jobs/en/jobs/1", "source": "amazon"}]) as mock_amazon:
            with patch("src.agents.search._resolve_watchlist_ats") as mock_resolve:
                with patch("src.agents.search.fetch_github_jobs", return_value=[]):
                    result = search_agent(state)

    mock_amazon.assert_called_once_with(["engineer"])
    mock_resolve.assert_not_called()
    assert len(result["jobs_discovered"]) == 1


def test_search_agent_routes_ashby_and_smartrecruiters():
    state = {"jobs_discovered": []}
    mock_db = _search_agent_mock_db(watchlist_rows=[
        {"id": "1", "company_name": "Ramp", "ats_platform": "ashby", "ats_token": "ramp", "ats_checked_at": "2026-01-01T00:00:00Z"},
        {"id": "2", "company_name": "Visa", "ats_platform": "smartrecruiters", "ats_token": "visa", "ats_checked_at": "2026-01-01T00:00:00Z"},
    ])

    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.agents.search.fetch_ashby_jobs", return_value=[{"job_url": "https://jobs.ashbyhq.com/ramp/1", "source": "ashby"}]) as mock_ashby:
            with patch("src.agents.search.fetch_smartrecruiters_jobs", return_value=[{"job_url": "https://jobs.smartrecruiters.com/visa/1", "source": "smartrecruiters"}]) as mock_sr:
                with patch("src.agents.search.fetch_github_jobs", return_value=[]):
                    result = search_agent(state)

    mock_ashby.assert_called_once_with("ramp", ["engineer"])
    mock_sr.assert_called_once_with("visa", ["engineer"])
    assert len(result["jobs_discovered"]) == 2


def _search_agent_mock_db(repo_rows=None, watchlist_rows=None, prefs_rows=None, watchlist_error=None):
    mock_db = MagicMock()

    def table_side(name):
        m = MagicMock()
        if name == "preferences":
            m.select.return_value.limit.return_value.execute.return_value.data = (
                prefs_rows if prefs_rows is not None else [{"role_keywords": ["engineer"]}]
            )
        elif name == "watchlist":
            if watchlist_error:
                m.select.return_value.execute.side_effect = watchlist_error
            else:
                m.select.return_value.execute.return_value.data = watchlist_rows or []
        elif name == "github_repos":
            m.select.return_value.execute.return_value.data = repo_rows or []
        return m

    mock_db.table.side_effect = table_side
    return mock_db


def test_search_agent_fetches_repos_from_db():
    state = {"jobs_discovered": []}
    mock_db = _search_agent_mock_db(repo_rows=[
        {"raw_readme_url": "https://raw.githubusercontent.com/a/b/main/README.md"},
        {"raw_readme_url": "https://raw.githubusercontent.com/c/d/dev/README.md"},
    ])

    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.agents.search.fetch_github_jobs", return_value=[{"job_url": "https://acme.com/apply", "source": "github"}]) as mock_gh:
            result = search_agent(state)

    assert mock_gh.call_count == 2
    called_urls = {c.args[0] for c in mock_gh.call_args_list}
    assert called_urls == {
        "https://raw.githubusercontent.com/a/b/main/README.md",
        "https://raw.githubusercontent.com/c/d/dev/README.md",
    }
    assert len(result["jobs_discovered"]) >= 1


def test_search_agent_falls_back_to_default_repos_when_table_empty():
    state = {"jobs_discovered": []}
    mock_db = _search_agent_mock_db(repo_rows=[])

    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.agents.search.fetch_github_jobs", return_value=[{"job_url": "https://acme.com/apply", "source": "github"}]) as mock_gh:
            result = search_agent(state)

    from src.agents.search import GITHUB_JOB_REPOS
    assert mock_gh.call_count == len(GITHUB_JOB_REPOS)
    assert len(result["jobs_discovered"]) >= 1


def test_search_agent_watchlist_error_still_gets_github_jobs():
    state = {"jobs_discovered": []}
    mock_db = _search_agent_mock_db(prefs_rows=[], watchlist_error=Exception("db down"))

    with patch("src.db.client.get_client", return_value=mock_db):
        with patch("src.agents.search.fetch_github_jobs", return_value=[{"job_url": "https://acme.com/apply", "source": "github"}]):
            with patch("src.agents.search.post_error") as mock_err:
                result = search_agent(state)

    assert len(result["jobs_discovered"]) >= 1
    mock_err.assert_called()
