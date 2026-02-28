"""
Agentic RAG — intelligent reasoning layer that dynamically decides retrieval
strategy, contextual re-ranking, and adaptive web search.

Instead of always doing the same static pipeline:
  query → vector search → web search → prompt → answer

The agent reasons about:
  1. What kind of question is this? (factual, procedural, case-specific, opinion)
  2. Is the knowledge base sufficient or is web search needed?
  3. Should we re-rank / filter retrieved chunks by relevance?
  4. Does the question need multi-step reasoning?
  5. What language is the user asking in? → respond in the same language
"""
import json
import re
import traceback
from typing import Optional
from rag.vectorstore import query as vector_query
from rag.web_search import search_indian_legal, search_recent_news, format_search_results
from routers.legal import invoke_bedrock


# ── Language detection via script analysis ──
SCRIPT_RANGES = {
    "hi": [
        (0x0900, 0x097F),   # Devanagari
    ],
    "mr": [
        (0x0900, 0x097F),   # Devanagari (Marathi uses same script)
    ],
    "ta": [
        (0x0B80, 0x0BFF),   # Tamil
    ],
    "te": [
        (0x0C00, 0x0C7F),   # Telugu
    ],
    "bn": [
        (0x0980, 0x09FF),   # Bengali
    ],
    "gu": [
        (0x0A80, 0x0AFF),   # Gujarati
    ],
    "kn": [
        (0x0C80, 0x0CFF),   # Kannada
    ],
    "ml": [
        (0x0D00, 0x0D7F),   # Malayalam
    ],
    "pa": [
        (0x0A00, 0x0A7F),   # Gurmukhi (Punjabi)
    ],
    "or": [
        (0x0B00, 0x0B7F),   # Odia
    ],
}

# Common Hindi words that disambiguate from Marathi
HINDI_MARKERS = {"है", "हैं", "का", "की", "के", "में", "से", "को", "और", "पर", "ने", "या", "यह", "वह", "क्या", "कैसे", "कहाँ", "कब", "क्यों", "मुझे", "मेरा", "मेरी", "हमारा", "कानून", "अधिकार"}
MARATHI_MARKERS = {"आहे", "आहेत", "माझा", "माझी", "त्या", "हे", "ही", "तुम्ही", "आम्ही", "काय", "कसे", "कुठे", "केव्हा", "कायदा"}


def detect_language(text: str) -> str:
    """
    Detect the language of the input text using Unicode script analysis.
    Falls back to 'en' if no Indic script is detected.
    For Devanagari, disambiguates Hindi vs Marathi using marker words.
    """
    if not text or not text.strip():
        return "en"

    # Count characters in each script range
    script_counts = {}
    total_alpha = 0
    for char in text:
        cp = ord(char)
        if char.isalpha():
            total_alpha += 1
            if cp < 128:
                script_counts["en"] = script_counts.get("en", 0) + 1
            else:
                for lang, ranges in SCRIPT_RANGES.items():
                    for lo, hi in ranges:
                        if lo <= cp <= hi:
                            script_counts[lang] = script_counts.get(lang, 0) + 1
                            break

    if total_alpha == 0:
        return "en"

    # Find dominant non-English script
    best_lang = "en"
    best_count = 0
    for lang, count in script_counts.items():
        if lang != "en" and count > best_count:
            best_count = count
            best_lang = lang

    # If Devanagari detected, disambiguate Hindi vs Marathi
    if best_lang in ("hi", "mr") and best_count > 0:
        words = set(text.split())
        hi_score = len(words & HINDI_MARKERS)
        mr_score = len(words & MARATHI_MARKERS)
        if mr_score > hi_score:
            return "mr"
        return "hi"

    # If mostly English characters or no Indic script dominates
    if best_count < total_alpha * 0.3:
        return "en"

    return best_lang


# ── Query classification ──
QUERY_TYPES = {
    "factual": "Direct question about a specific law, section, or legal fact",
    "procedural": "How-to question about legal processes, filing, applications",
    "case_specific": "Question about a specific case or document",
    "opinion": "Seeking legal opinion, prediction, or strategy advice",
    "rights": "Question about fundamental or statutory rights",
    "scheme": "Question about government schemes, benefits, subsidies",
    "general": "General legal awareness or education question",
}


