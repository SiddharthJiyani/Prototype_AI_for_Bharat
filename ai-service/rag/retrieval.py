"""
Agentic RAG retrieval pipeline:
  classify query → retrieve from KB → assess quality → agent decides strategy →
  optional web search → re-rank → build Markdown prompt → call Bedrock → return.
"""
from rag.vectorstore import query as vector_query
from rag.web_search import search_indian_legal, search_recent_news, format_search_results
from rag.indian_kanoon import search_case_law, format_kanoon_results
from rag.agent import (
    detect_language, classify_query, rerank_results,
    assess_retrieval_quality, agent_decide_strategy,
    build_language_instruction,
)
from routers.legal import invoke_bedrock
import json
import re

# ── Context limit constants ──
MAX_CONTEXT_MESSAGES = 20        # Hard cap on conversation messages in context
CONTEXT_WARNING_THRESHOLD = 16   # Warn user after this many messages
MAX_HISTORY_CHARS = 8000         # Max chars of history text to include in prompt


def _parse_llm_json(raw: str, analysis_type: str = "") -> dict:
    """
    Robustly parse JSON from LLM output. Handles:
    - markdown code fences (```json ... ```)
    - extra text before/after JSON
    - double braces {{ }} → { }
    - trailing commas
    """
    if not raw or not raw.strip():
        return {"error": "Empty response from AI model", "raw": ""}

    text = raw.strip()

    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    text = text.strip()

    # Find outermost JSON object
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end <= 0:
        # No JSON object found — return raw text as summary fallback
        return _fallback_result(raw, analysis_type)

    candidate = text[start:end]

    # Attempt 1: direct parse
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass

    # Attempt 2: strip double braces ({{ → { and }} → })
    cleaned = candidate
    if cleaned.startswith("{{"):
        cleaned = cleaned[1:]
    if cleaned.endswith("}}"):
        cleaned = cleaned[:-1]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Attempt 3: fix trailing commas before } or ]
    fixed = re.sub(r",\s*([}\]])", r"\1", candidate)
    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # Attempt 4: combined fixes
    fixed2 = re.sub(r",\s*([}\]])", r"\1", cleaned)
    try:
        return json.loads(fixed2)
    except json.JSONDecodeError:
        pass

    # All attempts failed — return raw text as fallback
    print(f"[_parse_llm_json] All parse attempts failed for {analysis_type}. Raw: {raw[:300]}")
    return _fallback_result(raw, analysis_type)


def _fallback_result(raw: str, analysis_type: str) -> dict:
    """When JSON parsing totally fails, return the raw text as a usable result."""
    text = raw.strip()
    # Remove any markdown fences
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)

    if analysis_type == "summary":
        return {"summary": text, "key_points": [], "parties": None, "action_required": None, "deadline": None}
    elif analysis_type == "faq":
        return {"faqs": [{"question": "Document Analysis", "answer": text}]}
    elif analysis_type == "timeline":
        return {"events": [{"date": "N/A", "event": text[:500], "importance": "medium"}]}
    elif analysis_type == "predictive":
        return {"prediction": text, "confidence": "medium", "strengths": [], "weaknesses": [], "risks": []}
    elif analysis_type == "caselaw":
        return {"cases": [], "acts": [], "_raw_analysis": text}
    else:
        return {"summary": text, "key_points": []}


def _build_history_text(chat_history: list, max_msgs: int = None, max_chars: int = None) -> tuple[str, int, bool]:
    """
    Build conversation history text from chat_history.
    Returns (history_text, message_count, context_limit_reached).
    """
    if not chat_history:
        return "", 0, False

    max_msgs = max_msgs or MAX_CONTEXT_MESSAGES
    max_chars = max_chars or MAX_HISTORY_CHARS

    total = len(chat_history)
    # Only include the most recent messages up to the limit
    recent = chat_history[-max_msgs:]
    
    parts = []
    char_count = 0
    included = 0
    for msg in recent:
        role = "User" if msg.get("role") == "user" else "Assistant"
        content = msg.get("content", "")
        line = f"{role}: {content}"
        if char_count + len(line) > max_chars:
            break
        parts.append(line)
        char_count += len(line)
        included += 1

    history_text = ""
    if parts:
        history_text = "\nPrevious conversation:\n" + "\n".join(parts) + "\n"

    context_limit_reached = total >= MAX_CONTEXT_MESSAGES
    return history_text, total, context_limit_reached


