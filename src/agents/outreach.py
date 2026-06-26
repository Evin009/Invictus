import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import anthropic

from src.config import settings
from src.db.client import get_client
from src.notifications.slack import post_error, post_message
from src.state import JobItem

_COOLDOWN_DAYS = 30
_HUNTER_DOMAIN_SEARCH = "https://api.hunter.io/v2/domain-search"


def run_outreach(job: JobItem) -> dict:
    try:
        contacts = _find_contacts(job)
        seed = _fetch_outreach_seed()
        reached = 0
        for contact in contacts:
            try:
                if _is_on_cooldown(contact.get("email", ""), contact.get("linkedin_url", "")):
                    continue
                message = _draft_message(contact, job, seed)
                if not message:
                    continue
                sent = False
                if contact.get("email"):
                    _send_email(contact, message, job)
                    _safe_log(contact, message, job, "email")
                    sent = True
                if contact.get("linkedin_url"):
                    _post_linkedin_draft(contact, message, job)
                    _safe_log(contact, message, job, "linkedin")
                    sent = True
                if sent:
                    reached += 1
            except Exception as e:
                post_error(
                    "outreach_agent",
                    str(e),
                    {"company": job["company"], "contact": contact.get("email", "")},
                )
                continue
        return {"contacts_reached": reached, "job_url": job["job_url"]}
    except Exception as e:
        post_error("outreach_agent", str(e), {"job_url": job["job_url"]})
        raise


def _find_contacts(job: JobItem) -> list[dict]:
    """Query Hunter.io by company name for up to 5 contacts."""
    if not settings.hunter_api_key:
        return []
    company = job["company"]
    if not company:
        return []
    url = (
        f"{_HUNTER_DOMAIN_SEARCH}"
        f"?company={urllib.parse.quote(company)}&limit=5&api_key={settings.hunter_api_key}"
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        post_error("outreach_agent", str(e), {"company": company})
        return []
    emails = (data.get("data") or {}).get("emails") or []
    return [
        {
            "name": f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(),
            "email": e.get("value", ""),
            "linkedin_url": e.get("linkedin", ""),
            "title": e.get("position", ""),
        }
        for e in emails
        if e.get("value")
    ]


def _extract_domain(job_url: str) -> str:
    """Extract hostname from URL. Note: for ATS URLs this returns the board host, not the company domain."""
    m = re.search(r"https?://(?:www\.)?([^/]+)", job_url)
    return m.group(1) if m else ""


def _is_on_cooldown(email: str, linkedin_url: str = "") -> bool:
    """Return True if this contact (by email or LinkedIn URL) was messaged within the last 30 days."""
    if not email and not linkedin_url:
        return False
    db = get_client()
    cutoff = (datetime.now(tz=timezone.utc) - timedelta(days=_COOLDOWN_DAYS)).isoformat()
    if email:
        rows = (
            db.table("outreach_log")
            .select("id")
            .eq("contact_email", email)
            .gte("sent_at", cutoff)
            .limit(1)
            .execute()
            .data or []
        )
        if rows:
            return True
    if linkedin_url:
        rows = (
            db.table("outreach_log")
            .select("id")
            .eq("contact_linkedin", linkedin_url)
            .gte("sent_at", cutoff)
            .limit(1)
            .execute()
            .data or []
        )
        if rows:
            return True
    return False


def _fetch_outreach_seed() -> str:
    try:
        db = get_client()
        rows = db.table("outreach_seeds").select("content").limit(1).execute().data or []
        return rows[0]["content"] if rows else ""
    except Exception as e:
        post_error("outreach_agent", str(e), {})
        return ""


def _draft_message(contact: dict, job: JobItem, seed: str) -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    seed_section = f"\nTone example:\n{seed}\n" if seed else ""
    prompt = (
        f"Write a cold outreach message to {contact.get('name') or 'the hiring team'} "
        f"({contact.get('title', '')}) at {job['company']} about the {job['title']} role.\n"
        f"Job URL: {job['job_url']}{seed_section}\n"
        "Keep it under 100 words. No subject line. Plain text only."
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip() if response.content else ""


def _send_email(contact: dict, message: str, job: JobItem) -> None:
    import base64
    import email.mime.text
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials.from_authorized_user_file(settings.gmail_credentials_path)
    service = build("gmail", "v1", credentials=creds)
    mime = email.mime.text.MIMEText(message)
    mime["to"] = contact["email"]
    mime["subject"] = f"Quick note re: {job['title']} at {job['company']}"
    raw = base64.urlsafe_b64encode(mime.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw}).execute()


def _post_linkedin_draft(contact: dict, message: str, job: JobItem) -> None:
    name = contact.get("name") or "contact"
    linkedin = contact.get("linkedin_url") or "no URL found"
    post_message(
        f"LinkedIn draft for {name} ({job['company']} — {job['title']}):\n"
        f"Profile: {linkedin}\n\n{message}"
    )


def _log_outreach(contact: dict, message: str, job: JobItem, channel: str) -> None:
    db = get_client()
    db.table("outreach_log").insert({
        "job_url": job["job_url"],
        "company": job["company"],
        "contact_name": contact.get("name", ""),
        "contact_email": contact.get("email", ""),
        "contact_linkedin": contact.get("linkedin_url", ""),
        "contact_title": contact.get("title", ""),
        "channel": channel,
        "message_text": message,
    }).execute()


def _safe_log(contact: dict, message: str, job: JobItem, channel: str) -> None:
    """Log outreach; alert Slack on DB failure but don't propagate — send already happened."""
    try:
        _log_outreach(contact, message, job, channel)
    except Exception as e:
        post_error(
            "outreach_agent",
            f"log failed after {channel} send: {e}",
            {"contact": contact.get("email", ""), "job_url": job["job_url"]},
        )
