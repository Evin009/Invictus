#!/usr/bin/env python3
"""
One-time seed script. Run after schema is applied:
  python setup/seed.py

Edit the DATA section below with your real information before running.
All tables are cleared and re-seeded on each run (idempotent).
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.db.client import get_client

# ── EDIT EVERYTHING BELOW THIS LINE ──────────────────────────────────────────

USER_PROFILE = {
    "full_name": "Your Full Name",
    "email": "your@email.com",
    "phone": "+1-555-000-0000",
    "linkedin_url": "https://linkedin.com/in/yourhandle",
    "github_url": "https://github.com/yourhandle",
    "education": [
        {
            "institution": "University of South Florida",
            "degree": "B.S. Computer Science",
            "graduation_year": 2026,
        }
    ],
    "work_history": [
        {
            "company": "Acme Corp",
            "title": "Software Engineer Intern",
            "start": "2025-05",
            "end": "2025-08",
        }
    ],
    "skills": ["Python", "TypeScript", "SQL", "Docker", "AWS"],
}

PREFERENCES = {
    "locations": ["Remote", "Tampa, FL", "New York, NY"],
    "seniority": ["entry", "junior", "intern"],
    "salary_floor": 80000,
    "role_keywords": [
        "Software Engineer",
        "Backend Engineer",
        "Full Stack Engineer",
        "Data Engineer",
        "ML Engineer",
    ],
}

# Companies whose career pages you want monitored closely.
# role_keywords filters which jobs get picked up per company.
WATCHLIST = [
    {
        "company_name": "Stripe",
        "careers_url": "https://stripe.com/jobs",
        "role_keywords": ["Software Engineer", "Backend"],
    },
    {
        "company_name": "Linear",
        "careers_url": "https://linear.app/careers",
        "role_keywords": ["Software Engineer"],
    },
]

# Paste 1-2 real cover letters you've written. AI matches this tone.
COVER_LETTER_SEEDS = [
    {
        "label": "default",
        "content": """\
Dear Hiring Manager,

I'm excited to apply for the Software Engineer role. [Replace this with a real
cover letter you've written — the AI will match its tone and style.]

Best,
Your Name
""",
    },
]

# Paste 1-2 real cold outreach emails you've sent. AI matches this tone.
OUTREACH_SEEDS = [
    {
        "label": "default",
        "content": """\
Hi [Name],

I came across [Company] and was really impressed by [specific thing]. I'm a
software engineer with experience in [X] and would love to learn more about
opportunities on your team.

Would you be open to a quick chat?

Best,
Your Name
""",
    },
]

# ── END EDIT SECTION ─────────────────────────────────────────────────────────


def seed():
    db = get_client()

    print("Seeding user_profile...")
    db.table("user_profile").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    db.table("user_profile").insert(USER_PROFILE).execute()

    print("Seeding preferences...")
    db.table("preferences").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    db.table("preferences").insert(PREFERENCES).execute()

    print("Seeding watchlist...")
    db.table("watchlist").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    if WATCHLIST:
        db.table("watchlist").insert(WATCHLIST).execute()

    print("Seeding cover_letter_seeds...")
    db.table("cover_letter_seeds").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    if COVER_LETTER_SEEDS:
        db.table("cover_letter_seeds").insert(COVER_LETTER_SEEDS).execute()

    print("Seeding outreach_seeds...")
    db.table("outreach_seeds").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    if OUTREACH_SEEDS:
        db.table("outreach_seeds").insert(OUTREACH_SEEDS).execute()

    print("Done. All tables seeded.")


if __name__ == "__main__":
    seed()
