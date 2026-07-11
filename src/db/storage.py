from pathlib import Path

from src.db.client import get_client


def upload_file(bucket: str, dest_path: str, local_path: str) -> str:
    """Upload local file to Supabase Storage, overwriting if present. Returns dest_path."""
    db = get_client()
    data = Path(local_path).read_bytes()
    db.storage.from_(bucket).upload(dest_path, data, {"upsert": "true"})
    return dest_path