def retrieve_and_answer(
    question: str,
    language: str = "en",
    n_results: int = 8,
    chat_history: list = None,
    enable_web_search: bool = True
) -> dict:
    """
    Agentic RAG pipeline:
    1. Detect query language automatically
    2. Classify query type (factual, procedural, scheme, etc.)
    3. Retrieve from knowledge base with extra candidates for re-ranking
    4. Assess retrieval quality
    5. Agent decides: use KB only, supplement with web, or web-first
    6. Re-rank results by relevance
    7. Build Markdown-formatted prompt with language instruction
    8. Call Bedrock and parse structured response
    9. Return with context management metadata + agent trace
    """
    # ── Step 1: Detect language from the query itself ──
    detected_lang = detect_language(question)
    effective_lang = detected_lang if detected_lang != "en" else language
    print(f"[agent] Language detected: {detected_lang}, effective: {effective_lang}")

    # ── Step 2: Classify the query ──
    query_class = classify_query(question)
    print(f"[agent] Query type: {query_class['type']}")

    # ── Step 3: Build history & check context limit ──
    history_text, msg_count, context_limit_reached = _build_history_text(chat_history)
    context_warning = msg_count >= CONTEXT_WARNING_THRESHOLD

    # ── Step 4: Retrieve from knowledge base (fetch extra for re-ranking) ──
    fetch_count = n_results + 5  # fetch extra candidates for re-ranking
    results = vector_query(question, n_results=fetch_count)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    # ── Step 5: Assess retrieval quality ──
    quality = assess_retrieval_quality(documents, distances)
    print(f"[agent] KB quality: {quality['quality']} (avg relevance: {quality['avg_relevance']})")

    # ── Step 6: Agent decides strategy ──
    strategy = agent_decide_strategy(question, query_class, quality, enable_web_search)
    print(f"[agent] Strategy: {strategy['reasoning']}")

    # ── Step 7: Re-rank results ──
    ranked_docs, ranked_metas, ranked_dists = rerank_results(
        question, documents, metadatas, distances, top_k=n_results
    )

    # Build KB context from re-ranked results
    context_parts = []
    sources = []
    for i, (doc, meta, dist) in enumerate(zip(ranked_docs, ranked_metas, ranked_dists)):
        context_parts.append(f"[Knowledge Source {i+1}]: {doc}")
        sources.append({
            "text": doc[:200] + "..." if len(doc) > 200 else doc,
            "source": meta.get("source", "Legal Knowledge Base"),
            "category": meta.get("category", "General"),
            "relevance": round(1 - dist, 3) if dist else None,
            "type": "knowledge_base"
        })

    kb_context = "\n\n".join(context_parts) if context_parts else "No relevant legal documents found in knowledge base."

    # ── Step 8: Conditional web search based on agent decision ──
    web_context = ""
    web_sources = []
    if strategy["do_web_search"]:
        try:
            search_query = strategy.get("search_query_override") or question
            web_results = search_indian_legal(search_query, max_results=4)
            if web_results:
                web_context = format_search_results(web_results)
                for wr in web_results:
                    web_sources.append({
                        "text": wr.get("snippet", "")[:200],
                        "source": wr.get("url", "Web"),
                        "category": "Web Search",
                        "title": wr.get("title", ""),
                        "type": "web_search"
                    })
        except Exception as e:
            print(f"[agent] Web search failed: {e}")

    # Optional news search for schemes
    if strategy.get("do_news_search"):
        try:
            news = search_recent_news(question, max_results=3)
            if news:
                news_text = format_search_results(news)
                web_context += f"\n\n--- RECENT NEWS ---\n{news_text}"
        except Exception:
            pass

    # ── Step 8b: Indian Kanoon case law search (targeted) ──
    kanoon_context = ""
    kanoon_sources = []
    # Only search Kanoon when query references specific legal sections/acts,
    # or when KB has no relevant results and it's a legal query
    has_legal_ref = bool(re.search(
        r'section\s+\d+|धारा\s+\d+|article\s+\d+|\bipc\b|\bcrpc\b|\bcpc\b|act.*\d{4}|\bjudgment\b|\bjudgement\b|\bverdict\b|\bcase\b.*\bvs\b',
        question, re.IGNORECASE
    ))
    needs_case_law = has_legal_ref or (quality["quality"] in ("low", "none") and query_class["type"] in ("factual", "rights", "case_specific"))
    if needs_case_law:
        try:
            kanoon_results = search_case_law(question, max_results=3)
            if kanoon_results:
                kanoon_context = format_kanoon_results(kanoon_results)
                for kr in kanoon_results:
                    kanoon_sources.append({
                        "text": kr.get("snippet", "")[:200],
                        "source": kr.get("url", ""),
                        "category": "Case Law",
                        "title": kr.get("title", ""),
                        "court": kr.get("court", ""),
                        "date": kr.get("date", ""),
                        "type": "indian_kanoon"
                    })
                print(f"[agent] Kanoon: found {len(kanoon_results)} case law results")
        except Exception as e:
            print(f"[agent] Kanoon search failed: {e}")

    # ── Step 9: Build agentic prompt with Markdown instructions ──
    lang_instruction = build_language_instruction(detected_lang, language)

    # ── Build supplementary blocks (only if they exist) ──
    supplementary_block = ""

    if kanoon_context:
        supplementary_block += f"""\n\n--- RELEVANT COURT JUDGMENTS (Indian Kanoon) ---\n{kanoon_context}\n--- END JUDGMENTS ---"""

    if web_context:
        supplementary_block += f"""\n\n--- SUPPLEMENTARY WEB INFORMATION ---\n{web_context}\n--- END WEB INFO ---"""

    confidence_note = ""
    if strategy["confidence"] == "low":
        confidence_note = "\nIMPORTANT: The knowledge base had low relevance. You may lean on court judgments or web sources, but say so."
    elif strategy["confidence"] == "high":
        confidence_note = "\nThe knowledge base has strong coverage. Base your answer primarily on it."

    prompt = f"""You are **NyayMitra (न्यायमित्र)**, a friendly and expert AI legal assistant for Indian citizens.
You help people understand their legal rights, government schemes, court procedures, and laws in simple language.
{lang_instruction}
{confidence_note}
{history_text}

--- LEGAL KNOWLEDGE BASE (PRIMARY SOURCE) ---
{kb_context}
--- END KNOWLEDGE BASE ---
{supplementary_block}

**User's question:** {question}

SOURCE PRIORITY (follow strictly):
1. **Knowledge Base is your PRIMARY source.** Start with information from the KB above. Most answers live there.
2. **Court judgments (Indian Kanoon)** are supplementary. Only cite a judgment when it directly strengthens or illustrates a point you already made from the KB. Do NOT list judgments independently — weave them naturally, e.g. "The Supreme Court upheld this in *XYZ vs State (2015)*."
3. **Web sources** fill gaps only. If KB + judgments already answer the question, skip web info entirely.
4. **Never let supplementary sources dominate.** The answer should read as a coherent legal explanation, not a list of search results.

FORMATTING:
- Use **Markdown**: `##` headings, **bold** laws/sections, bullet lists, `>` blockquotes for exact law text.
- Cite laws and sections inline (e.g. **Section 498A IPC**). Be actionable — give step-by-step guidance.
- Keep the answer readable and clean. No source dumps.
- Use simple language a person with basic education can understand.
- Be empathetic and supportive. If unsure, say so — never give wrong legal advice.

Respond in this JSON format (the "answer" field MUST contain Markdown-formatted text):
{{
  "answer": "<your detailed, blended Markdown-formatted answer>",
  "laws_cited": ["<law/section 1>", "<law/section 2>"],
  "action_steps": ["<step 1>", "<step 2>"],
  "needs_lawyer": <true/false>,
  "follow_up_questions": ["<suggested follow-up 1>", "<suggested follow-up 2>"],
  "references": ["<inline citation or source name 1>", "<inline citation or source name 2>"]
}}"""

    # ── Step 10: Call Bedrock ──
    raw = invoke_bedrock(prompt, max_tokens=2500)

    # ── Step 11: Parse response ──
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start != -1 and end > 0:
            parsed = json.loads(raw[start:end])
        else:
            parsed = {"answer": raw, "laws_cited": [], "action_steps": [], "needs_lawyer": False, "follow_up_questions": []}
    except json.JSONDecodeError:
        parsed = {"answer": raw, "laws_cited": [], "action_steps": [], "needs_lawyer": False, "follow_up_questions": []}

    # Merge all sources
    parsed["sources"] = sources + kanoon_sources + web_sources

    # Context management metadata
    parsed["context_info"] = {
        "message_count": msg_count + 1,
        "max_messages": MAX_CONTEXT_MESSAGES,
        "context_warning": context_warning,
        "context_limit_reached": context_limit_reached,
    }

    # Agent trace for debugging / transparency
    parsed["agent_trace"] = {
        "detected_language": detected_lang,
        "effective_language": effective_lang,
        "query_type": query_class["type"],
        "kb_quality": quality["quality"],
        "kb_avg_relevance": quality["avg_relevance"],
        "strategy": strategy["reasoning"],
        "web_searched": strategy["do_web_search"],
        "kanoon_searched": len(kanoon_sources) > 0,
        "confidence": strategy["confidence"],
    }

    return parsed


