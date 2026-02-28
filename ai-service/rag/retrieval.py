"""
RAG retrieval pipeline: query vector store → web search → orchestrate → call Bedrock → return answer.
"""
from rag.vectorstore import query as vector_query
from rag.web_search import search_indian_legal, search_recent_news, format_search_results
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
    n_results: int = 5,
    chat_history: list = None,
    enable_web_search: bool = True
) -> dict:
    """
    Full RAG + Web Search orchestration pipeline:
    1. Retrieve relevant legal knowledge from ChromaDB
    2. Search the web for up-to-date information
    3. Orchestrate all sources into a unified context
    4. Call Bedrock for the answer
    5. Track context usage and warn if limit approaching
    """
    # ── Step 1: Build history & check context limit ──
    history_text, msg_count, context_limit_reached = _build_history_text(chat_history)
    context_warning = msg_count >= CONTEXT_WARNING_THRESHOLD

    # ── Step 2: Retrieve from knowledge base ──
    results = vector_query(question, n_results=n_results)
    
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    
    context_parts = []
    sources = []
    for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
        context_parts.append(f"[Knowledge Base Source {i+1}]: {doc}")
        sources.append({
            "text": doc[:200] + "..." if len(doc) > 200 else doc,
            "source": meta.get("source", "Legal Knowledge Base"),
            "category": meta.get("category", "General"),
            "relevance": round(1 - dist, 3) if dist else None,
            "type": "knowledge_base"
        })
    
    kb_context = "\n\n".join(context_parts) if context_parts else "No specific legal documents found in knowledge base."

    # ── Step 3: Web search for up-to-date info ──
    web_context = ""
    web_sources = []
    if enable_web_search:
        try:
            web_results = search_indian_legal(question, max_results=4)
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
            print(f"[retrieve_and_answer] Web search failed: {e}")

    # ── Step 4: Build orchestrated prompt ──
    lang_instruction = ""
    if language == "hi":
        lang_instruction = "\nRespond primarily in Hindi (Devanagari script). Use simple language a rural person can understand. You may use English for legal terms."
    elif language != "en":
        lang_instruction = f"\nRespond in {language} language. Use simple, easy-to-understand words."

    web_block = ""
    if web_context:
        web_block = f"""
--- UP-TO-DATE WEB INFORMATION ---
{web_context}
--- END WEB INFO ---
"""

    prompt = f"""You are NyayMitra (न्यायमित्र), a friendly AI legal assistant for rural Indians. 
You help people understand their legal rights, government schemes, and laws in simple language.
You have access to BOTH a legal knowledge base AND up-to-date web search results.
{lang_instruction}
{history_text}
IMPORTANT: Orchestrate information from ALL sources below to give the most accurate, up-to-date answer.
Prefer recent/specific information from web sources when available. Use the knowledge base for foundational legal knowledge.

--- LEGAL KNOWLEDGE BASE ---
{kb_context}
--- END KNOWLEDGE BASE ---
{web_block}
User's question: {question}

Instructions:
1. Answer in simple, easy-to-understand language (imagine explaining to someone with limited education)
2. Cite specific laws, sections, or acts when relevant
3. If web sources provide more recent information, mention that
4. If the user needs to take action, give clear step-by-step instructions
5. If you're unsure, say so — never give wrong legal advice
6. Be empathetic and supportive

Respond in this JSON format:
{{
  "answer": "<your detailed answer orchestrating ALL sources>",
  "laws_cited": ["<law/section 1>", "<law/section 2>"],
  "action_steps": ["<step 1>", "<step 2>"],
  "needs_lawyer": <true/false>,
  "follow_up_questions": ["<suggested follow-up 1>", "<suggested follow-up 2>"],
  "web_enhanced": <true if web results contributed to the answer>
}}"""

    # ── Step 5: Call Bedrock ──
    raw = invoke_bedrock(prompt, max_tokens=2048)
    
    # ── Step 6: Parse response ──
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
    parsed["sources"] = sources + web_sources
    
    # Context management metadata
    parsed["context_info"] = {
        "message_count": msg_count + 1,  # +1 for this message
        "max_messages": MAX_CONTEXT_MESSAGES,
        "context_warning": context_warning,
        "context_limit_reached": context_limit_reached,
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
    Answer questions about a specific uploaded document.
    Unlike retrieve_and_answer(), this uses the document itself as primary context.
    Also performs web search for supplementary up-to-date information.
    """
    # Cap document to fit in context
    doc_text = document_text[:20000]

    # Build history with context tracking
    history_text, msg_count, context_limit_reached = _build_history_text(chat_history)
    context_warning = msg_count >= CONTEXT_WARNING_THRESHOLD

    lang_instruction = ""
    if language == "hi":
        lang_instruction = "\nRespond primarily in Hindi (Devanagari script). Use simple language. You may use English for legal terms."
    elif language != "en":
        lang_instruction = f"\nRespond in {language} language. Use simple words."

    # Optional web search for supplementary info
    web_block = ""
    try:
        web_results = search_indian_legal(question, max_results=3)
        if web_results:
            web_text = format_search_results(web_results)
            web_block = f"\n\n--- SUPPLEMENTARY WEB INFO (use only if relevant) ---\n{web_text}\n--- END WEB INFO ---"
    except Exception:
        pass

    prompt = f"""You are NyayMitra, an expert AI legal assistant. The user has uploaded a legal document and is asking questions about it.
Your job is to answer based SPECIFICALLY on the document content below. Quote facts, names, dates, and details from the document.
Do NOT give generic legal advice. If the document doesn't contain the answer, say so clearly.
{lang_instruction}
{history_text}
=== UPLOADED DOCUMENT ===
{doc_text}
=== END DOCUMENT ===
{web_block}
User's question: {question}

Instructions:
1. Answer based on what's IN the document
2. Quote specific parts of the document when relevant
3. If the user asks about something not in the document, say "This is not mentioned in your document"
4. Cite specific sections, dates, names from the document
5. Be thorough and detailed
6. If web info adds useful context, include it but clearly label as external info

Respond in JSON:
{{
  "answer": "<detailed answer based on the document>",
  "laws_cited": ["<laws mentioned in or relevant to the document>"],
  "action_steps": ["<recommended steps based on the document>"],
  "needs_lawyer": <true if the document involves complex litigation>,
  "follow_up_questions": ["<relevant follow-up about this document>"]
}}"""

    raw = invoke_bedrock(prompt, max_tokens=2048)

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
