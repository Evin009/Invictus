import math
import os
import tempfile
from unittest.mock import MagicMock, patch

from src.rag.embedder import _clean_tex, clean_tex, embed_resumes, embed_text, parse_bullets

SAMPLE_TEX = r"""
\section{Experience}
\begin{itemize}
  \item Built a web scraper using Python and Playwright
  \item Reduced API response time by 40\% through caching
\end{itemize}

\section{Projects}
\begin{itemize}
  \item Developed \textbf{Invictus}, an autonomous job application system
\end{itemize}
"""


# --- parse_bullets ---

def test_parse_bullets_extracts_all_bullets():
    bullets = parse_bullets(SAMPLE_TEX)
    assert len(bullets) == 3


def test_parse_bullets_tracks_sections():
    bullets = parse_bullets(SAMPLE_TEX)
    assert bullets[0]["section"] == "Experience"
    assert bullets[2]["section"] == "Projects"


def test_parse_bullets_cleans_latex():
    bullets = parse_bullets(SAMPLE_TEX)
    assert r"\textbf" not in bullets[2]["bullet_text"]
    assert "Invictus" in bullets[2]["bullet_text"]


def test_parse_bullets_empty_returns_empty():
    assert parse_bullets("") == []


def test_parse_bullets_no_section_uses_general():
    tex = r"\begin{itemize}" + "\n" + r"\item Some bullet" + "\n" + r"\end{itemize}"
    bullets = parse_bullets(tex)
    assert len(bullets) == 1
    assert bullets[0]["section"] == "general"


# --- _clean_tex ---

def test_clean_tex_strips_href():
    result = _clean_tex(r"\href{https://example.com}{Click here}")
    assert result == "Click here"


def test_clean_tex_strips_textbf():
    result = _clean_tex(r"Used \textbf{Python} for automation")
    assert result == "Used Python for automation"


def test_clean_tex_strips_emph():
    result = _clean_tex(r"This is \emph{important}")
    assert result == "This is important"


def test_clean_tex_normalizes_whitespace():
    result = _clean_tex("too    many   spaces")
    assert result == "too many spaces"


# --- embed_text ---

def test_embed_text_returns_1536_dims():
    vec = embed_text("software engineer")
    assert len(vec) == 1536


def test_embed_text_is_normalized():
    vec = embed_text("some bullet text")
    magnitude = math.sqrt(sum(v * v for v in vec))
    assert abs(magnitude - 1.0) < 1e-6


def test_embed_text_is_deterministic():
    assert embed_text("same text") == embed_text("same text")


def test_embed_text_differs_per_input():
    assert embed_text("text one") != embed_text("text two")


# --- embed_resumes ---

def test_embed_resumes_upserts_bullets():
    tex_content = r"""
\section{Experience}
\begin{itemize}
  \item Built scalable microservices
  \item Led team of 5 engineers
\end{itemize}
"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with open(os.path.join(tmpdir, "resume.tex"), "w") as f:
            f.write(tex_content)

        mock_db = MagicMock()
        with patch("src.rag.embedder.get_client", return_value=mock_db):
            count = embed_resumes(tmpdir)

    assert count == 2
    assert mock_db.table.return_value.upsert.call_count == 2


def test_embed_resumes_empty_dir_returns_zero():
    with tempfile.TemporaryDirectory() as tmpdir:
        mock_db = MagicMock()
        with patch("src.rag.embedder.get_client", return_value=mock_db):
            count = embed_resumes(tmpdir)
    assert count == 0


def test_embed_resumes_logs_error_and_continues_on_db_failure():
    tex_content = r"""
\section{X}
\begin{itemize}
  \item Bullet
\end{itemize}
"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with open(os.path.join(tmpdir, "resume.tex"), "w") as f:
            f.write(tex_content)

        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.side_effect = Exception("DB error")

        with patch("src.rag.embedder.get_client", return_value=mock_db):
            with patch("src.rag.embedder.post_error") as mock_err:
                count = embed_resumes(tmpdir)

        mock_err.assert_called_once()
        assert count == 0


def test_embed_resumes_upsert_payload_shape():
    tex_content = r"""
\section{Skills}
\begin{itemize}
  \item Python, Go, Rust
\end{itemize}
"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with open(os.path.join(tmpdir, "resume.tex"), "w") as f:
            f.write(tex_content)

        mock_db = MagicMock()
        with patch("src.rag.embedder.get_client", return_value=mock_db):
            embed_resumes(tmpdir)

    call_kwargs = mock_db.table.return_value.upsert.call_args
    payload = call_kwargs[0][0]
    assert "source_file" in payload
    assert "section" in payload
    assert "bullet_text" in payload
    assert "embedding" in payload
    assert len(payload["embedding"]) == 1536
