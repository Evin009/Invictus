import math
from unittest.mock import MagicMock, patch

from src.rag.retriever import retrieve_bullets


def _mock_db(rows: list[dict]) -> MagicMock:
    mock = MagicMock()
    mock.rpc.return_value.execute.return_value.data = rows
    return mock


# --- retrieve_bullets ---

def test_retrieve_bullets_returns_list():
    rows = [
        {"bullet_text": "Built scalable microservices", "similarity": 0.92},
        {"bullet_text": "Led team of 5 engineers", "similarity": 0.87},
    ]
    with patch("src.rag.retriever.get_client", return_value=_mock_db(rows)):
        result = retrieve_bullets("We need a backend engineer", top_k=5)
    assert isinstance(result, list)
    assert len(result) == 2


def test_retrieve_bullets_calls_rpc_with_embedding():
    rows = [{"bullet_text": "Some bullet", "similarity": 0.9}]
    mock_db = _mock_db(rows)
    with patch("src.rag.retriever.get_client", return_value=mock_db):
        retrieve_bullets("software engineer role", top_k=3)
    mock_db.rpc.assert_called_once()
    call_args = mock_db.rpc.call_args
    assert call_args[0][0] == "match_bullets"
    params = call_args[0][1]
    assert "query_embedding" in params
    assert params["match_count"] == 3
    assert len(params["query_embedding"]) == 1536


def test_retrieve_bullets_returns_text_only():
    rows = [
        {"bullet_text": "Built scalable microservices", "similarity": 0.92},
    ]
    with patch("src.rag.retriever.get_client", return_value=_mock_db(rows)):
        result = retrieve_bullets("backend role", top_k=5)
    assert result == ["Built scalable microservices"]


def test_retrieve_bullets_default_top_k():
    rows = [{"bullet_text": f"Bullet {i}", "similarity": 0.9 - i * 0.01} for i in range(10)]
    mock_db = _mock_db(rows)
    with patch("src.rag.retriever.get_client", return_value=mock_db):
        retrieve_bullets("engineer role")
    params = mock_db.rpc.call_args[0][1]
    assert params["match_count"] == 5


def test_retrieve_bullets_empty_db_returns_empty():
    with patch("src.rag.retriever.get_client", return_value=_mock_db([])):
        result = retrieve_bullets("any job description", top_k=5)
    assert result == []


def test_retrieve_bullets_none_data_returns_empty():
    mock_db = MagicMock()
    mock_db.rpc.return_value.execute.return_value.data = None
    with patch("src.rag.retriever.get_client", return_value=mock_db):
        result = retrieve_bullets("any job description", top_k=5)
    assert result == []


def test_retrieve_bullets_raises_on_db_error():
    mock_db = MagicMock()
    mock_db.rpc.return_value.execute.side_effect = Exception("RPC failed")
    with patch("src.rag.retriever.get_client", return_value=mock_db):
        with patch("src.rag.retriever.post_error") as mock_err:
            try:
                retrieve_bullets("engineer role", top_k=5)
                assert False, "Expected exception"
            except Exception as e:
                assert "RPC failed" in str(e)
            mock_err.assert_called_once()


def test_retrieve_bullets_embedding_is_normalized():
    captured = {}

    def fake_rpc(fn_name, params):
        captured["embedding"] = params["query_embedding"]
        mock = MagicMock()
        mock.execute.return_value.data = []
        return mock

    mock_db = MagicMock()
    mock_db.rpc.side_effect = fake_rpc

    with patch("src.rag.retriever.get_client", return_value=mock_db):
        retrieve_bullets("some job description", top_k=3)

    vec = captured["embedding"]
    magnitude = math.sqrt(sum(v * v for v in vec))
    assert abs(magnitude - 1.0) < 1e-6
