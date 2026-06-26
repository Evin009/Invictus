import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    anthropic_api_key: str
    supabase_url: str
    supabase_key: str
    slack_webhook_url: str
    gmail_credentials_path: str
    hunter_api_key: str
    greenhouse_api_key: str
    lever_api_key: str
    github_token: str
    base_resume_tex: str


settings = Settings(
    anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
    supabase_url=os.environ["SUPABASE_URL"],
    supabase_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    slack_webhook_url=os.environ["SLACK_WEBHOOK_URL"],
    gmail_credentials_path=os.environ.get("GMAIL_CREDENTIALS_PATH", "credentials.json"),
    hunter_api_key=os.environ["HUNTER_API_KEY"],
    greenhouse_api_key=os.environ.get("GREENHOUSE_API_KEY", ""),
    lever_api_key=os.environ.get("LEVER_API_KEY", ""),
    github_token=os.environ.get("GITHUB_TOKEN", ""),
    base_resume_tex=os.environ.get("BASE_RESUME_TEX", "resumes/resume.tex"),
)
