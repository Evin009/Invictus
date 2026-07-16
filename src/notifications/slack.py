import json
import urllib.request


def _fetch_webhook_url() -> str:
    """Return the connected Slack webhook URL, or empty string if not connected.

    Connected via OAuth from the Settings page (ui/src/app/api/integrations/slack) —
    see slack_integration table. Import is local to avoid a circular import with
    src.db.client at module load time.
    """
    from src.db.client import get_client

    db = get_client()
    rows = db.table("slack_integration").select("webhook_url").limit(1).execute().data or []
    return rows[0]["webhook_url"] if rows else ""


def post_message(text: str) -> None:
    webhook_url = _fetch_webhook_url()
    if not webhook_url:
        return
    payload = json.dumps({"text": text}).encode()
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req):
        pass


def post_error(agent: str, error: str, context: dict) -> None:
    lines = [f":red_circle: *{agent} error*", f"```{error}```"]
    for k, v in context.items():
        lines.append(f"• {k}: {v}")
    text = "\n".join(lines)

    # Always print — cron redirects stdout to /var/log/invictus.log, so this
    # is the only trace of a failure until Slack is connected. Without it,
    # every per-agent error was being swallowed with zero visibility.
    print(text, flush=True)

    try:
        post_message(text)
    except Exception:
        pass


def post_summary(summary: dict) -> None:
    lines = [":bar_chart: *Invictus Hourly Summary*"]
    for k, v in summary.items():
        lines.append(f"• {k}: {v}")
    post_message("\n".join(lines))
