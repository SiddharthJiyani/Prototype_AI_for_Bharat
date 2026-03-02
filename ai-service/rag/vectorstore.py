"""
ChromaDB vector store wrapper for legal document storage & retrieval.
Uses sentence-transformers for local embeddings (free, no API key needed).
"""
import chromadb
from chromadb.config import Settings
import os

# Persistent storage in ai-service/data/chroma_db
CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db")

_client = None
_collection = None


def get_client():
    global _client
    if _client is None:
        os.makedirs(CHROMA_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
    return _client


def get_collection(name: str = "legal_knowledge"):
    """Get or create the legal knowledge collection with sentence-transformer embeddings."""
    global _collection
    if _collection is None:
        client = get_client()
        # Use ChromaDB's built-in sentence-transformer embedding
        # It will auto-download all-MiniLM-L6-v2 (~80MB) on first use
        from chromadb.utils import embedding_functions
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _collection = client.get_or_create_collection(
            name=name,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def add_documents(texts: list[str], metadatas: list[dict] = None, ids: list[str] = None):
    """Add documents to the vector store."""
    collection = get_collection()
    if ids is None:
        import uuid
        ids = [str(uuid.uuid4()) for _ in texts]
    if metadatas is None:
        metadatas = [{"source": "unknown"} for _ in texts]
    collection.add(documents=texts, metadatas=metadatas, ids=ids)
    return len(texts)


def query(text: str, n_results: int = 5, where: dict = None):
    """Query the vector store for relevant documents."""
    collection = get_collection()
    kwargs = {"query_texts": [text], "n_results": n_results}
    if where:
        kwargs["where"] = where
    results = collection.query(**kwargs)
    return results


def get_stats():
    """Get collection statistics."""
    collection = get_collection()
    return {"total_documents": collection.count()}


def delete_collection(name: str = "legal_knowledge"):
    """Delete the collection and reset the cached reference."""
    global _collection
    client = get_client()
    try:
        client.delete_collection(name=name)
    except Exception:
        pass
    _collection = None
