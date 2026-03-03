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

# ─── All supported complaint categories (aligned with knowledge base) ───
COMPLAINT_CATEGORIES = [
    "MGNREGA Wage Dispute",
    "Land Dispute",
    "Consumer Complaint",
    "RTI Application",
    "Domestic Violence",
    "Labour Rights",
    "Property Dispute",
    "Criminal Rights / Arrest",
    "Education Rights",
    "Disability Rights",
    "Cyber Crime",
    "Child Rights",
    "Healthcare Rights",
    "Environmental Rights",
    "Public Nuisance / Municipal Complaint",
    "Police Misconduct / Accountability",
    "Caste Discrimination / SC-ST Atrocity",
    "Senior Citizen Rights",
    "Government Scheme Denial",
    "Free Legal Aid Request",
    "Other",
]

# ─── Category → applicable laws mapping (used to improve prompts) ───
CATEGORY_LAWS = {
    "MGNREGA Wage Dispute": "Mahatma Gandhi National Rural Employment Guarantee Act 2005",
    "Land Dispute": "Land Acquisition, Rehabilitation and Resettlement Act 2013; Forest Rights Act 2006",
    "Consumer Complaint": "Consumer Protection Act 2019",
    "RTI Application": "Right to Information Act 2005",
    "Domestic Violence": "Protection of Women from Domestic Violence Act 2005; IPC Section 498A",
    "Labour Rights": "Minimum Wages Act 1948; Payment of Wages Act 1936; Bonded Labour System (Abolition) Act 1976; Building and Other Construction Workers Act 1996",
    "Property Dispute": "Hindu Succession Act 1956 (amended 2005); Transfer of Property Act 1882; Registration Act 1908",
    "Criminal Rights / Arrest": "Code of Criminal Procedure (CrPC) / Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023; Constitution Articles 20-22",
    "Education Rights": "Right to Education Act 2009; Constitution Article 21A",
    "Disability Rights": "Rights of Persons with Disabilities Act 2016",
    "Cyber Crime": "Information Technology Act 2000; IT (Amendment) Act 2008; BNS 2023",
    "Child Rights": "POCSO Act 2012; Juvenile Justice Act 2015; Child Labour (Prohibition and Regulation) Amendment Act 2016; Child Marriage Prohibition Act 2006",
    "Healthcare Rights": "Clinical Establishments Act 2010; Mental Healthcare Act 2017; Maternity Benefit Act 1961",
    "Environmental Rights": "Environment Protection Act 1986; National Green Tribunal Act 2010; Water (Prevention and Control of Pollution) Act 1974",
    "Public Nuisance / Municipal Complaint": "Indian Penal Code Section 268 (Public Nuisance); Code of Criminal Procedure Section 133 (Conditional Order for Removal of Nuisance); Municipal Corporation Act; Motor Vehicles Act 1988 (for illegal parking)",
    "Police Misconduct / Accountability": "CrPC / BNSS 2023; Prevention of Corruption Act 1988; D.K. Basu Guidelines (SC 1997); Prakash Singh Guidelines (SC 2006)",
    "Caste Discrimination / SC-ST Atrocity": "Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act 1989 (amended 2015)",
    "Senior Citizen Rights": "Maintenance and Welfare of Parents and Senior Citizens Act 2007",
    "Government Scheme Denial": "Relevant scheme guidelines; Right to Information Act 2005",
    "Free Legal Aid Request": "Legal Services Authorities Act 1987",
    "Other": "Relevant Indian law",
}

