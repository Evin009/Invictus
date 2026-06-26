import json
import pytest
from unittest.mock import MagicMock, patch

from src.agents.resume_tailor import (
    _compile_tex,
    _get_page_count,
    _rewrite_bullets,
    _substitute_bullets,
    tailor_resume,
)
from src.state import JobItem


def _job(**overrides) -> JobItem:
    base = JobItem(
        job_url="https://acme.com/jobs/swe-1",
        job_id="swe-1",
        title="Software Engineer",
        company="Acme",
        source="greenhouse",
        description="We need a Python engineer who builds scalable systems.",
        ats_platform="greenhouse",
        raw_json={},
    )
    return {**base, **overrides}


SAMPLE_TEX = r"""
\section{Experience}
\begin{itemize}
  \item Built a web scraper using Python
  \item Led team of 5 engineers
\end{itemize}
"""

REWRITTEN_PAIRS = [
    {"original": "Built a web scraper using Python", "rewritten": "Built scalable Python scraper handling 10k req/day"},
    {"original": "Led team of 5 engineers", "rewritten": "Led 5-person team delivering Python microservices"},
]


# --- _substitute_bullets ---

def test_substitute_replaces_matched_bullet():
    replacements = {"Built a web scraper using Python": "Built scalable Python scraper"}
    result = _substitute_bullets(SAMPLE_TEX, replacements)
    assert "Built scalable Python scraper" in result
    assert "Built a web scraper using Python" not in result


def test_substitute_leaves_unmatched_bullets_intact():
    replacements = {"Built a web scraper using Python": "Rewritten version"}
    result = _substitute_bullets(SAMPLE_TEX, replacements)
    assert "Led team of 5 engineers" in result


def test_substitute_empty_replacements_returns_unchanged():
    result = _substitute_bullets(SAMPLE_TEX, {})
    assert result == SAMPLE_TEX


def test_substitute_multiple_replacements():
    replacements = {
        "Built a web scraper using Python": "New bullet A",
        "Led team of 5 engineers": "New bullet B",
    }
    result = _substitute_bullets(SAMPLE_TEX, replacements)
    assert "New bullet A" in result
    assert "New bullet B" in result


# --- _rewrite_bullets ---

def test_rewrite_bullets_returns_original_to_rewritten_mapping():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [
        MagicMock(text=json.dumps(REWRITTEN_PAIRS))
    ]
    with patch("src.agents.resume_tailor.anthropic.Anthropic", return_value=mock_client):
        result = _rewrite_bullets(
            ["Built a web scraper using Python", "Led team of 5 engineers"],
            "Python engineer role with scalable systems",
            "Software Engineer",
        )
    assert result["Built a web scraper using Python"] == "Built scalable Python scraper handling 10k req/day"
    assert result["Led team of 5 engineers"] == "Led 5-person team delivering Python microservices"


def test_rewrite_bullets_empty_list_skips_claude():
    with patch("src.agents.resume_tailor.anthropic.Anthropic") as mock_cls:
        result = _rewrite_bullets([], "jd", "title")
    assert result == {}
    mock_cls.assert_not_called()


def test_rewrite_bullets_passes_job_context_to_claude():
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="[]")]
    with patch("src.agents.resume_tailor.anthropic.Anthropic", return_value=mock_client):
        _rewrite_bullets(["some bullet"], "Python systems engineer", "Backend Engineer")
    call_content = mock_client.messages.create.call_args[1]["messages"][0]["content"]
    assert "Python systems engineer" in call_content
    assert "Backend Engineer" in call_content


# --- _compile_tex ---

def test_compile_tex_returns_pdf_path_on_success():
    mock_run = MagicMock()
    mock_run.returncode = 0
    with patch("src.agents.resume_tailor.subprocess.run", return_value=mock_run):
        pdf = _compile_tex("/tmp/resume.tex", "/tmp/out")
    assert pdf == "/tmp/out/resume.pdf"


def test_compile_tex_raises_on_nonzero_exit():
    mock_run = MagicMock()
    mock_run.returncode = 1
    mock_run.stderr = "! Undefined control sequence"
    with patch("src.agents.resume_tailor.subprocess.run", return_value=mock_run):
        with pytest.raises(RuntimeError, match="latexmk failed"):
            _compile_tex("/tmp/resume.tex", "/tmp/out")


