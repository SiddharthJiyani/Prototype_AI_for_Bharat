from fastapi import APIRouter
import boto3
import json
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

bedrock = boto3.client(
    "bedrock-runtime",
    region_name=os.getenv("BEDROCK_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "amazon.nova-pro-v1:0")


def _simplify_prompt_for_retry(prompt: str) -> str:
    """Strip potentially triggering content from the prompt for a retry."""
    # Remove any raw document text blocks that might trip filters
    import re
    # Reduce document blocks to summaries
    prompt = re.sub(
        r"=== UPLOADED DOCUMENT ===[\s\S]*?=== END DOCUMENT ===",
        "=== UPLOADED DOCUMENT ===\n[Document content provided — please answer based on general legal knowledge]\n=== END DOCUMENT ===",
        prompt
    )
    # Remove web search blocks that might contain triggering snippets
    prompt = re.sub(
        r"--- SUPPLEMENTARY WEB INFO[\s\S]*?--- END WEB INFO ---",
        "",
        prompt
    )
    # Remove raw knowledge base blocks
    prompt = re.sub(
        r"--- KNOWLEDGE BASE[\s\S]*?--- END KNOWLEDGE BASE ---",
        "",
        prompt
    )
    # Trim to 4000 chars if still too long
    if len(prompt) > 4000:
        prompt = prompt[:4000] + "\n[Prompt truncated for retry]"
    return prompt


def _content_filtered_fallback() -> str:
    """Return a safe JSON fallback when content filters block the response."""
    return json.dumps({
        "answer": "I apologize, but I was unable to generate a response for this particular query due to content safety filters. This can happen when the document or question contains sensitive content.\n\n**What you can try:**\n- Rephrase your question in simpler terms\n- Ask about a specific section of the document\n- Try a more general legal question\n\nIf this issue persists, please consult a local legal aid center or call **15100** (free legal aid helpline).",
        "laws_cited": [],
        "action_steps": ["Try rephrasing your question", "Ask about a specific section", "Contact legal aid helpline 15100"],
        "needs_lawyer": False,
        "follow_up_questions": ["Can you help me understand my basic rights?", "What legal aid options are available?"],
        "web_enhanced": False
    })


def invoke_bedrock(prompt: str, max_tokens: int = 2048, use_demo: bool = False) -> str:
    """Invoke Bedrock with fallback to mock responses."""
    if use_demo:
        # Return mock response based on prompt content
        if "categorize" in prompt.lower():
            return json.dumps({
                "category": "MGNREGA Wage Dispute",
                "confidence": 0.92,
                "clarification_needed": False,
                "clarification_question": None,
                "summary": "Complaint about unpaid MGNREGA wages"
            })
        elif "generate" in prompt.lower() or "notice" in prompt.lower():
            return json.dumps({
                "notice_en": "LEGAL NOTICE\n\nTo: The Block Development Officer / Programme Officer\n     MGNREGA Department\n     [District Name]\n\nSubject: Legal Notice for Non-Payment of Wages under MGNREGA\n\nDear Officer,\n\nThis is to bring to your notice that the undersigned, a registered MGNREGA worker under Job Card No. [XXXXX], has not received wages amounting to Rs.4,500 for work performed under the Mahatma Gandhi National Rural Employment Guarantee Act, 2005. As per Section 3 of the MGNREGA Act, 2005, every eligible worker is entitled to wages within 15 days of completion of work.\n\nI hereby demand immediate release of pending wages within 15 days of receipt of this notice, failing which I shall be constrained to approach the Programme Officer and District Grievance Redressal Office.\n\nRespectfully,\n[Your Name]\nDate: [Current Date]",
                "explanation_hi": "यह कानूनी नोटिस मनरेगा के तहत बकाया मजदूरी के लिए भेजा गया है। आपको 15 दिनों के भीतर ₹4,500 की मजदूरी मिलनी चाहिए। अगर नहीं मिली तो आप कार्यक्रम अधिकारी के पास शिकायत कर सकते हैं।",
                "law_cited": "Mahatma Gandhi National Rural Employment Guarantee Act, 2005",
                "demands": ["Immediate release of pending wages of Rs.4,500", "Compensation at 0.05% per day for delay", "Written acknowledgement within 7 days"]
            })
        else:
            return "Mock Bedrock response for development"
    
    try:
        # Use Converse API — works across all Bedrock models (Nova, Titan, Claude, etc.)
        resp = bedrock.converse(
            modelId=MODEL_ID,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": max_tokens, "temperature": 0.7},
        )

        # Check if content was filtered by Bedrock guardrails
        stop_reason = resp.get("stopReason", "")
        if stop_reason == "content_filtered":
            print(f"[Bedrock] Content filtered (stop_reason={stop_reason}). Retrying with simplified prompt...")
            # Retry with a simplified prompt that strips potentially triggering content
            simplified = _simplify_prompt_for_retry(prompt)
            retry_resp = bedrock.converse(
                modelId=MODEL_ID,
                messages=[{"role": "user", "content": [{"text": simplified}]}],
                inferenceConfig={"maxTokens": max_tokens, "temperature": 0.5},
            )
            retry_stop = retry_resp.get("stopReason", "")
            if retry_stop == "content_filtered":
                print("[Bedrock] Retry also filtered. Returning safe fallback.")
                return _content_filtered_fallback()
            return retry_resp["output"]["message"]["content"][0]["text"]

        return resp["output"]["message"]["content"][0]["text"]
    except bedrock.exceptions.ThrottlingException as e:
        print(f"[Bedrock] Throttled: {e}. Waiting and retrying...")
        import time
        time.sleep(2)
        try:
            resp = bedrock.converse(
                modelId=MODEL_ID,
                messages=[{"role": "user", "content": [{"text": prompt}]}],
                inferenceConfig={"maxTokens": max_tokens, "temperature": 0.7},
            )
            return resp["output"]["message"]["content"][0]["text"]
        except Exception as retry_e:
            print(f"[Bedrock] Retry also failed: {retry_e}")
            return _content_filtered_fallback()
    except Exception as e:
        err_msg = str(e).lower()
        if "content filter" in err_msg or "blocked" in err_msg or "guardrail" in err_msg:
            print(f"[Bedrock] Content filter exception: {e}")
            return _content_filtered_fallback()
        print(f"Bedrock error: {str(e)}, falling back to mock mode")
        return invoke_bedrock(prompt, max_tokens, use_demo=True)


@router.post("/categorize")
async def categorize_complaint(body: dict):
    """
    Categorize a legal complaint from transcript.
    Body: { transcript: str, language: str }
    Returns: { category, clarification_needed, clarification_question }
    """
    transcript = body.get("transcript", "")
    language = body.get("language", "hi")

    prompt = f"""You are a legal AI assistant helping rural Indians in India.
Categorize the following legal complaint into one of these categories:
- MGNREGA Wage Dispute
- Land Dispute
- Consumer Complaint
- RTI Application
- Domestic Violence
- Labour Rights
- Property Dispute
- Other

Complaint (in {language}): {transcript}

Respond in JSON format:
{{
  "category": "<category>",
  "confidence": <0-1>,
  "clarification_needed": <true/false>,
  "clarification_question": "<question if needed, else null>",
  "summary": "<1-sentence English summary>"
}}"""

    text = invoke_bedrock(prompt, max_tokens=512)
    # Extract JSON from response
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])