def classify_query(question: str) -> dict:
    """
    Lightweight classification of the query to decide retrieval strategy.
    Uses heuristics first, falls back to LLM only for ambiguous cases.
    """
    q_lower = question.lower()

    # Heuristic classification
    procedural_keywords = ["कैसे", "how to", "file", "apply", "process", "procedure", "steps", "register", "complain", "दर्ज", "आवेदन", "प्रक्रिया"]
    rights_keywords = ["right", "अधिकार", "fundamental", "मौलिक", "entitle", "haq", "हक"]
    scheme_keywords = ["scheme", "yojana", "योजना", "benefit", "subsidy", "सब्सिडी", "pension", "पेंशन", "mnrega", "मनरेगा", "ration", "राशन"]
    case_keywords = ["my case", "my document", "मेरा केस", "this order", "this judgment", "इस आदेश"]

    query_type = "general"
    needs_web = True
    needs_deep_retrieval = True

    if any(kw in q_lower for kw in procedural_keywords):
        query_type = "procedural"
        needs_web = True
        needs_deep_retrieval = True
    elif any(kw in q_lower for kw in rights_keywords):
        query_type = "rights"
        needs_web = True
        needs_deep_retrieval = True
    elif any(kw in q_lower for kw in scheme_keywords):
        query_type = "scheme"
        needs_web = True  # Schemes change frequently
        needs_deep_retrieval = True
    elif any(kw in q_lower for kw in case_keywords):
        query_type = "case_specific"
        needs_web = False  # Case-specific doesn't need web
        needs_deep_retrieval = True
    else:
        # Check if it looks like a factual question
        factual_patterns = [r"\bsection\s+\d+", r"धारा\s+\d+", r"\bipc\b", r"\bcrpc\b", r"\bcpc\b", r"\bact\b.*\d{4}"]
        if any(re.search(pat, q_lower) for pat in factual_patterns):
            query_type = "factual"
            needs_web = False
            needs_deep_retrieval = True

    return {
        "type": query_type,
        "needs_web": needs_web,
        "needs_deep_retrieval": needs_deep_retrieval,
    }


def rerank_results(question: str, documents: list, metadatas: list, distances: list, top_k: int = 5) -> tuple:
    """
    Re-rank retrieved documents by relevance to the question.
    Uses a combination of:
    1. Vector distance (already have)
    2. Keyword overlap scoring
    3. Recency boost for time-sensitive topics
    """
    if not documents:
        return [], [], []

    q_words = set(re.findall(r'\w+', question.lower()))

    scored = []
    for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
        # Base score from vector distance (lower distance = higher score)
        base_score = 1.0 - min(dist, 1.0)

        # Keyword overlap boost
        doc_words = set(re.findall(r'\w+', doc.lower()))
        overlap = len(q_words & doc_words)
        keyword_boost = min(overlap * 0.05, 0.3)

        # Category relevance boost
        category = meta.get("category", "").lower()
        category_boost = 0.0
        if any(kw in question.lower() for kw in ["ipc", "crpc", "penal", "criminal"]) and "criminal" in category:
            category_boost = 0.1
        elif any(kw in question.lower() for kw in ["property", "land", "जमीन"]) and "property" in category:
            category_boost = 0.1
        elif any(kw in question.lower() for kw in ["labour", "labor", "wage", "मजदूरी"]) and "labour" in category:
            category_boost = 0.1

        final_score = base_score + keyword_boost + category_boost
        scored.append((final_score, i))

    # Sort by score descending
    scored.sort(key=lambda x: x[0], reverse=True)

    # Return top_k
    top_indices = [idx for _, idx in scored[:top_k]]
    return (
        [documents[i] for i in top_indices],
        [metadatas[i] for i in top_indices],
        [distances[i] for i in top_indices],
    )


def assess_retrieval_quality(documents: list, distances: list, threshold: float = 0.65) -> dict:
    """
    Assess whether the retrieved knowledge base results are sufficient.
    Returns an assessment with recommendations.
    """
    if not documents:
        return {
            "quality": "none",
            "sufficient": False,
            "recommendation": "web_search_required",
            "avg_relevance": 0.0,
        }

    relevance_scores = [1.0 - min(d, 1.0) for d in distances]
    avg_relevance = sum(relevance_scores) / len(relevance_scores)
    high_relevance_count = sum(1 for s in relevance_scores if s >= threshold)

    if high_relevance_count >= 3 and avg_relevance >= 0.6:
        quality = "high"
        sufficient = True
        recommendation = "kb_sufficient"
    elif high_relevance_count >= 1 and avg_relevance >= 0.4:
        quality = "medium"
        sufficient = True
        recommendation = "supplement_with_web"
    else:
        quality = "low"
        sufficient = False
        recommendation = "web_search_required"

    return {
        "quality": quality,
        "sufficient": sufficient,
        "recommendation": recommendation,
        "avg_relevance": round(avg_relevance, 3),
        "high_relevance_docs": high_relevance_count,
    }


