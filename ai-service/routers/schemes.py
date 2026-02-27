from fastapi import APIRouter
import json
import os
from .legal import invoke_bedrock

router = APIRouter()

# Static scheme catalog (in production, load from S3 or DynamoDB)
SCHEME_CATALOG = """
Available Government Schemes:
1. PM Kisan Samman Nidhi - ₹6000/year income support to farmers, requires Aadhar + land records
2. Pradhan Mantri Awas Yojana Gramin (PMAY-G) - Housing for rural poor, ₹1.2L assistance
3. Mahatma Gandhi NREGA - 100 days guaranteed employment, wage at state rate
4. Ayushman Bharat PM-JAY - Health insurance ₹5L/year for BPL families
5. Jal Jeevan Mission - Household tap connections in rural areas
6. PM Fasal Bima Yojana - Crop insurance for farmers
7. PM Ujjwala Yojana - Free LPG connection for BPL women
8. National Social Assistance Programme (NSAP) - Pension for elderly/disabled/widows ₹200-500/month
9. Mid Day Meal Scheme - Free meals for school children
10. MGNREGA Water Conservation - Employment + water harvesting works
11. Swachh Bharat Mission (Gramin) - Toilet construction ₹12,000 assistance
12. PM Kisan Maandhan Yojana - Pension scheme for farmers ₹3000/month at 60
13. Rashtriya Krishi Vikas Yojana - Agricultural development project grants
14. Deen Dayal Upadhyaya Grameen Kaushalya Yojana (DDU-GKY) - Skill training for rural youth
15. PM Garib Kalyan Anna Yojana - Free food grain 5kg/month for BPL families
"""


@router.post("/search")
async def search_schemes(body: dict):
    """
    Match village/citizen needs to relevant government schemes.
    Body: { query: str, language: str, profile: dict (optional) }
    """
    query = body.get("query", "")
    language = body.get("language", "hi")
    profile = body.get("profile", {})

    prompt = f"""You are a government scheme expert for rural India.
Based on the query below, identify the top 3-5 most relevant government schemes from the catalog.

User Query: {query}
User Profile: {json.dumps(profile)}

Scheme Catalog:
{SCHEME_CATALOG}

For each matched scheme, provide:
- Required documents
- Eligibility criteria
- Application steps (max 4 steps)
- Estimated benefit amount

Return JSON array:
[
  {{
    "name": "<scheme name>",
    "relevance": "high|medium",
    "description": "<1-sentence description>",
    "benefit": "<benefit amount/type>",
    "required_docs": ["<doc1>", "<doc2>"],
    "eligibility": "<1-sentence eligibility>",
    "next_steps": "<2-3 sentences on how to apply>",
    "funding_source": "<Central/State/Both and ratio>"
  }}
]"""

    text = invoke_bedrock(prompt, max_tokens=2048)
    start = text.find("[")
    end = text.rfind("]") + 1
    return {"schemes": json.loads(text[start:end])}
