import json
import re
import subprocess
from pathlib import Path

import anthropic

from src.config import settings
from src.notifications.slack import post_error
from src.rag.embedder import _clean_tex
from src.rag.retriever import retrieve_bullets
from src.state import JobItem


def tailor_resume(job: JobItem, tex_path: str, output_dir: str = "output/resumes") -> dict:
    """
    Retrieve matching bullets, rewrite with Claude, compile to PDF.
    Raises (after Slack alert) on compile failure or >2 pages.
    Returns {"resume_pdf_path": str, "resume_version": str, "tailored_bullets": list[str]}
    """
    try:
        top_bullets = retrieve_bullets(job["description"], top_k=5)
        rewritten = _rewrite_bullets(top_bullets, job["description"], job["title"])

        tex_content = Path(tex_path).read_text(encoding="utf-8")
        tailored_tex = _substitute_bullets(tex_content, rewritten)

        Path(output_dir).mkdir(parents=True, exist_ok=True)
        version = re.sub(r"[^a-zA-Z0-9_-]", "_", f"{job['company']}_{job['job_id']}")[:50]
        tailored_tex_path = str(Path(output_dir) / f"resume_{version}.tex")
        Path(tailored_tex_path).write_text(tailored_tex, encoding="utf-8")

        pdf_path = _compile_tex(tailored_tex_path, output_dir)
        pages = _get_page_count(pdf_path)
        if pages > 2:
            raise RuntimeError(f"Resume is {pages} pages (max 2) for {job['job_url']}")

        return {
            "resume_pdf_path": pdf_path,
            "resume_version": version,
            "tailored_bullets": list(rewritten.values()),
        }
    except Exception as e:
        post_error("resume_tailor", str(e), {"job_url": job.get("job_url", "")})
        raise


def _rewrite_bullets(bullets: list[str], job_description: str, job_title: str) -> dict[str, str]:
    """Call Claude to rewrite bullets for the job. Returns {original: rewritten}."""
    if not bullets:
        return {}

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = (
        f"Job title: {job_title}\n\n"
        f"Job description:\n{job_description[:2000]}\n\n"
        f"Resume bullets to tailor:\n{json.dumps(bullets, indent=2)}\n\n"
        "Rewrite each bullet to better match this job. Keep the same accomplishment — only adjust "
        "wording to align with the job's language and priorities. Do not invent achievements. "
        'Return a JSON array where each object has "original" and "rewritten" keys. Return only the JSON array.'
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    pairs = json.loads(response.content[0].text.strip())
    return {pair["original"]: pair["rewritten"] for pair in pairs}


def _substitute_bullets(tex_content: str, replacements: dict[str, str]) -> str:
    """Swap bullet content in .tex for each original→rewritten pair."""
    if not replacements:
        return tex_content

    item_pat = re.compile(r"(\\item\s+)(.*?)(?=\\item|\\end\{|$)", re.DOTALL)

    def _replace(m: re.Match) -> str:
        prefix, content = m.group(1), m.group(2)
        cleaned = _clean_tex(content.strip())
        if cleaned in replacements:
            return prefix + replacements[cleaned] + "\n"
        return m.group(0)

    return item_pat.sub(_replace, tex_content)


def _compile_tex(tex_path: str, output_dir: str) -> str:
    """Compile .tex with latexmk. Raises RuntimeError on failure."""
    result = subprocess.run(
        ["latexmk", "-pdf", f"-outdir={output_dir}", "-interaction=nonstopmode", tex_path],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"latexmk failed: {result.stderr[:300]}")
    return str(Path(output_dir) / (Path(tex_path).stem + ".pdf"))


def _get_page_count(pdf_path: str) -> int:
    """Get PDF page count via pdfinfo. Raises RuntimeError on failure."""
    result = subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"pdfinfo failed: {result.stderr[:200]}")
    for line in result.stdout.split("\n"):
        if line.startswith("Pages:"):
            return int(line.split(":")[1].strip())
    raise RuntimeError(f"Could not read page count from {pdf_path}")
