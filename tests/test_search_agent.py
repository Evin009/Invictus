import json
from unittest.mock import patch, MagicMock
from src.agents.search import fetch_greenhouse_jobs, fetch_lever_jobs, fetch_github_jobs


def test_fetch_greenhouse_returns_matching_jobs():
    mock_jobs = [
        {"id": "123", "title": "SWE Intern", "absolute_url": "https://boards.greenhouse.io/acme/jobs/123", "content": "Python role"},
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


def test_fetch_greenhouse_empty_board():
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps({"jobs": []}).encode()
        mock_open.return_value = mock_cm
        result = fetch_greenhouse_jobs(board_token="empty", keywords=["SWE"])
    assert result == []


def test_fetch_lever_returns_matching_jobs():
    mock_jobs = [
        {"id": "abc", "text": "Data Engineer", "hostedUrl": "https://jobs.lever.co/acme/abc", "descriptionPlain": "Kafka role"},
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


def test_fetch_lever_empty():
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = json.dumps([]).encode()
        mock_open.return_value = mock_cm
        result = fetch_lever_jobs(company="empty", keywords=["SWE"])
    assert result == []


def test_fetch_github_jobs_extracts_urls():
    raw = "| Acme | SWE Intern | https://acme.com/jobs/swe |\n| Other | Marketing | https://other.com/jobs/mkt |"
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = raw.encode()
        mock_open.return_value = mock_cm
        result = fetch_github_jobs(
            repo_url="https://raw.githubusercontent.com/test/repo/main/README.md",
            keywords=["SWE"]
        )
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["job_url"] == "https://acme.com/jobs/swe"
    assert result[0]["source"] == "github"


def test_fetch_github_no_matches():
    raw = "| Acme | Marketing | https://acme.com/jobs/mkt |"
    with patch("urllib.request.urlopen") as mock_open:
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value.read.return_value = raw.encode()
        mock_open.return_value = mock_cm
        result = fetch_github_jobs(
            repo_url="https://raw.githubusercontent.com/test/repo/main/README.md",
            keywords=["SWE"]
        )
    assert result == []