def agent_decide_strategy(question: str, query_class: dict, retrieval_quality: dict, enable_web: bool = True) -> dict:
    """
    The 'agent brain' — decides the optimal strategy based on all signals.
    Returns an action plan.
    """
    strategy = {
        "use_kb_results": True,
        "do_web_search": False,
        "do_news_search": False,
        "search_query_override": None,
        "reasoning": "",
        "confidence": "medium",
    }

    qt = query_class["type"]
    rq = retrieval_quality["recommendation"]

    # Decision matrix
    if rq == "web_search_required" and enable_web:
        strategy["do_web_search"] = True
        strategy["reasoning"] = f"Knowledge base has low relevance ({retrieval_quality['avg_relevance']:.2f}). Will use web as supplementary fallback."
        strategy["confidence"] = "low"

    elif rq == "supplement_with_web" and enable_web:
        # Only supplement for scheme/procedural queries that benefit from recent info
        if qt in ("scheme", "procedural"):
            strategy["do_web_search"] = True
            strategy["reasoning"] = f"KB partial ({retrieval_quality['avg_relevance']:.2f}). {qt} query benefits from web supplement."
            strategy["confidence"] = "medium"
        else:
            strategy["do_web_search"] = False
            strategy["reasoning"] = f"KB partial ({retrieval_quality['avg_relevance']:.2f}), but web not needed for {qt} query."
            strategy["confidence"] = "medium"

    elif rq == "kb_sufficient":
        strategy["do_web_search"] = False
        strategy["reasoning"] = f"Knowledge base is sufficient (relevance: {retrieval_quality['avg_relevance']:.2f})."
        strategy["confidence"] = "high"

    # Override: schemes always benefit from web (info changes frequently)
    if qt == "scheme" and enable_web:
        strategy["do_web_search"] = True
        if qt == "scheme":
            strategy["do_news_search"] = True
            strategy["reasoning"] += " Scheme queries always benefit from latest web info."

    # Override: factual questions about specific sections may not need web
    if qt == "factual" and retrieval_quality["quality"] == "high":
        strategy["do_web_search"] = False
        strategy["reasoning"] = "Factual question with high-quality KB results. Web search not needed."
        strategy["confidence"] = "high"

    # Smart search query construction
    if strategy["do_web_search"]:
        # Build a more targeted search query
        if qt == "scheme":
            strategy["search_query_override"] = f"{question} India government scheme 2025 2026 latest"
        elif qt == "procedural":
            strategy["search_query_override"] = f"{question} India procedure steps guide"

    return strategy


def build_language_instruction(detected_lang: str, user_lang_pref: str = None) -> str:
    """
    Build language instruction for the LLM.
    Priority: detected language from query > user preference > default English.
    """
    lang = detected_lang if detected_lang != "en" else (user_lang_pref or "en")

    LANG_NAMES = {
        "hi": "Hindi (हिन्दी, Devanagari script)",
        "mr": "Marathi (मराठी, Devanagari script)",
        "ta": "Tamil (தமிழ், Tamil script)",
        "te": "Telugu (తెలుగు, Telugu script)",
        "bn": "Bengali (বাংলা, Bengali script)",
        "gu": "Gujarati (ગુજરાતી, Gujarati script)",
        "kn": "Kannada (ಕನ್ನಡ, Kannada script)",
        "ml": "Malayalam (മലയാളം, Malayalam script)",
        "pa": "Punjabi (ਪੰਜਾਬੀ, Gurmukhi script)",
        "or": "Odia (ଓଡ଼ିଆ, Odia script)",
        "en": "English",
    }

    lang_name = LANG_NAMES.get(lang, lang)

    if lang == "en":
        return "\nRespond in English. Use clear, simple language suitable for someone with basic education."

    return f"""
LANGUAGE INSTRUCTION (CRITICAL): The user is communicating in {lang_name}.
You MUST respond entirely in {lang_name}, using the native script.
- Use simple, everyday vocabulary that a person with basic education can understand
- Legal terms may be kept in English with the {lang_name} translation in parentheses
- Example: "Section 498A (धारा 498A)" or "FIR (प्राथमिकी)"
- Do NOT respond in English unless the user specifically asked in English
- Maintain all Markdown formatting (headings, bold, bullets) while writing in {lang_name}"""
