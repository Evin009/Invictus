from src.filters.preference import preference_filter
from src.state import JobItem

PREFS = {
    "locations": ["Remote", "Tampa"],
    "seniority": ["entry", "intern"],
    "salary_floor": 60000,
    "role_keywords": ["SWE", "Data Engineer"],
}


def _job(**overrides) -> JobItem:
    base = JobItem(
        job_url="https://example.com/1",
        job_id="1",
        title="SWE Intern",
        company="Acme",
        source="greenhouse",
        description="Remote SWE intern role. Salary: 80000",
        ats_platform="greenhouse",
        raw_json={},
    )
    return {**base, **overrides}


def test_passes_matching_job():
    result = preference_filter([_job()], PREFS)
    assert len(result) == 1


def test_filters_wrong_role():
    result = preference_filter(
        [_job(title="Marketing Manager", description="Marketing role remote")], PREFS
    )
    assert len(result) == 0


def test_filters_wrong_location():
    result = preference_filter(
        [_job(description="SWE intern role. On-site NYC only. Salary: 80000")], PREFS
    )
    assert len(result) == 0


def test_filters_below_salary_floor():
    result = preference_filter(
        [_job(description="SWE intern remote. Salary: 40000")], PREFS
    )
    assert len(result) == 0


def test_passes_when_no_salary_in_description():
    # No salary mention → salary filter skipped, job passes
    result = preference_filter(
        [_job(description="SWE intern remote role")], PREFS
    )
    assert len(result) == 1


def test_passes_multiple_matching():
    jobs = [_job(job_url=f"https://example.com/{i}", job_id=str(i)) for i in range(3)]
    result = preference_filter(jobs, PREFS)
    assert len(result) == 3


def test_empty_prefs_passes_all():
    result = preference_filter([_job()], {})
    assert len(result) == 1


def test_empty_job_list():
    result = preference_filter([], PREFS)
    assert result == []


def test_passes_broad_role_match_differently_phrased_title():
    # Real postings often phrase this differently than the exact keyword
    # ("Co-op" instead of "Intern", different word order) — the role filter
    # should catch these via job_meta's broader role-word matching, not just
    # an exact substring of "SWE"/"Data Engineer".
    result = preference_filter(
        [_job(title="Data Engineering Co-op", description="Remote data engineering co-op. Salary: 80000")],
        PREFS,
    )
    assert len(result) == 1
