from src.db.client import get_client
from src.notifications.slack import post_error
from src.rag.embedder import embed_text


def retrieve_bullets(job_description: str, top_k: int = 5) -> list[str]:
    """Embed job description, query match_bullets, return top-k bullet texts."""
    db = get_client()
    try:
        embedding = embed_text(job_description)
        rows = db.rpc("match_bullets", {"query_embedding": embedding, "match_count": top_k}).execute().data or []
        return [row["bullet_text"] for row in rows]
    except Exception as e:
        post_error("retrieve_bullets", str(e), {"top_k": top_k})
        raise
