import anthropic

from src.config import settings
from src.db.client import get_client
from src.notifications.slack import post_error, post_message

_VALID_CLASSIFICATIONS = {
    "interview_request",
    "rejection",
    "follow_up_needed",
    "generic_acknowledgement",
    "recruiter_reply_to_outreach",
    "other",
}

_STATUS_MAP = {
    "interview_request": "interview",
    "rejection": "rejection",
}


def scan_replies() -> list[dict]:
    """
    Fetch unread Gmail messages, classify each, save to reply_log,
    update application status on interview/rejection, alert Slack on notable replies.
    Per-email errors are logged and skipped.
    """
    try:
        emails = _fetch_unread_emails()
    except Exception as e:
        post_error("reply_tracker", str(e), {"step": "fetch_unread_emails"})
        return []

    processed = []
    for email in emails:
        try:
            classification = _classify_reply(email["subject"], email["body"])
            job_url = _find_job_url(email["sender"])
            _save_reply(
                job_url=job_url,
                sender=email["sender"],
                subject=email["subject"],
                body=email["body"],
                classification=classification,
                channel="email",
            )
            _update_application_status(job_url, classification)
            _alert_if_notable(classification, email["sender"], email["subject"], job_url)
            processed.append({**email, "classification": classification, "job_url": job_url})
        except Exception as e:
            post_error("reply_tracker", str(e), {"sender": email.get("sender", "")})
            continue

    return processed


def _fetch_unread_emails() -> list[dict]:
    """Fetch unread messages from Gmail. Returns list of {sender, subject, body, message_id}."""
    import base64
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials.from_authorized_user_file(settings.gmail_credentials_path)
    service = build("gmail", "v1", credentials=creds)

    result = service.users().messages().list(
        userId="me", q="is:unread", maxResults=50
    ).execute()
    messages = result.get("messages") or []

    emails = []
    for msg in messages:
        full = service.users().messages().get(
            userId="me", id=msg["id"], format="full"
        ).execute()
        headers = {h["name"]: h["value"] for h in full.get("payload", {}).get("headers", [])}
        body = _extract_body(full.get("payload", {}))
        emails.append({
            "sender": headers.get("From", ""),
            "subject": headers.get("Subject", ""),
            "body": body,
            "message_id": msg["id"],
        })
    return emails


def _extract_body(payload: dict) -> str:
    """Recursively extract plaintext body from Gmail message payload."""
    if payload.get("mimeType") == "text/plain":
        import base64
        data = payload.get("body", {}).get("data", "")
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace") if data else ""
    for part in payload.get("parts") or []:
        text = _extract_body(part)
        if text:
            return text
    return ""


def _classify_reply(subject: str, body: str) -> str:
    """Classify email reply using Claude. Returns one of the valid classification labels."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = (
        "Classify this job application email reply into exactly one of these labels:\n"
        "interview_request, rejection, follow_up_needed, generic_acknowledgement, "
        "recruiter_reply_to_outreach, other\n\n"
        f"Subject: {subject}\n\nBody:\n{body}\n\n"
        "Reply with only the label, nothing else."
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=20,
        messages=[{"role": "user", "content": prompt}],
    )
    label = response.content[0].text.strip().lower() if response.content else ""
    return label if label in _VALID_CLASSIFICATIONS else "other"


def _find_job_url(sender: str) -> str | None:
    """Look up sender email in outreach_log to find the associated job URL."""
    db = get_client()
    rows = (
        db.table("outreach_log")
        .select("job_url")
        .eq("contact_email", sender)
        .limit(1)
        .execute()
        .data or []
    )
    return rows[0]["job_url"] if rows else None


def _save_reply(
    job_url: str | None,
    sender: str,
    subject: str,
    body: str,
    classification: str,
    channel: str,
) -> None:
    db = get_client()
    db.table("reply_log").insert({
        "job_url": job_url,
        "channel": channel,
        "sender": sender,
        "subject": subject,
        "body": body,
        "classification": classification,
    }).execute()


def _update_application_status(job_url: str | None, classification: str) -> None:
    """Update applications.status on interview_request or rejection."""
    if not job_url:
        return
    new_status = _STATUS_MAP.get(classification)
    if not new_status:
        return
    db = get_client()
    db.table("applications").update({"status": new_status}).eq("job_url", job_url).execute()


def _alert_if_notable(
    classification: str, sender: str, subject: str, job_url: str | None
) -> None:
    """Post Slack alert on interview_request or rejection."""
    if classification not in ("interview_request", "rejection"):
        return
    label = "Interview request" if classification == "interview_request" else "Rejection"
    job_part = f"\nJob: {job_url}" if job_url else ""
    post_message(f"{label} from {sender}\nSubject: {subject}{job_part}")