def analyze_document(text: str, analysis_type: str = "summary") -> dict:
    """
    Analyze a legal document using Bedrock.
    The FULL document text is the primary input — RAG context is secondary.
    analysis_type: summary | faq | timeline | predictive | caselaw
    """
    # Truncate very long documents to stay within model context window
    # Nova Pro supports ~300K tokens, but we cap at ~25K chars for cost/speed
    doc_text = text[:25000]
    doc_truncated = len(text) > 25000
    truncation_note = f"\n[NOTE: Document was {len(text)} characters. Showing first 25,000.]" if doc_truncated else ""

    # Optionally retrieve supplementary legal knowledge
    try:
        results = vector_query(text[:300], n_results=2)
        context_docs = results.get("documents", [[]])[0]
        supplementary = "\n".join(context_docs) if context_docs else ""
    except Exception:
        supplementary = ""

    base_instruction = f"""You are an expert Indian legal analyst. You have been given a legal document to analyze.
Your job is to carefully read EVERY line of the document and extract detailed, specific information.
Do NOT give generic or vague answers. Quote specific names, dates, amounts, sections, and facts FROM the document.
If the document mentions parties, courts, case numbers, judges, or dates — include them all.{truncation_note}

=== DOCUMENT START ===
{doc_text}
=== DOCUMENT END ==="""

    supplementary_block = f"\n\nSupplementary legal knowledge:\n{supplementary}" if supplementary else ""

    prompts = {
        "summary": f"""{base_instruction}{supplementary_block}

Task: Provide a DETAILED summary of this document. Include:
1. Type of document (court order, FIR, notice, contract, judgment, etc.)
2. ALL parties involved with their full names and roles
3. Case number / reference number if present
4. Court or authority name
5. Key facts and allegations
6. The decision / order / outcome
7. Any relief granted or denied
8. Important dates mentioned
9. Laws and sections cited in the document
10. What the reader should do next

Respond ONLY with valid JSON (no markdown fences, no extra text):
{{
  "summary": "<3-5 paragraph detailed summary covering all the above points>",
  "key_points": ["<specific point 1 with names/dates>", "<specific point 2>", "<point 3>", "<point 4>", "<point 5>"],
  "parties": {{"petitioner": "<name>", "respondent": "<name>", "court": "<court name>", "case_number": "<if found>"}},
  "action_required": "<specific next steps for the reader>",
  "deadline": "<specific deadline from the document, or null>"
}}""",

        "faq": f"""{base_instruction}{supplementary_block}

Task: Generate 6-10 detailed FAQ based SPECIFICALLY on this document.
Each question should be something a person involved in this case would ask.
Answers must reference specific facts, names, dates from the document.

Respond ONLY with valid JSON (no markdown fences, no extra text):
{{"faqs": [
  {{"question": "<specific question about this document>", "answer": "<detailed answer citing facts from the document>"}}
]}}""",

        "timeline": f"""{base_instruction}

Task: Extract EVERY date, time period, and sequence of events mentioned in this document.
Include filing dates, hearing dates, incident dates, deadlines, and order dates.
List them in chronological order.

Respond ONLY with valid JSON (no markdown fences, no extra text):
{{"events": [
  {{"date": "<exact date or period from document>", "event": "<what happened — be specific>", "importance": "high|medium|low"}}
]}}""",

        "predictive": f"""{base_instruction}{supplementary_block}

Task: Based on the facts in this document and Indian legal precedents, provide:
1. Analysis of the legal strengths and weaknesses of each party's position
2. Likely outcome based on similar cases
3. Estimated timeline for resolution
4. Recommended legal strategy
5. Key risks

Respond ONLY with valid JSON (no markdown fences, no extra text):
{{
  "prediction": "<detailed prediction with reasoning>",
  "confidence": "high|medium|low",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "timeline": "<estimated time for resolution>",
  "strategy": "<recommended approach with specific steps>",
  "risks": ["<risk 1>", "<risk 2>"]
}}""",

        "caselaw": f"""{base_instruction}{supplementary_block}

Task: Identify ALL laws, acts, sections, and case precedents that are:
1. Directly cited/mentioned in this document
2. Relevant to the subject matter of this document
For each, explain how it applies to this specific case.

Respond ONLY with valid JSON (no markdown fences, no extra text):
{{
  "cases": [{{"name": "<case name>", "citation": "<citation>", "relevance": "<how it relates to THIS document>", "outcome": "<what was decided>"}}],
  "acts": [{{"name": "<act/law name>", "sections": ["<section numbers>"], "relevance": "<how it applies to THIS case>"}}]
}}"""
    }

    prompt = prompts.get(analysis_type, prompts["summary"])
    raw = invoke_bedrock(prompt, max_tokens=3000)

    return _parse_llm_json(raw, analysis_type)


