"""
RAG router — endpoints for legal Q&A, document analysis, and knowledge base management.
"""
import io
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from rag.retrieval import retrieve_and_answer, analyze_document, chat_about_document
from rag.vectorstore import add_documents, get_stats
from rag.chunking import chunk_document
from rag.knowledge_base import seed_knowledge_base
from rag.web_search import search_indian_legal, search_recent_news

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    language: str = "en"
    chat_history: list = []
    enable_web_search: bool = True


class DocumentAnalysisRequest(BaseModel):
    text: str
    analysis_type: str = "summary"  # summary | faq | timeline | predictive | caselaw


class DocumentChatRequest(BaseModel):
    question: str
    document_text: str
    language: str = "en"
    chat_history: list = []


class WebSearchRequest(BaseModel):
    query: str
    max_results: int = 5


class IngestRequest(BaseModel):
    text: str
    source: str = "user_upload"
    category: str = "General"


@router.post("/chat")
async def rag_chat(body: ChatRequest):
    """
    RAG-powered legal chat with optional web search for up-to-date info.
    Also returns context management metadata.
    """
    result = retrieve_and_answer(
        question=body.question,
        language=body.language,
        chat_history=body.chat_history,
        enable_web_search=body.enable_web_search
    )
    return result


@router.post("/web-search")
async def web_search_endpoint(body: WebSearchRequest):
    """Standalone web search for Indian legal information."""
    results = search_indian_legal(body.query, max_results=body.max_results)
    news = search_recent_news(body.query, max_results=3)
    return {
        "results": results,
        "news": news,
        "query": body.query,
    }


@router.post("/analyze")
async def analyze_doc(body: DocumentAnalysisRequest):
    """
    Analyze a legal document (summary, FAQ, timeline, predictive, case law).
    """
    result = analyze_document(text=body.text, analysis_type=body.analysis_type)
    return result


@router.post("/doc-chat")
async def document_chat(body: DocumentChatRequest):
    """
    Chat about a specific uploaded document. Uses the document as primary context
    instead of the general knowledge base.
    """
    result = chat_about_document(
        question=body.question,
        document_text=body.document_text,
        language=body.language,
        chat_history=body.chat_history
    )
    return result


def _extract_text_from_file(content: bytes, filename: str) -> str:
    """Extract plain text from PDF, DOCX, or plain text files."""
    lower = filename.lower()

    if lower.endswith(".pdf"):
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(pages).strip()

    if lower.endswith(".docx"):
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())

    if lower.endswith(".doc"):
        # .doc (legacy binary format) — attempt basic decode; recommend .docx
        return content.decode("utf-8", errors="ignore")

    # .txt, .md, or any other plain text
    return content.decode("utf-8", errors="ignore")


@router.post("/analyze-file")
async def analyze_uploaded_file(
    file: UploadFile = File(...),
    analysis_type: str = Form("summary")
):
    """
    Upload a document and analyze it.
    Supports PDF (.pdf), Word (.docx), plain text (.txt), and Markdown (.md).
    """
    content = await file.read()
    text = _extract_text_from_file(content, file.filename)

    if not text.strip():
        return {"error": "Could not extract text from the file. The document may be scanned/image-based.", "filename": file.filename}

    # Also ingest into knowledge base for future retrieval
    chunks, metadatas = chunk_document(
        text, metadata={"source": file.filename, "category": "User Upload"}
    )
    add_documents(texts=chunks, metadatas=metadatas)

    result = analyze_document(text=text, analysis_type=analysis_type)
    result["filename"] = file.filename
    result["chunks_added"] = len(chunks)
    result["extracted_text"] = text  # Return full text for client-side analysis tabs & chat
    return result


@router.post("/ingest")
async def ingest_text(body: IngestRequest):
    """
    Ingest text content into the knowledge base for future retrieval.
    """
    chunks, metadatas = chunk_document(
        body.text,
        metadata={"source": body.source, "category": body.category}
    )
    count = add_documents(texts=chunks, metadatas=metadatas)
    return {"status": "ok", "chunks_added": count, "source": body.source}


@router.post("/ingest-file")
async def ingest_file(
    file: UploadFile = File(...),
    category: str = Form("General")
):
    """
    Upload and ingest a document (PDF, DOCX, TXT) into the knowledge base.
    """
    content = await file.read()
    text = _extract_text_from_file(content, file.filename)

    if not text.strip():
        return {"status": "error", "error": "Could not extract text from file", "filename": file.filename}

    chunks, metadatas = chunk_document(
        text, metadata={"source": file.filename, "category": category}
    )
    count = add_documents(texts=chunks, metadatas=metadatas)
    return {"status": "ok", "chunks_added": count, "filename": file.filename}


@router.get("/stats")
async def knowledge_stats():
    """Get knowledge base statistics."""
    return get_stats()


@router.post("/seed")
async def seed_kb():
    """Seed the knowledge base with built-in Indian legal knowledge."""
    result = seed_knowledge_base()
    return {"status": "ok", "result": result}