# ─── Category → key helpline numbers ───
CATEGORY_HELPLINES = {
    "Domestic Violence": "Women Helpline: 181 | Police: 112",
    "Criminal Rights / Arrest": "Legal Aid: 15100 | NHRC: 14433",
    "Cyber Crime": "Cyber Crime Helpline: 1930 | cybercrime.gov.in",
    "Child Rights": "Childline: 1098 | NCPCR: 1800-121-2830",
    "Healthcare Rights": "Ambulance: 108 | Ayushman Bharat: 14555",
    "Police Misconduct / Accountability": "NHRC: 14433 | Legal Aid: 15100",
    "Caste Discrimination / SC-ST Atrocity": "NALSA: 15100 | NHRC: 14433",
    "Senior Citizen Rights": "Elderline: 14567",
    "Disability Rights": "Divyangjan Helpline: 1800-11-4515",
    "MGNREGA Wage Dispute": "MGNREGA Helpline: 1800-345-3000",
    "RTI Application": "RTI Online: rtionline.gov.in",
    "Free Legal Aid Request": "NALSA: 15100",
    "Consumer Complaint": "Consumer Helpline: 1800-11-4000",
    "Public Nuisance / Municipal Complaint": "Municipal Helpline: 155304 | Police: 100 | Civic Issues: 1800-xxx-xxxx",
}


def _simplify_prompt_for_retry(prompt: str) -> str:
    """Strip potentially triggering content from the prompt for a retry."""
    import re
    prompt = re.sub(
        r"=== UPLOADED DOCUMENT ===[\s\S]*?=== END DOCUMENT ===",
        "=== UPLOADED DOCUMENT ===\n[Document content provided — please answer based on general legal knowledge]\n=== END DOCUMENT ===",
        prompt
    )
    prompt = re.sub(
        r"--- SUPPLEMENTARY WEB INFO[\s\S]*?--- END WEB INFO ---",
        "",
        prompt
    )
    prompt = re.sub(
        r"--- KNOWLEDGE BASE[\s\S]*?--- END KNOWLEDGE BASE ---",
        "",
        prompt
    )
    if len(prompt) > 4000:
        prompt = prompt[:4000] + "\n[Prompt truncated for retry]"
    return prompt


def _content_filtered_fallback() -> str:
    """Return a safe JSON fallback when content filters block the response."""
    return json.dumps({
        "answer": (
            "I apologize, but I was unable to generate a response for this particular query "
            "due to content safety filters. This can happen when the document or question "
            "contains sensitive content.\n\n**What you can try:**\n"
            "- Rephrase your question in simpler terms\n"
            "- Ask about a specific section of the document\n"
            "- Try a more general legal question\n\n"
            "If this issue persists, please consult a local legal aid center or call **15100** "
            "(free legal aid helpline)."
        ),
        "laws_cited": [],
        "action_steps": [
            "Try rephrasing your question",
            "Ask about a specific section",
            "Contact legal aid helpline 15100",
        ],
        "needs_lawyer": False,
        "follow_up_questions": [
            "Can you help me understand my basic rights?",
            "What legal aid options are available?",
        ],
        "web_enhanced": False,
    })