def chat_about_document(question: str, document_text: str, language: str = "en", chat_history: list = None) -> dict:
    """
    Agentic document chat — answers questions about a specific uploaded document.
    Uses the document itself as primary context. Detects query language automatically.
    Responds with Markdown-formatted answers.
    """
    # Cap document — generous limit for Nova Pro's large context
    doc_text = document_text[:25000]

    # Detect language from the question
    detected_lang = detect_language(question)
    effective_lang = detected_lang if detected_lang != "en" else language
    lang_instruction = build_language_instruction(detected_lang, language)

    # Build history with context tracking
    history_text, msg_count, context_limit_reached = _build_history_text(chat_history)
    context_warning = msg_count >= CONTEXT_WARNING_THRESHOLD

    # Optional web search for supplementary info
    web_block = ""
    try:
        web_results = search_indian_legal(question, max_results=3)
        if web_results:
            web_text = format_search_results(web_results)
            web_block = f"\n\n--- SUPPLEMENTARY WEB INFO (use only if relevant) ---\n{web_text}\n--- END WEB INFO ---"
    except Exception:
        pass

    prompt = f"""You are **NyayMitra**, an expert AI legal assistant specializing in Indian law.
{lang_instruction}
{history_text}

CRITICAL INSTRUCTIONS:
1. Read the ENTIRE document below carefully before answering.
2. The answer is almost always IN the document — search thoroughly through every paragraph, section, and clause.
3. Reference specific text, names, dates, sections, amounts, and details from the document.
4. Be thorough, specific, and detailed in your answer.
5. Only say information is not in the document if you have genuinely searched every part of it.

FORMATTING RULES (VERY IMPORTANT — follow strictly):
- Use ## for main section headings and ### for sub-sections.
- Use **bold** for key terms, names, dates, section numbers, and important phrases.
- Use bullet points (- ) for listing multiple findings, facts, or points.
- Use numbered lists (1. 2. 3.) for sequential steps or ordered items.
- Write normal paragraphs for explanations — do NOT prefix every line with > (blockquote).
- ONLY use blockquote (> ) for a single SHORT direct verbatim quote from the document that is essential. Maximum 1-2 blockquotes per answer. Most answers need ZERO blockquotes.
- Do NOT wrap bullet points, headings, or regular text in blockquotes.
- Keep the answer clean, structured, and easy to read.
{web_block}

=== UPLOADED DOCUMENT (READ EVERY LINE) ===
{doc_text}
=== END DOCUMENT ===

**User's question:** {question}

Respond in JSON format. The "answer" field MUST contain clean Markdown text (NOT wrapped in blockquotes) with specific facts from the document:
{{
  "answer": "<clean Markdown answer with headings, bold, bullet lists — NO excessive blockquotes>",
  "laws_cited": ["<laws mentioned in or relevant to the document>"],
  "action_steps": ["<recommended steps based on the document>"],
  "needs_lawyer": <true if the document involves complex litigation>,
  "follow_up_questions": ["<relevant follow-up about this document>"]
}}"""

    raw = invoke_bedrock(prompt, max_tokens=2500)

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start != -1 and end > 0:
            parsed = json.loads(raw[start:end])
        else:
            parsed = {"answer": raw, "laws_cited": [], "action_steps": [], "needs_lawyer": False, "follow_up_questions": []}
    except json.JSONDecodeError:
        parsed = {"answer": raw, "laws_cited": [], "action_steps": [], "needs_lawyer": False, "follow_up_questions": []}

    # Context management metadata
    parsed["context_info"] = {
        "message_count": msg_count + 1,
        "max_messages": MAX_CONTEXT_MESSAGES,
        "context_warning": context_warning,
        "context_limit_reached": context_limit_reached,
    }

    return parsed
