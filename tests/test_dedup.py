from unittest.mock import patch, MagicMock
from src.filters.dedup import dedup_filter
from src.state import JobItem


def _job(url: str) -> JobItem:
    return JobItem(
        job_url=url,
        job_id=url,
        title="SWE",
        company="Acme",
        source="greenhouse",
        description="",
        ats_platform="greenhouse",
        raw_json={},
    )


def _mock_db(seen_urls: list[str]) -> MagicMock:
    mock = MagicMock()
    mock.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"job_url": u} for u in seen_urls
    ]
    return mock


def test_new_job_passes():
    with patch("src.filters.dedup.get_client", return_value=_mock_db([])):
        result = dedup_filter([_job("https://new.com/job/1")])
    assert len(result) == 1


def test_seen_job_filtered():
    with patch("src.filters.dedup.get_client", return_value=_mock_db(["https://seen.com/job/1"])):
        result = dedup_filter([_job("https://seen.com/job/1")])
    assert len(result) == 0


def test_mixed_new_and_seen():
    seen = ["https://seen.com/job/1"]
    jobs = [_job("https://seen.com/job/1"), _job("https://new.com/job/2")]
    with patch("src.filters.dedup.get_client", return_value=_mock_db(seen)):
        result = dedup_filter(jobs)
    assert len(result) == 1
    assert result[0]["job_url"] == "https://new.com/job/2"


def test_empty_list_returns_empty():
    with patch("src.filters.dedup.get_client", return_value=_mock_db([])):
        result = dedup_filter([])
    assert result == []


def test_new_jobs_inserted_to_db():
    mock_db = _mock_db([])
    with patch("src.filters.dedup.get_client", return_value=mock_db):
        dedup_filter([_job("https://new.com/job/1")])
    mock_db.table.return_value.insert.assert_called_once()


def test_new_jobs_insert_includes_location_and_job_type():
    job = _job("https://new.com/job/1")
    job["location"] = "Remote"
    job["job_type"] = "Internship"
    mock_db = _mock_db([])
    with patch("src.filters.dedup.get_client", return_value=mock_db):
        dedup_filter([job])
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted[0]["location"] == "Remote"
    assert inserted[0]["job_type"] == "Internship"


def test_new_jobs_insert_defaults_location_and_job_type_to_none():
    mock_db = _mock_db([])
    with patch("src.filters.dedup.get_client", return_value=mock_db):
        dedup_filter([_job("https://new.com/job/1")])
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted[0]["location"] is None
    assert inserted[0]["job_type"] is None


def test_new_jobs_insert_includes_workplace_degree_visa_role():
    job = _job("https://new.com/job/1")
    job["workplace"] = "Remote"
    job["degree_level"] = "Bachelor's"
    job["visa_sponsorship"] = "Yes"
    job["role_category"] = "Engineering"
    mock_db = _mock_db([])
    with patch("src.filters.dedup.get_client", return_value=mock_db):
        dedup_filter([job])
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted[0]["workplace"] == "Remote"
    assert inserted[0]["degree_level"] == "Bachelor's"
    assert inserted[0]["visa_sponsorship"] == "Yes"
    assert inserted[0]["role_category"] == "Engineering"


def test_new_jobs_insert_defaults_workplace_degree_visa_role_to_none():
    mock_db = _mock_db([])
    with patch("src.filters.dedup.get_client", return_value=mock_db):
        dedup_filter([_job("https://new.com/job/1")])
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted[0]["workplace"] is None
    assert inserted[0]["degree_level"] is None
    assert inserted[0]["visa_sponsorship"] is None
    assert inserted[0]["role_category"] is None
