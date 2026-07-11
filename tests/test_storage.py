from unittest.mock import MagicMock, patch

from src.db.storage import upload_file


def test_upload_file_reads_local_bytes_and_uploads(tmp_path):
    local = tmp_path / "resume.pdf"
    local.write_bytes(b"%PDF-1.4 fake")

    mock_db = MagicMock()
    with patch("src.db.storage.get_client", return_value=mock_db):
        result = upload_file("resumes", "v1.pdf", str(local))

    mock_db.storage.from_.assert_called_once_with("resumes")
    upload_call = mock_db.storage.from_.return_value.upload
    upload_call.assert_called_once_with("v1.pdf", b"%PDF-1.4 fake", {"upsert": "true"})
    assert result == "v1.pdf"


def test_upload_file_returns_dest_path():
    local_content = b"cover letter text"

    mock_db = MagicMock()
    with patch("src.db.storage.get_client", return_value=mock_db):
        with patch("src.db.storage.Path") as mock_path_cls:
            mock_path_cls.return_value.read_bytes.return_value = local_content
            result = upload_file("cover-letters", "dest/v2.txt", "/tmp/whatever.txt")

    assert result == "dest/v2.txt"
