import json
import urllib.request
from src.config import settings


def post_message(text: str) -> None:
    payload = json.dumps({"text": text}).encode()
    req = urllib.request.Request(
        settings.slack_webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req):
        pass


def post_error(agent: str, error: str, context: dict) -> None:
    lines = [f":red_circle: *{agent} error*", f"```{error}```"]
    for k, v in context.items():
        lines.append(f"• {k}: {v}")
    post_message("\n".join(lines))


def post_summary(summary: dict) -> None:
    lines = [":bar_chart: *Invictus Hourly Summary*"]
    for k, v in summary.items():
        lines.append(f"• {k}: {v}")
    post_message("\n".join(lines))