def invoke_bedrock(prompt: str, max_tokens: int = 2048, use_demo: bool = False) -> str:
    """Invoke Bedrock with fallback to mock responses."""
    if use_demo:
        if "categorize" in prompt.lower():
            return json.dumps({
                "category": "MGNREGA Wage Dispute",
                "confidence": 0.92,
                "clarification_needed": False,
                "clarification_question": None,
                "summary": "Complaint about unpaid MGNREGA wages",
                "applicable_law": CATEGORY_LAWS["MGNREGA Wage Dispute"],
                "urgency": "medium",
                "helpline": CATEGORY_HELPLINES.get("MGNREGA Wage Dispute", "NALSA: 15100"),
            })
        elif "generate" in prompt.lower() or "notice" in prompt.lower():
            return json.dumps({
                "notice_en": (
                    "LEGAL NOTICE\n\nTo: The Block Development Officer / Programme Officer\n"
                    "     MGNREGA Department\n     [District Name]\n\n"
                    "Subject: Legal Notice for Non-Payment of Wages under MGNREGA\n\n"
                    "Dear Officer,\n\nThis is to bring to your notice that the undersigned, a registered "
                    "MGNREGA worker under Job Card No. [XXXXX], has not received wages amounting to "
                    "Rs.4,500 for work performed under the Mahatma Gandhi National Rural Employment "
                    "Guarantee Act, 2005. As per Section 3 of the MGNREGA Act, 2005, every eligible "
                    "worker is entitled to wages within 15 days of completion of work.\n\n"
                    "I hereby demand immediate release of pending wages within 15 days of receipt of "
                    "this notice, failing which I shall be constrained to approach the Programme Officer "
                    "and District Grievance Redressal Office.\n\nRespectfully,\n[Your Name]\nDate: [Current Date]"
                ),
                "explanation_hi": (
                    "यह कानूनी नोटिस मनरेगा के तहत बकाया मजदूरी के लिए भेजा गया है। "
                    "आपको 15 दिनों के भीतर ₹4,500 की मजदूरी मिलनी चाहिए। "
                    "अगर नहीं मिली तो आप कार्यक्रम अधिकारी के पास शिकायत कर सकते हैं।"
                ),
                "law_cited": "Mahatma Gandhi National Rural Employment Guarantee Act, 2005",
                "demands": [
                    "Immediate release of pending wages of Rs.4,500",
                    "Compensation at 0.05% per day for delay",
                    "Written acknowledgement within 7 days",
                ],
            })
        else:
            return "Mock Bedrock response for development"

    try:
        resp = bedrock.converse(
            modelId=MODEL_ID,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": max_tokens, "temperature": 0.7},
        )

        stop_reason = resp.get("stopReason", "")
        if stop_reason == "content_filtered":
            print(f"[Bedrock] Content filtered (stop_reason={stop_reason}). Retrying with simplified prompt...")
            simplified = _simplify_prompt_for_retry(prompt)
            retry_resp = bedrock.converse(
                modelId=MODEL_ID,
                messages=[{"role": "user", "content": [{"text": simplified}]}],
                inferenceConfig={"maxTokens": max_tokens, "temperature": 0.5},
            )
            if retry_resp.get("stopReason", "") == "content_filtered":
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


# ═══════════════════════════════════════════════════════════
#  ENDPOINTS
# ═══════════════════════════════════════════════════════════

@router.post("/categorize")
async def categorize_complaint(body: dict):
    """
    Categorize a legal complaint from transcript.
    Body: { transcript: str, language: str }
    Returns: { category, confidence, clarification_needed, clarification_question,
               summary, applicable_law, urgency, helpline }
    """
    transcript = body.get("transcript", "")
    language = body.get("language", "hi")

    categories_str = "\n".join(f"- {c}" for c in COMPLAINT_CATEGORIES)

    prompt = f"""You are a legal AI assistant helping rural Indians access justice in India.
Categorize the following legal complaint into exactly one of these categories:
{categories_str}

Also assess urgency:
- "high": involves physical safety, ongoing violence, illegal detention, child in danger, eviction threat
- "medium": financial loss, denial of government benefits, pending legal action
- "low": general information, document drafting, scheme eligibility query

Complaint (in {language}): {transcript}

Respond ONLY in valid JSON format:
{{
  "category": "<one of the categories above>",
  "confidence": <0.0-1.0>,
  "clarification_needed": <true/false>,
  "clarification_question": "<question in {language} if clarification needed, else null>",
  "summary": "<1-sentence English summary of the complaint>",
  "applicable_law": "<primary Indian law applicable>",
  "urgency": "<high|medium|low>",
  "helpline": "<most relevant helpline number for this issue or null>"
}}"""

    text = invoke_bedrock(prompt, max_tokens=512)
    start = text.find("{")
    end = text.rfind("}") + 1
    result = json.loads(text[start:end])

    # Enrich with knowledge-base-backed law and helpline if model left them blank
    category = result.get("category", "Other")
    if not result.get("applicable_law"):
        result["applicable_law"] = CATEGORY_LAWS.get(category, "Relevant Indian law")
    if not result.get("helpline"):
        result["helpline"] = CATEGORY_HELPLINES.get(category, "NALSA Legal Aid: 15100")

    return result