@router.post("/generate-notice")
async def generate_notice(body: dict):
    """
    Generate a legal notice from categorized complaint data.
    Body: { category, transcript, entities, language, userId, respondent }
    """
    category = body.get("category", "")
    transcript = body.get("transcript", "")
    language = body.get("language", "hi")
    entities = body.get("entities", {})
    respondent = body.get("respondent", {})

    respondent_block = ""
    if respondent and respondent.get("name"):
        respondent_block = f"""
Respondent details:
- Name: {respondent.get('name', '[Recipient Name]')}
- Designation: {respondent.get('designation', '[Designation]')}
- Address: {respondent.get('address', '[Address]')}
Use these EXACT details in the notice instead of placeholders."""

    prompt = f"""You are an expert legal document drafter for rural India.
Draft a formal legal notice in English based on the following complaint.
Also provide a simple explanation in Hindi ("सरल व्याख्या").

Complaint category: {category}
Complaint (original): {transcript}
Extracted details: {json.dumps(entities)}
{respondent_block}

The notice must:
1. Cite the relevant Indian law (e.g., MGNREGA Act 2005, Consumer Protection Act 2019, etc.)
2. State the demand clearly
3. Give a 15-day response deadline
4. Be professional and legally sound

Format your response as JSON:
{{
  "notice_en": "<full English legal notice>",
  "explanation_hi": "<simple Hindi explanation in 3-4 sentences>",
  "law_cited": "<name of law>",
  "demands": ["<demand 1>", "<demand 2>"]
}}"""

    text = invoke_bedrock(prompt, max_tokens=2048)
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON found in Bedrock response: {text[:200]}")
    return json.loads(text[start:end])


@router.post("/extract-entities")
async def extract_entities(body: dict):
    """
    Extract key entities (amount, dates, parties, location) from transcript.
    Body: { transcript: str, language: str }
    """
    transcript = body.get("transcript", "")

    prompt = f"""Extract structured information from this legal complaint.

Complaint: {transcript}

Return JSON:
{{
  "amount": "<monetary amount mentioned or null>",
  "dates": ["<date 1>", "<date 2>"],
  "parties": {{"complainant": "<name or null>", "respondent": "<name or null>"}},
  "location": "<village/district or null>",
  "duration": "<time period mentioned or null>"
}}"""

    text = invoke_bedrock(prompt, max_tokens=512)
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])
