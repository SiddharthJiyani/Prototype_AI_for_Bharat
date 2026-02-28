"""
Indian Kanoon API integration — searches Indian court judgments, acts, and legal documents.
API docs: https://api.indiankanoon.org/doc/

Requires INDIAN_KANOON_TOKEN env var for the official API.
Falls back to DuckDuckGo site-scoped search on indiankanoon.org if no token is set.
"""
import os
import re
import traceback
from typing import Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

KANOON_API_BASE = "https://api.indiankanoon.org"

def _get_token() -> str:
    """Read token lazily so .env is always loaded first."""
    return os.getenv("INDIAN_KANOON_TOKEN", "")

# ── Helpers ──

def _clean_html(text: str) -> str:
    """Strip HTML tags and collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _truncate(text: str, max_len: int = 500) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len].rsplit(" ", 1)[0] + "…"


# ══════════════════════════════════════════
#  Official Indian Kanoon API
# ══════════════════════════════════════════

def _api_search(query: str, page: int = 0, max_results: int = 5) -> list[dict]:
    """
    Search Indian Kanoon via the official API.
    Returns list of { title, doc_id, headline, court, date, url, snippet }.
    """
    token = _get_token()
    if not token:
        return []

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"{KANOON_API_BASE}/search/",
                data={"formInput": query, "pagenum": page},
                headers={
                    "Authorization": f"Token {token}",
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        docs = data.get("docs", [])[:max_results]
        results = []
        for doc in docs:
            doc_id = doc.get("tid", "")
            title = _clean_html(doc.get("title", ""))
            headline = _clean_html(doc.get("headline", ""))
            court = doc.get("docsource", "")

            # Extract date
            pub_date = doc.get("publishdate", "")

            results.append({
                "title": title,
                "doc_id": str(doc_id),
                "snippet": _truncate(headline, 400),
                "court": court,
                "date": pub_date,
                "url": f"https://indiankanoon.org/doc/{doc_id}/",
                "source": "Indian Kanoon",
            })

        print(f"[kanoon] API search returned {len(results)} results for: {query[:60]}")
        return results

    except Exception as e:
        print(f"[kanoon] API search failed: {e}")
        traceback.print_exc()
        return []


def _api_get_document(doc_id: str, max_chars: int = 3000) -> Optional[dict]:
    """
    Fetch a specific document/judgment from Indian Kanoon by doc ID.
    Returns { title, text, court, date, url } or None.
    """
    token = _get_token()
    if not token:
        return None

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"{KANOON_API_BASE}/doc/{doc_id}/",
                headers={
                    "Authorization": f"Token {token}",
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        title = _clean_html(data.get("title", ""))
        doc_text = _clean_html(data.get("doc", ""))
        court = data.get("docsource", "")
        pub_date = data.get("publishdate", "")

        return {
            "title": title,
            "text": _truncate(doc_text, max_chars),
            "court": court,
            "date": pub_date,
            "url": f"https://indiankanoon.org/doc/{doc_id}/",
            "doc_id": doc_id,
        }
    except Exception as e:
        print(f"[kanoon] Document fetch failed for {doc_id}: {e}")
        return None


# ══════════════════════════════════════════
#  DuckDuckGo fallback (no API token needed)
# ══════════════════════════════════════════

def _ddg_kanoon_search(query: str, max_results: int = 5) -> list[dict]:
    """
    Search Indian Kanoon via DuckDuckGo site-scoped search.
    Used as fallback when no API token is available.
    """
    try:
        from ddgs import DDGS
    except ImportError:
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            return []

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(
                f"site:indiankanoon.org {query}",
                region="in-en",
                max_results=max_results,
            ))

        parsed = []
        for r in results:
            url = r.get("href", "")
            # Extract doc ID from URL
            doc_id_match = re.search(r"indiankanoon\.org/doc/(\d+)", url)
            doc_id = doc_id_match.group(1) if doc_id_match else ""

            # Try to extract court from title (often like "Title ... - Court Name")
            title = r.get("title", "")
            court = ""
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                title = parts[0].strip()
                court = parts[1].strip()

            parsed.append({
                "title": title,
                "doc_id": doc_id,
                "snippet": r.get("body", ""),
                "court": court,
                "date": "",
                "url": url,
                "source": "Indian Kanoon",
            })

        print(f"[kanoon] DDG fallback returned {len(parsed)} results for: {query[:60]}")
        return parsed

    except Exception as e:
        print(f"[kanoon] DDG fallback search failed: {e}")
        return []


# ══════════════════════════════════════════
#  Public API (auto-selects best method)
# ══════════════════════════════════════════

def search_kanoon(query: str, max_results: int = 5) -> list[dict]:
    """
    Search Indian Kanoon for relevant case law and legal documents.
    Uses official API if INDIAN_KANOON_TOKEN is set, otherwise falls back to DuckDuckGo.

    Returns list of:
    { title, doc_id, snippet, court, date, url, source }
    """
    # Try official API first
    if _get_token():
        results = _api_search(query, max_results=max_results)
        if results:
            return results

    # Fallback to DuckDuckGo site-scoped search
    return _ddg_kanoon_search(query, max_results=max_results)


def get_kanoon_document(doc_id: str, max_chars: int = 3000) -> Optional[dict]:
    """
    Fetch a specific judgment/document from Indian Kanoon.
    Only works with the official API token.
    Returns { title, text, court, date, url, doc_id } or None.
    """
    return _api_get_document(doc_id, max_chars=max_chars)


def search_case_law(query: str, max_results: int = 4) -> list[dict]:
    """
    Convenience function — searches for case law relevant to a legal query.
    Automatically adds legal search terms for better relevance.
    """
    # Build a focused search query
    legal_query = query.strip()

    # Extract section/act references and keep them
    # If the query references specific sections, don't modify it much
    has_section = bool(re.search(r"section\s+\d+|धारा\s+\d+|article\s+\d+", query, re.IGNORECASE))

    if not has_section:
        # Add "judgment" to find case law rather than just legislation text
        legal_query = f"{legal_query} judgment"

    return search_kanoon(legal_query, max_results=max_results)


def format_kanoon_results(results: list[dict]) -> str:
    """Format Kanoon results into a text block for the LLM prompt."""
    if not results:
        return ""

    parts = []
    for i, r in enumerate(results, 1):
        title = r.get("title", "Unknown Case")
        court = r.get("court", "")
        date = r.get("date", "")
        snippet = r.get("snippet", "")
        url = r.get("url", "")

        entry = f"[Case Law {i}]: {title}"
        if court:
            entry += f" ({court})"
        if date:
            entry += f" [{date}]"
        entry += f"\n{snippet}"
        if url:
            entry += f"\nSource: {url}"
        parts.append(entry)

    return "\n\n".join(parts)