# --- _get_page_count ---

def test_get_page_count_parses_pdfinfo_output():
    mock_run = MagicMock()
    mock_run.returncode = 0
    mock_run.stdout = "Title: Resume\nAuthor: Evin\nPages: 2\nFile size: 50000 bytes\n"
    with patch("src.agents.resume_tailor.subprocess.run", return_value=mock_run):
        assert _get_page_count("/tmp/resume.pdf") == 2


def test_get_page_count_raises_on_pdfinfo_failure():
    mock_run = MagicMock()
    mock_run.returncode = 1
    mock_run.stderr = "No such file"
    with patch("src.agents.resume_tailor.subprocess.run", return_value=mock_run):
        with pytest.raises(RuntimeError):
            _get_page_count("/tmp/missing.pdf")


def test_get_page_count_single_page():
    mock_run = MagicMock()
    mock_run.returncode = 0
    mock_run.stdout = "Pages: 1\n"
    with patch("src.agents.resume_tailor.subprocess.run", return_value=mock_run):
        assert _get_page_count("/tmp/resume.pdf") == 1


# --- tailor_resume (integration) ---

def test_tailor_resume_returns_required_keys(tmp_path):
    tex_path = tmp_path / "resume.tex"
    tex_path.write_text(SAMPLE_TEX)

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=json.dumps(REWRITTEN_PAIRS))]

    with patch("src.agents.resume_tailor.retrieve_bullets", return_value=["Built a web scraper using Python"]):
        with patch("src.agents.resume_tailor.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.resume_tailor._compile_tex", return_value=str(tmp_path / "resume_Acme_swe-1.pdf")):
                with patch("src.agents.resume_tailor._get_page_count", return_value=1):
                    result = tailor_resume(_job(), str(tex_path), str(tmp_path))

    assert "resume_pdf_path" in result
    assert "resume_version" in result
    assert "tailored_bullets" in result


def test_tailor_resume_alerts_and_raises_on_page_overflow(tmp_path):
    tex_path = tmp_path / "resume.tex"
    tex_path.write_text(SAMPLE_TEX)

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="[]")]

    with patch("src.agents.resume_tailor.retrieve_bullets", return_value=[]):
        with patch("src.agents.resume_tailor.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.resume_tailor._compile_tex", return_value=str(tmp_path / "resume.pdf")):
                with patch("src.agents.resume_tailor._get_page_count", return_value=3):
                    with patch("src.agents.resume_tailor.post_error") as mock_err:
                        with pytest.raises(RuntimeError, match="3 pages"):
                            tailor_resume(_job(), str(tex_path), str(tmp_path))
                        mock_err.assert_called_once()


def test_tailor_resume_alerts_and_raises_on_compile_failure(tmp_path):
    tex_path = tmp_path / "resume.tex"
    tex_path.write_text(SAMPLE_TEX)

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="[]")]

    with patch("src.agents.resume_tailor.retrieve_bullets", return_value=[]):
        with patch("src.agents.resume_tailor.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.resume_tailor._compile_tex", side_effect=RuntimeError("latexmk failed: error")):
                with patch("src.agents.resume_tailor.post_error") as mock_err:
                    with pytest.raises(RuntimeError):
                        tailor_resume(_job(), str(tex_path), str(tmp_path))
                    mock_err.assert_called_once()


def test_tailor_resume_version_sanitizes_special_chars(tmp_path):
    tex_path = tmp_path / "resume.tex"
    tex_path.write_text(SAMPLE_TEX)

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="[]")]
    job = _job(company="Acme Corp.", job_id="swe 1")

    with patch("src.agents.resume_tailor.retrieve_bullets", return_value=[]):
        with patch("src.agents.resume_tailor.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.resume_tailor._compile_tex", return_value=str(tmp_path / "resume.pdf")):
                with patch("src.agents.resume_tailor._get_page_count", return_value=1):
                    result = tailor_resume(job, str(tex_path), str(tmp_path))

    assert " " not in result["resume_version"]
    assert "." not in result["resume_version"]
