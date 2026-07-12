import re

import openai

from src.config import settings
from src.db.client import get_client
from src.notifications.slack import post_error

_SOURCE_NAME = "resume_document"


def parse_bullets(tex_content: str) -> list[dict]:
    bullets = []
    current_section = "general"
    current_chunk_lines: list[str] = []

    section_pat = re.compile(r'\\(?:sub)*section\*?\{([^}]+)\}')
    item_pat = re.compile(r'\\item\s+(.*?)(?=\\item|\\end\{|$)', re.DOTALL)

    for line in tex_content.split('\n'):
        m = section_pat.search(line)
        if m:
            chunk = '\n'.join(current_chunk_lines)
            for item_m in item_pat.finditer(chunk):
                text = _clean_tex(item_m.group(1).strip())
                if text:
                    bullets.append({"section": current_section, "bullet_text": text})
            current_section = m.group(1).strip()
            current_chunk_lines = []
        else:
            current_chunk_lines.append(line)

    chunk = '\n'.join(current_chunk_lines)
    for item_m in item_pat.finditer(chunk):
        text = _clean_tex(item_m.group(1).strip())
        if text:
            bullets.append({"section": current_section, "bullet_text": text})

    return bullets


def clean_tex(text: str) -> str:
    text = re.sub(r'\\href\{[^}]*\}\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\\(?:text\w+|emph)\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\\[a-zA-Z]+\*?\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\\[a-zA-Z]+', '', text)
    return re.sub(r'\s+', ' ', text).strip()


_clean_tex = clean_tex  # backward-compat alias


def embed_text(text: str) -> list[float]:
    client = openai.OpenAI(api_key=settings.openai_api_key)
    resp = client.embeddings.create(model="text-embedding-3-small", input=text)
    return resp.data[0].embedding


def embed_resumes() -> int:
    """Parse the base resume from resume_document, embed bullets, upsert to resume_bullets.

    resume_document is written by onboarding's PDF-to-LaTeX conversion
    (ui/src/app/api/generate-resume-tex). Returns bullets processed.
    """
    db = get_client()
    total = 0

    rows = db.table("resume_document").select("tex_content").limit(1).execute().data or []
    if not rows:
        return 0

    try:
        bullets = parse_bullets(rows[0]["tex_content"])
        for bullet in bullets:
            db.table("resume_bullets").upsert(
                {
                    "source_file": _SOURCE_NAME,
                    "section": bullet["section"],
                    "bullet_text": bullet["bullet_text"],
                    "embedding": embed_text(bullet["bullet_text"]),
                },
                on_conflict="source_file,section,bullet_text",
            ).execute()
            total += 1
    except Exception as e:
        post_error("embed_resumes", str(e), {"source": _SOURCE_NAME})
        return 0

    return total
