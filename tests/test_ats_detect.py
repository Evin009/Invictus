import json
from unittest.mock import patch, MagicMock

from src.agents.ats_detect import _slug_candidates, detect_ats


def test_slug_candidates_no_separator_and_hyphenated():
    candidates = _slug_candidates("Blue Origin")
    assert "blueorigin" in candidates
    assert "blue-origin" in candidates


def test_slug_candidates_dedupes_when_single_word():
    candidates = _slug_candidates("Acme")
    assert candidates == ["acme"]


def _mock_response(payload):
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value.status = 200
    mock_cm.__enter__.return_value.read.return_value = json.dumps(payload).encode()
    return mock_cm


def test_detect_ats_finds_greenhouse_match():
    with patch("urllib.request.urlopen", return_value=_mock_response({"jobs": []})):
        result = detect_ats("Acme")
    assert result == ("greenhouse", "acme")


def test_detect_ats_falls_back_to_lever_when_greenhouse_fails():
    call_count = {"n": 0}

    def urlopen_side(req, timeout=None):
        call_count["n"] += 1
        if "greenhouse" in req.full_url:
            raise __import__("urllib.error", fromlist=["URLError"]).URLError("404")
        return _mock_response([])

    with patch("urllib.request.urlopen", side_effect=urlopen_side):
        result = detect_ats("Acme")
    assert result == ("lever", "acme")


def test_detect_ats_returns_none_when_neither_platform_matches():
    with patch("urllib.request.urlopen", side_effect=__import__("urllib.error", fromlist=["URLError"]).URLError("404")):
        result = detect_ats("Totally Unknown Corp")
    assert result is None


def test_detect_ats_rejects_malformed_greenhouse_response():
    with patch("urllib.request.urlopen", return_value=_mock_response({"not_jobs": []})):
        with patch("urllib.error.URLError", Exception):
            result = detect_ats("Acme")
    assert result != ("greenhouse", "acme")


def test_detect_ats_falls_back_to_ashby():
    def urlopen_side(req, timeout=None):
        if "ashbyhq" in req.full_url:
            return _mock_response({"jobs": []})
        raise __import__("urllib.error", fromlist=["URLError"]).URLError("404")

    with patch("urllib.request.urlopen", side_effect=urlopen_side):
        result = detect_ats("Acme")
    assert result == ("ashby", "acme")


def test_detect_ats_falls_back_to_smartrecruiters():
    def urlopen_side(req, timeout=None):
        if "smartrecruiters" in req.full_url:
            return _mock_response({"content": [], "totalFound": 3})
        raise __import__("urllib.error", fromlist=["URLError"]).URLError("404")

    with patch("urllib.request.urlopen", side_effect=urlopen_side):
        result = detect_ats("Acme")
    assert result == ("smartrecruiters", "acme")


def test_detect_ats_rejects_smartrecruiters_empty_totalfound():
    """SmartRecruiters returns 200 + empty content for ANY slug, real or
    fake — confirmed live. totalFound must be > 0 or every company would
    falsely match this platform."""
    with patch("urllib.request.urlopen", return_value=_mock_response({"content": [], "totalFound": 0})):
        result = detect_ats("Totally Fake Corp")
    assert result != ("smartrecruiters", "totallyfakecorp")
