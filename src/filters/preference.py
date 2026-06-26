import re
from src.state import JobItem


def preference_filter(jobs: list[JobItem], prefs: dict) -> list[JobItem]:
    passing = []
    for job in jobs:
        text = f"{job['title']} {job['description']}".lower()

        if prefs.get("role_keywords"):
            if not any(kw.lower() in text for kw in prefs["role_keywords"]):
                continue

        if prefs.get("locations"):
            if not any(loc.lower() in text for loc in prefs["locations"]):
                continue

        if prefs.get("salary_floor"):
            salary_matches = re.findall(r'\b(\d{5,6})\b', text)
            if salary_matches:
                max_salary = max(int(s) for s in salary_matches)
                if max_salary < prefs["salary_floor"]:
                    continue

        passing.append(job)
    return passing
