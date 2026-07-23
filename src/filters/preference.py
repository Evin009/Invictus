import re
from src.agents.job_meta import matches_keywords
from src.state import JobItem


def preference_filter(jobs: list[JobItem], prefs: dict) -> list[JobItem]:
    passing = []
    for job in jobs:
        text = f"{job['title']} {job['description']}".lower()

        if prefs.get("role_keywords"):
            if not matches_keywords(text, prefs["role_keywords"]):
                continue

        if prefs.get("locations"):
            if not any(loc.lower() in text for loc in prefs["locations"]):
                continue

        if prefs.get("salary_floor"):
            # Require currency context: $55000, $55,000, $55k, 55k, or "salary: 55000"
            dollar_matches = re.findall(r'\$\s*(\d{1,3}(?:,\d{3})+|\d{4,6})', text)
            k_matches = re.findall(r'\b(\d{2,3})[kK]\b', text)
            keyword_matches = re.findall(
                r'(?:salary|pay|compensation|wage|stipend)[:\s]+\$?(\d{4,6})', text
            )
            all_salaries = (
                [int(s.replace(",", "")) for s in dollar_matches]
                + [int(s) * 1000 for s in k_matches]
                + [int(s) for s in keyword_matches]
            )
            if all_salaries:
                if max(all_salaries) < prefs["salary_floor"]:
                    continue

        passing.append(job)
    return passing
