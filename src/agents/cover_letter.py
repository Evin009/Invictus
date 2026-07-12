import json
import re
from pathlib import Path

import anthropic

from src.config import settings
from src.db.client import get_client
from src.db.storage import upload_file
from src.notifications.slack import post_error
from src.state import JobItem
from src.utils import make_version_slug

_WORD_LIMIT = 350
COVER_LETTER_BUCKET = "cover-letters"


def generate_cover_letter(job: JobItem, output_dir: str = "output/cover_letters") -> dict:
    """
    Generate a job-specific cover letter via Claude, seeded with tone example, upload to Storage.
    Raises (after Slack alert) if output exceeds 350 words or is empty.
    Returns {"cover_letter_path": str, "word_count": int}
    cover_letter_path is the Supabase Storage object path (bucket "cover-letters").
    """
    try:
        seed = _fetch_cover_letter_seed()
        profile = _fetch_user_profile()

        if seed["content"] and seed["mode"] == "reuse":
            letter = _call_claude_reuse(job, seed["content"], profile)
        else:
            letter = _call_claude(job, seed["content"], profile)
        word_count = len(letter.split())
        if word_count == 0:
            raise RuntimeError(f"Cover letter is empty for {job['job_url']}")
        if word_count > _WORD_LIMIT:
            raise RuntimeError(f"Cover letter is {word_count} words (max {_WORD_LIMIT}) for {job['job_url']}")

        Path(output_dir).mkdir(parents=True, exist_ok=True)
        version = make_version_slug(job)
        path = str(Path(output_dir) / f"cover_{version}.txt")
        Path(path).write_text(letter, encoding="utf-8")

        storage_path = upload_file(COVER_LETTER_BUCKET, f"{version}.txt", path)

        return {"cover_letter_path": storage_path, "word_count": word_count}
    except Exception as e:
        post_error("cover_letter", str(e), {"job_url": job.get("job_url", "")})
        raise


def _fetch_cover_letter_seed() -> dict:
    """Return {"content": str, "mode": "reuse" | "tone_only"} from DB, or empty/tone_only if none.

    mode "reuse" means the seed IS the user's real cover letter — tailor it
    directly per job. mode "tone_only" (default) means it's just a style
    reference and a new letter is written from scratch each time.
    """
    db = get_client()
    rows = db.table("cover_letter_seeds").select("content,mode").limit(1).execute().data or []
    if not rows:
        return {"content": "", "mode": "tone_only"}
    return {"content": rows[0].get("content") or "", "mode": rows[0].get("mode") or "tone_only"}


def _fetch_user_profile() -> dict:
    """Return user profile dict from DB, or empty dict if none."""
    db = get_client()
    rows = db.table("user_profile").select("*").limit(1).execute().data or []
    return rows[0] if rows else {}


def _call_claude(job: JobItem, tone_seed: str, profile: dict) -> str:
    """Send job + profile + tone seed to Claude, return cover letter text."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    tone_section = f"\nTone example (match this voice, not content):\n{tone_seed}\n" if tone_seed else ""
    profile_section = f"\nApplicant profile:\n{json.dumps(profile, indent=2)}\n" if profile else ""

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
    return response.content[0].text.strip() if response.content else ""


def _call_claude_reuse(job: JobItem, base_letter: str, profile: dict) -> str:
    """Edit the user's own cover letter for this job, instead of writing a new one."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    profile_section = f"\nApplicant profile:\n{json.dumps(profile, indent=2)}\n" if profile else ""

    prompt = (
        f"Here is the applicant's own cover letter. Edit it for a new job application — "
        f"update the company name, role, and any specifics that no longer match, and adjust "
        f"emphasis toward what this job description asks for. Keep the applicant's original "
        f"structure, voice, and as much of the original wording as still fits. Do not invent "
        f"experience not in the applicant profile or the original letter.\n\n"
        f"Company: {job['company']}\n"
        f"Role: {job['title']}\n"
        f"Job description:\n{job['description'][:2000]}\n"
        f"{profile_section}\n"
        f"Applicant's cover letter to edit:\n{base_letter}\n\n"
        f"Requirements:\n"
        f"- Maximum {_WORD_LIMIT} words\n"
        f"- 1 page\n"
        f"Return only the edited cover letter text, no other commentary."
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip() if response.content else ""
