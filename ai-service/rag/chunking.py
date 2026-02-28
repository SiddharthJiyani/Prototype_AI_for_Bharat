"""
Text chunking utilities for splitting legal documents into embeddable chunks.
Uses langchain text splitters for smart chunking.
"""
from langchain_text_splitters import RecursiveCharacterTextSplitter


def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", ", ", " ", ""],
        length_function=len,
    )
    return splitter.split_text(text)


def chunk_document(text: str, metadata: dict = None, chunk_size: int = 800) -> tuple[list[str], list[dict]]:
    """
    Split a document into chunks with metadata propagation.
    Returns (chunks, metadatas) — each chunk inherits the parent metadata + chunk_index.
    """
    chunks = chunk_text(text, chunk_size=chunk_size)
    if metadata is None:
        metadata = {}
    metadatas = []
    for i, chunk in enumerate(chunks):
        m = {**metadata, "chunk_index": i, "total_chunks": len(chunks)}
        metadatas.append(m)
    return chunks, metadatas
