"""
Web search agent — uses DuckDuckGo to find up-to-date legal information.
No API key required. Results are orchestrated with RAG knowledge for richer answers.
"""
import traceback
from typing import Optional

try:
    from duckduckgo_search import DDGS
    HAS_DDG = True
except ImportError:
    HAS_DDG = False


def web_search(query: str, max_results: int = 5, region: str = "in-en") -> list[dict]:
    """
    Search the web using DuckDuckGo and return structured results.
    Focuses on Indian legal sources.
    """
    if not HAS_DDG:
        return []

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(
                query,
                region=region,
                max_results=max_results,
            ))
        # Normalize results
        return [
            {
                "title": r.get("title", ""),
                "snippet": r.get("body", ""),
                "url": r.get("href", ""),
            }
            for r in results
        ]
    except Exception as e:
        print(f"[web_search] DuckDuckGo search failed: {e}")
        traceback.print_exc()
        return []


def search_indian_legal(query: str, max_results: int = 5) -> list[dict]:
    """
    Search specifically for Indian legal information.
    Appends 'India law' to the query for better relevance.
    """
    # Build a legal-focused search query
    legal_query = f"{query} India law legal"
    return web_search(legal_query, max_results=max_results)


def search_recent_news(query: str, max_results: int = 3) -> list[dict]:
    """Search for recent news about a legal topic."""
    if not HAS_DDG:
        return []

    try:
        with DDGS() as ddgs:
            results = list(ddgs.news(
                query,
                region="in-en",
                max_results=max_results,
            ))
        return [
            {
                "title": r.get("title", ""),
                "snippet": r.get("body", ""),
                "url": r.get("url", ""),
                "date": r.get("date", ""),
                "source": r.get("source", ""),
            }
            for r in results
        ]
    except Exception as e:
        print(f"[search_recent_news] News search failed: {e}")
        return []


def format_search_results(results: list[dict]) -> str:
    """Format web search results into a text block for the LLM prompt."""
    if not results:
        return ""

    parts = []
    for i, r in enumerate(results, 1):
        title = r.get("title", "")
        snippet = r.get("snippet", "")
        url = r.get("url", "")
        date = r.get("date", "")

        entry = f"[Web Source {i}]: {title}"
        if date:
            entry += f" ({date})"
        entry += f"\n{snippet}"
        if url:
            entry += f"\nURL: {url}"
        parts.append(entry)

    return "\n\n".join(parts)