@router.post("/generate-notice")
async def generate_notice(body: dict):
    """
    Generate a formal legal notice from categorized complaint data.
    Body: { category, transcript, entities, language, userId, respondent }
    Returns: { notice_en, explanation_hi, law_cited, demands, next_steps, deadline_days }
    """
    category = body.get("category", "")
    transcript = body.get("transcript", "")
    language = body.get("language", "hi")
    entities = body.get("entities", {})
    respondent = body.get("respondent", {})

    applicable_law = CATEGORY_LAWS.get(category, "Relevant Indian law")

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
Applicable law: {applicable_law}
Complaint (original): {transcript}
Extracted details: {json.dumps(entities)}
{respondent_block}

The notice must:
1. Cite the relevant Indian law section precisely (e.g., Section 3, MGNREGA Act 2005)
2. State facts clearly and chronologically
3. List specific demands with amounts/dates where applicable
4. State the response deadline (15 days standard; 48 hours for life/liberty matters)
5. Mention consequences of non-compliance (next legal steps)
6. Be professional and legally sound

Format your response as JSON:
{{
  "notice_en": "<full formal English legal notice>",
  "explanation_hi": "<simple Hindi explanation in 3-4 sentences>",
  "law_cited": "<primary law and section(s)>",
  "demands": ["<specific demand 1>", "<specific demand 2>"],
  "next_steps": ["<step 1 if notice is ignored>", "<step 2>"],
  "deadline_days": <integer, typically 15>
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
    Extract key entities from a legal complaint transcript.
    Body: { transcript: str, language: str }
    Returns: { amount, dates, parties, location, duration, offense_type, evidence_mentioned }
    """
    transcript = body.get("transcript", "")

    prompt = f"""Extract structured information from this legal complaint.

Complaint: {transcript}

Return ONLY valid JSON:
{{
  "amount": "<monetary amount mentioned or null>",
  "dates": ["<date 1>", "<date 2>"],
  "parties": {{
    "complainant": "<name or null>",
    "respondent": "<name or null>",
    "witnesses": ["<witness name or null>"]
  }},
  "location": "<village/block/district/state or null>",
  "duration": "<time period of the issue or null>",
  "offense_type": "<brief description of the alleged offense>",
  "evidence_mentioned": ["<document or evidence type 1>", "<document or evidence type 2>"],
  "government_scheme": "<scheme name if relevant, e.g. MGNREGA, PM-JAY, or null>"
}}"""

    text = invoke_bedrock(prompt, max_tokens=512)
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])


@router.post("/action-plan")
async def generate_action_plan(body: dict):
    """
    Generate a step-by-step action plan for a given complaint category and context.
    Body: { category: str, transcript: str, entities: dict, language: str }
    Returns: { steps, estimated_timeline, documents_needed, free_resources, escalation_path }
    """
    category = body.get("category", "")
    transcript = body.get("transcript", "")
    entities = body.get("entities", {})
    language = body.get("language", "hi")

    applicable_law = CATEGORY_LAWS.get(category, "Relevant Indian law")
    helpline = CATEGORY_HELPLINES.get(category, "NALSA: 15100")

    prompt = f"""You are a legal advisor helping a rural Indian citizen resolve their legal problem.
Create a clear, practical step-by-step action plan for the following case.
The person may have limited literacy and resources — keep steps simple and actionable.

Category: {category}
Applicable law: {applicable_law}
Complaint: {transcript}
Known details: {json.dumps(entities)}

Provide the action plan in JSON:
{{
  "steps": [
    {{
      "step_number": 1,
      "action": "<what to do>",
      "where": "<office/portal/phone number>",
      "deadline": "<within X days or null>",
      "tip": "<practical tip for a rural person>"
    }}
  ],
  "estimated_timeline": "<e.g. 15-30 days>",
  "documents_needed": ["<document 1>", "<document 2>"],
  "free_resources": [
    {{
      "name": "<resource name>",
      "contact": "<phone or website>",
      "type": "<helpline|office|portal>"
    }}
  ],
  "escalation_path": ["<level 1 authority>", "<level 2 authority>", "<level 3 authority>"],
  "explanation_{language}": "<3-4 sentence explanation of the plan in {language}>"
}}"""

    text = invoke_bedrock(prompt, max_tokens=2048)
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON found in Bedrock response: {text[:200]}")
    return json.loads(text[start:end])


@router.post("/check-scheme-eligibility")
async def check_scheme_eligibility(body: dict):
    """
    Check a person's eligibility for government schemes based on their profile.
    Body: { profile: dict, complaint_category: str, language: str }
    profile keys: age, gender, caste, income, land_owned, state, occupation, disability, bpl_card
    Returns: { eligible_schemes, partially_eligible, how_to_apply }
    """
    profile = body.get("profile", {})
    complaint_category = body.get("complaint_category", "")
    language = body.get("language", "hi")

    prompt = f"""You are a government scheme advisor for rural India.
Based on the following citizen profile, identify government schemes they are eligible for.
Focus especially on schemes relevant to their complaint category.

Citizen profile: {json.dumps(profile)}
Complaint category: {complaint_category}

Consider schemes from these areas:
- Employment (MGNREGA, PM-KISAN)
- Health (Ayushman Bharat PM-JAY, JSY, PMMVY)
- Housing (PMAY-Gramin)
- Social Security (NSAP pensions, e-Shram)
- Education (RTE, scholarships, Mid-Day Meal)
- Disability (ADIP, NHFDC, UDID)
- Women (Ujjwala, Sukanya Samriddhi, One-Stop Centre)
- Senior Citizens (IGNOAPS, PMVVY, Ayushman 70+)
- SC/ST (Pre-Matric Scholarship, Dr. Ambedkar Scholarship, NSFDC loans)
- Legal Aid (NALSA free legal aid)

Return ONLY valid JSON:
{{
  "eligible_schemes": [
    {{
      "scheme_name": "<name>",
      "benefit": "<what they get>",
      "how_to_apply": "<portal or office>",
      "documents_needed": ["<doc 1>", "<doc 2>"]
    }}
  ],
  "partially_eligible": [
    {{
      "scheme_name": "<name>",
      "missing_requirement": "<what they need to qualify>"
    }}
  ],
  "priority_action": "<most important scheme to apply for first and why>",
  "explanation_{language}": "<3-4 sentence summary in {language}>"
}}"""

    text = invoke_bedrock(prompt, max_tokens=2048)
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON found in Bedrock response: {text[:200]}")
    return json.loads(text[start:end])


@router.post("/generate-rti")
async def generate_rti(body: dict):
    """
    Draft an RTI application for a specific information request.
    Body: { information_needed: str, public_authority: str, entities: dict, language: str }
    Returns: { rti_application_en, explanation_hi, pio_address_hint, fee_info, follow_up_steps }
    """
    information_needed = body.get("information_needed", "")
    public_authority = body.get("public_authority", "")
    entities = body.get("entities", {})
    language = body.get("language", "hi")

    prompt = f"""You are an RTI expert in India. Draft a formal RTI application under the Right to Information Act 2005.

Information needed: {information_needed}
Public authority: {public_authority}
Additional details: {json.dumps(entities)}

The RTI application must:
1. Be addressed to the Public Information Officer (PIO)
2. Cite Section 6(1) of the RTI Act 2005
3. List specific, clear questions (not vague requests)
4. Mention the ₹10 application fee (or exemption if BPL)
5. Request response within 30 days as per Section 7
6. Include a request for documents under Section 2(f)

Return ONLY valid JSON:
{{
  "rti_application_en": "<full formal RTI application text>",
  "explanation_{language}": "<simple explanation in {language} of what the RTI asks for>",
  "pio_address_hint": "<suggested address/department for the PIO>",
  "fee_info": "<₹10 by postal order/DD/cash — BPL exemption note>",
  "questions_asked": ["<specific question 1>", "<specific question 2>"],
  "follow_up_steps": [
    "<Step 1: If no response in 30 days — file First Appeal>",
    "<Step 2: If First Appeal fails — file Second Appeal with Information Commission>"
  ]
}}"""

    text = invoke_bedrock(prompt, max_tokens=2048)
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON found in Bedrock response: {text[:200]}")
    return json.loads(text[start:end])


@router.post("/translate-explain")
async def translate_and_explain(body: dict):
    """
    Translate a legal document or notice into simple local language and explain it.
    Body: { text: str, target_language: str, simplify: bool }
    Returns: { translation, simple_explanation, key_points, action_required, deadline }
    """
    text_input = body.get("text", "")
    target_language = body.get("target_language", "hi")
    simplify = body.get("simplify", True)

    simplify_instruction = (
        "Use simple everyday language a person with Class 5 education can understand. Avoid legal jargon."
        if simplify else
        "Provide an accurate translation maintaining legal terminology."
    )

    prompt = f"""You are a legal translator and explainer for rural India.
Translate and explain the following legal text in {target_language}.
{simplify_instruction}

Legal text:
{text_input}

Return ONLY valid JSON:
{{
  "translation": "<translated text in {target_language}>",
  "simple_explanation": "<simple explanation of what this document means in {target_language}>",
  "key_points": ["<key point 1 in {target_language}>", "<key point 2>"],
  "action_required": "<what the person receiving this must do, or null>",
  "deadline": "<any deadline mentioned or null>",
  "is_urgent": <true/false>
}}"""

    text = invoke_bedrock(prompt, max_tokens=2048)
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON found in Bedrock response: {text[:200]}")
    return json.loads(text[start:end])


# ── Recipient resolution ─────────────────────────────────────────────────
# Fast static path: clearly-government categories skip the LLM entirely.
# Only "mixed" and "Other" categories invoke Bedrock to read the transcript.
_GOVERNMENT_ONLY = {
    "MGNREGA Wage Dispute",
    "RTI Application",
    "Public Nuisance / Municipal Complaint",
    "Police Misconduct / Accountability",
    "Environmental Rights",
    "Disability Rights",
    "Education Rights",
    "Government Scheme Denial",
    "Free Legal Aid Request",
    "Criminal Rights / Arrest",
}

_MIXED_CATEGORIES = {
    "Consumer Complaint",
    "Labour Rights",
    "Land Dispute",
    "Property Dispute",
    "Domestic Violence",
    "Caste Discrimination / SC-ST Atrocity",
    "Child Rights",
    "Healthcare Rights",
    "Senior Citizen Rights",
    "Cyber Crime",
}

_PRIVATE_PARTY_LABELS = {
    "Domestic Violence":                    "Abuser / Respondent",
    "Labour Rights":                        "Employer / Company",
    "Land Dispute":                         "Other party in the dispute",
    "Property Dispute":                     "Other party in the dispute",
    "Consumer Complaint":                   "Shopkeeper / Service provider",
    "Healthcare Rights":                    "Hospital / Doctor",
    "Senior Citizen Rights":                "Family member / caretaker",
    "Cyber Crime":                          "Accused (if known)",
    "Caste Discrimination / SC-ST Atrocity":"Accused / Aggressor",
    "Child Rights":                         "Responsible party (school / employer / guardian)",
}


@router.post("/resolve-recipients")
async def resolve_recipients(body: dict):
    """
    Decide WHO should receive a legal notice for a given complaint.

    For clearly government-facing categories (RTI, MGNREGA, Public Nuisance, etc.)
    it returns the static authority list immediately — no LLM call.

    For mixed / ambiguous categories it uses Bedrock to read the transcript
    and determine whether the dispute is:
      - "government"  → only govt authorities
      - "private"     → only the other private party (complainant fills the email)
      - "mixed"       → both govt authorities AND a field for the private party

    Body:  { category: str, transcript: str, language: str }
    Returns: {
        recipient_type: "government" | "private" | "mixed",
        authorities: [{ label, dept }],   # empty for pure-private
        show_private_field: bool,
        private_party_label: str,         # contextual label for the empty field
        hint: str                         # short UI hint sentence
    }
    """
    category  = body.get("category", "Other")
    transcript = body.get("transcript", "")
    language  = body.get("language", "hi")

    # ── Fast path: purely government categories ───────────────────────────
    if category in _GOVERNMENT_ONLY:
        return {
            "recipient_type": "government",
            "authorities": [],          # frontend fills from its static map
            "show_private_field": False,
            "private_party_label": "",
            "hint": "Complaint is against a government authority — relevant officials have been auto-filled.",
        }

    # ── LLM path: mixed / ambiguous / Other ──────────────────────────────
    private_label_hint = _PRIVATE_PARTY_LABELS.get(category, "Other party in the dispute")

    prompt = f"""You are a legal AI assistant for India.
A citizen has filed the following complaint (category: {category}).
Read the complaint carefully and decide who should receive the legal notice.

Complaint: {transcript}

Possible recipient types:
1. "government"  — The complaint is ONLY against a government authority / public body
   (e.g. RTI denial, scheme not given, public nuisance by a municipal body).
2. "private"     — The complaint is ONLY about a dispute between two private individuals
   or a private entity (e.g. landlord-tenant, unpaid salary by a private company,
   domestic violence within family). No government authority needs to be notified first.
3. "mixed"       — BOTH a private party AND a government authority should be notified
   (e.g. cyber crime where police must be informed AND the platform / attacker contacted;
   labour dispute where employer AND labour inspector both need notice).

Also provide:
- "private_party_label": a short label describing WHO the private party is
  (e.g. "Employer / Company", "Landlord", "Accused family member").
  Return null if recipient_type is "government".
- "hint": one short sentence (in English) to show the user explaining this decision.

Return ONLY valid JSON — no commentary:
{{
  "recipient_type": "<government|private|mixed>",
  "private_party_label": "<label or null>",
  "hint": "<one sentence>"
}}"""

    try:
        text = invoke_bedrock(prompt, max_tokens=256)
        start = text.find("{")
        end   = text.rfind("}") + 1
        data  = json.loads(text[start:end])
        rtype = data.get("recipient_type", "mixed")
        plabel = data.get("private_party_label") or private_label_hint
        hint  = data.get("hint", "")
    except Exception:
        # Safe fallback for LLM errors
        rtype  = "mixed"
        plabel = private_label_hint
        hint   = "Could not determine automatically — please review recipients below."

    return {
        "recipient_type": rtype,
        "authorities": [],          # frontend fills from its static map
        "show_private_field": rtype in ("private", "mixed"),
        "private_party_label": plabel if rtype != "government" else "",
        "hint": hint,
    }


@router.get("/categories")
async def list_categories():
    """Return all supported complaint categories with their applicable laws and helplines."""
    return {
        "categories": [
            {
                "name": cat,
                "applicable_law": CATEGORY_LAWS.get(cat, "Relevant Indian law"),
                "helpline": CATEGORY_HELPLINES.get(cat, "NALSA: 15100"),
            }
            for cat in COMPLAINT_CATEGORIES
        ],
        "total": len(COMPLAINT_CATEGORIES),
    }