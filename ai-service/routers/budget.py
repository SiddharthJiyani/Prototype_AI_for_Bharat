from fastapi import APIRouter
import json
from .legal import invoke_bedrock

router = APIRouter()


@router.post("/suggest")
async def suggest_budget(body: dict):
    """
    AI-powered budget allocation suggestions for panchayat.
    Body: { panchayatId, population, current_allocations, grievances, active_schemes }
    """
    panchayat_id = body.get("panchayatId", "")
    population = body.get("population", 1000)
    current = body.get("current_allocations", {})
    grievances = body.get("grievances", [])
    schemes = body.get("active_schemes", [])

    grievance_summary = ", ".join(
        [f"{g.get('type','?')} ({g.get('count', 1)} cases)" for g in grievances[:10]]
    ) or "None reported"
    scheme_list = ", ".join(schemes[:5]) or "None active"

    prompt = f"""You are a rural finance expert helping a Gram Panchayat optimize its annual budget.

Panchayat ID: {panchayat_id}
Population: {population}
Current Allocations (INR): {json.dumps(current)}
Recent Grievance Types: {grievance_summary}
Active Schemes: {scheme_list}

Based on this data:
1. Suggest optimal budget allocations across key heads
2. Identify 2-3 priority areas based on grievance data
3. Flag any potential fund under-utilization

Return JSON:
{{
  "suggested_allocations": {{
    "Infrastructure (Roads/Drains)": <amount_inr>,
    "Drinking Water Supply": <amount_inr>,
    "Sanitation": <amount_inr>,
    "Education": <amount_inr>,
    "Health & Nutrition": <amount_inr>,
    "Agriculture Support": <amount_inr>,
    "Social Welfare": <amount_inr>,
    "Administration": <amount_inr>
  }},
  "priority_areas": ["<area1>", "<area2>", "<area3>"],
  "reasoning": "<2-3 sentences explaining the allocation logic>",
  "risk_flags": ["<flag1 if any>"],
  "per_capita_spend": <total/population>
}}"""

    text = invoke_bedrock(prompt, max_tokens=1024)
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])
