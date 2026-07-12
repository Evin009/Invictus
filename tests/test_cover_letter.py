import pytest
from unittest.mock import MagicMock, patch

from src.agents.cover_letter import generate_cover_letter, _fetch_cover_letter_seed, _fetch_user_profile
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


# --- _fetch_cover_letter_seed ---

def test_fetch_cover_letter_seed_returns_content_and_mode():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"content": SAMPLE_SEED, "mode": "reuse"}
    ]
    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        result = _fetch_cover_letter_seed()
    assert result == {"content": SAMPLE_SEED, "mode": "reuse"}


def test_fetch_cover_letter_seed_defaults_to_tone_only_when_mode_missing():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"content": SAMPLE_SEED}
    ]
    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        result = _fetch_cover_letter_seed()
    assert result == {"content": SAMPLE_SEED, "mode": "tone_only"}


def test_fetch_cover_letter_seed_returns_empty_when_no_seeds():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        result = _fetch_cover_letter_seed()
    assert result == {"content": "", "mode": "tone_only"}


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
            with patch("src.agents.cover_letter.upload_file", return_value="storage.txt") as mock_upload:
                result = generate_cover_letter(_job(), output_dir=str(tmp_path))

    assert "cover_letter_path" in result
    assert "word_count" in result
    assert result["cover_letter_path"] == "storage.txt"
    mock_upload.assert_called_once()
    assert mock_upload.call_args[0][0] == "cover-letters"


def test_generate_cover_letter_saves_file(tmp_path):
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=SAMPLE_LETTER)]

    captured = {}

    def _fake_upload(bucket, dest_path, local_path):
        captured["local_path"] = local_path
        return dest_path

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.cover_letter.upload_file", side_effect=_fake_upload):
                generate_cover_letter(_job(), output_dir=str(tmp_path))

    import os
    assert os.path.exists(captured["local_path"])


def test_generate_cover_letter_raises_on_empty_letter(tmp_path):
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="")]

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.cover_letter.post_error") as mock_err:
                with pytest.raises(RuntimeError, match="empty"):
                    generate_cover_letter(_job(), output_dir=str(tmp_path))
            mock_err.assert_called_once()


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
            with patch("src.agents.cover_letter.upload_file", return_value="storage.txt"):
                generate_cover_letter(_job(), output_dir=str(tmp_path))

    prompt = mock_client.messages.create.call_args[1]["messages"][0]["content"]
    assert "Acme" in prompt
    assert "Software Engineer" in prompt
    assert SAMPLE_SEED in prompt


def test_generate_cover_letter_reuse_mode_edits_base_letter(tmp_path):
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"content": SAMPLE_SEED, "mode": "reuse"}
    ]

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=SAMPLE_LETTER)]

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.cover_letter.upload_file", return_value="storage.txt"):
                generate_cover_letter(_job(), output_dir=str(tmp_path))

    prompt = mock_client.messages.create.call_args[1]["messages"][0]["content"]
    assert "Edit it for a new job" in prompt
    assert SAMPLE_SEED in prompt


def test_generate_cover_letter_tone_only_mode_writes_fresh_letter(tmp_path):
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [
        {"content": SAMPLE_SEED, "mode": "tone_only"}
    ]

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=SAMPLE_LETTER)]

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.cover_letter.upload_file", return_value="storage.txt"):
                generate_cover_letter(_job(), output_dir=str(tmp_path))

    prompt = mock_client.messages.create.call_args[1]["messages"][0]["content"]
    assert "Edit it for a new job" not in prompt
    assert "Tone example" in prompt


def test_generate_cover_letter_word_count_in_result(tmp_path):
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=SAMPLE_LETTER)]

    with patch("src.agents.cover_letter.get_client", return_value=mock_db):
        with patch("src.agents.cover_letter.anthropic.Anthropic", return_value=mock_client):
            with patch("src.agents.cover_letter.upload_file", return_value="storage.txt"):
                result = generate_cover_letter(_job(), output_dir=str(tmp_path))

    assert result["word_count"] == len(SAMPLE_LETTER.split())
    assert result["word_count"] <= 350
