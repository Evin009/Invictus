import pytest
from unittest.mock import MagicMock, patch

from src.agents.cover_letter import generate_cover_letter, _fetch_tone_seed, _fetch_user_profile
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


SAMPLE_PROFILE = {
    "full_name": "Evin Bento",
    "email": "evin@example.com",
    "education": [{"school": "USF", "degree": "BS CS"}],
    "skills": ["Python", "Go"],
}

SAMPLE_SEED = "Dear Hiring Manager, I am excited to apply..."

SAMPLE_LETTER = "Dear Hiring Manager,\n\nI am a Python engineer with experience building scalable systems.\n\nSincerely,\nEvin Bento"


# --- _fetch_tone_seed ---

def test_fetch_tone_seed_returns_content():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"content": SAMPLE_SEED}
    ]
    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        result = _fetch_tone_seed()
    assert result == SAMPLE_SEED


def test_fetch_tone_seed_returns_empty_string_when_no_seeds():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        result = _fetch_tone_seed()
    assert result == ""


# --- _fetch_user_profile ---

def test_fetch_user_profile_returns_dict():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [SAMPLE_PROFILE]
    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        result = _fetch_user_profile()
    assert result == SAMPLE_PROFILE


def test_fetch_user_profile_returns_empty_dict_when_no_profile():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        result = _fetch_user_profile()
    assert result == {}


# --- generate_cover_letter ---

def test_generate_cover_letter_returns_required_keys(tmp_path):
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"content": SAMPLE_SEED}
    ]

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=SAMPLE_LETTER)]

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            result = generate_cover_letter(_job(), output_dir=str(tmp_path))

    assert "cover_letter_path" in result
    assert "word_count" in result


def test_generate_cover_letter_saves_file(tmp_path):
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=SAMPLE_LETTER)]

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            result = generate_cover_letter(_job(), output_dir=str(tmp_path))

    import os
    assert os.path.exists(result["cover_letter_path"])


def test_generate_cover_letter_enforces_350_word_cap(tmp_path):
    long_letter = " ".join(["word"] * 400)

    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=long_letter)]

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.cover_letter.post_error") as mock_err:
                with pytest.raises(RuntimeError, match="350"):
                    generate_cover_letter(_job(), output_dir=str(tmp_path))
            mock_err.assert_called_once()


def test_generate_cover_letter_passes_job_and_tone_to_claude(tmp_path):
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"content": SAMPLE_SEED}
    ]

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=SAMPLE_LETTER)]

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            generate_cover_letter(_job(), output_dir=str(tmp_path))

    prompt = mock_client.messages.create.call_args[1]["messages"][0]["content"]
    assert "Acme" in prompt
    assert "Software Engineer" in prompt
    assert SAMPLE_SEED in prompt


def test_generate_cover_letter_word_count_in_result(tmp_path):
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=SAMPLE_LETTER)]

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            result = generate_cover_letter(_job(), output_dir=str(tmp_path))

    assert result["word_count"] == len(SAMPLE_LETTER.split())
    assert result["word_count"] <= 350
