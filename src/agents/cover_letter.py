import re
from pathlib import Path

import anthropic

from src.config import settings
from src.db.client import get_client
from src.notifications.slack import post_error
from src.state import JobItem

_WORD_LIMIT = 350


def generate_cover_letter(job: JobItem, output_dir: str = "output/cover_letters") -> dict:
    """
    Generate a job-specific cover letter via Claude, seeded with tone example.
    Raises (after Slack alert) if output exceeds 350 words.
    Returns {"cover_letter_path": str, "word_count": int}
    """
    try:
        tone_seed = _fetch_tone_seed()
        profile = _fetch_user_profile()

        letter = _call_claude(job, tone_seed, profile)
        word_count = len(letter.split())
        if word_count > _WORD_LIMIT:
            raise RuntimeError(f"Cover letter is {word_count} words (max {_WORD_LIMIT}) for {job['job_url']}")

        Path(output_dir).mkdir(parents=True, exist_ok=True)
        version = re.sub(r"[^a-zA-Z0-9_-]", "_", f"{job['company']}_{job['job_id']}")[:50]
        path = str(Path(output_dir) / f"cover_{version}.txt")
        Path(path).write_text(letter, encoding="utf-8")

        return {"cover_letter_path": path, "word_count": word_count}
    except Exception as e:
        post_error("cover_letter", str(e), {"job_url": job.get("job_url", "")})
        raise


def _fetch_tone_seed() -> str:
    """Return first cover letter seed from DB, or empty string if none."""
    db = get_client()
    rows = db.table("cover_letter_seeds").select("content").limit(1).execute().data
    return rows[0]["content"] if rows else ""


def _fetch_user_profile() -> dict:
    """Return user profile dict from DB, or empty dict if none."""
    db = get_client()
    rows = db.table("user_profile").select("*").limit(1).execute().data
    return rows[0] if rows else {}


def _call_claude(job: JobItem, tone_seed: str, profile: dict) -> str:
    """Send job + profile + tone seed to Claude, return cover letter text."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    tone_section = f"\nTone example (match this voice, not content):\n{tone_seed}\n" if tone_seed else ""
    profile_section = f"\nApplicant profile:\n{profile}\n" if profile else ""

    prompt = (
        f"Write a cover letter for this job.\n\n"
        f"Company: {job['company']}\n"
        f"Role: {job['title']}\n"
        f"Job description:\n{job['description'][:2000]}\n"
        f"{profile_section}"
        f"{tone_section}\n"
        f"Requirements:\n"
        f"- Maximum {_WORD_LIMIT} words\n"
        f"- 1 page\n"
        f"- Specific to this role and company\n"
        f"- Do not invent experience not in the applicant profile\n"
        f"Return only the cover letter text, no other commentary."
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()
