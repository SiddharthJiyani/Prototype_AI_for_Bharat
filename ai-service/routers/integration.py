from fastapi import APIRouter
import json
from .legal import invoke_bedrock

router = APIRouter()


@router.post("/detect-patterns")
async def detect_patterns(body: dict):
    """
    Detect cross-module patterns between NyayMitra legal cases and PanchayatGPT data.
    Body: { cases: list, panchayatId: str, grievances: list (optional) }
    Returns natural-language insight + structured pattern data.
    """
    cases = body.get("cases", [])
    panchayat_id = body.get("panchayatId", "")
    grievances = body.get("grievances", [])

    case_summary = []
    for c in cases[:20]:
        case_summary.append({
            "type": c.get("category", c.get("type", "unknown")),
            "status": c.get("status", "pending"),
            "village": c.get("village", ""),
            "date": c.get("createdAt", ""),
        })

    prompt = f"""You are a rural governance analyst. Analyze cross-module data from a panchayat to detect patterns, systemic issues, and actionable insights.

Panchayat: {panchayat_id}
Legal Cases (NyayMitra): {json.dumps(case_summary[:10], ensure_ascii=False)}
Grievances (PanchayatGPT): {json.dumps(grievances[:10], ensure_ascii=False)}

Identify:
1. Whether case clusters suggest a systemic infrastructure/governance issue
2. Whether recent grievance spikes correlate with legal case types
3. Recommended panchayat resolution steps

Return JSON:
{{
  "pattern_detected": true|false,
  "severity": "critical|warning|info",
  "trigger": "<what metric crossed threshold>",
  "insight": "<1-2 sentence plain-language insight for the Sarpanch>",
  "insight_hindi": "<same insight in Hindi>",
  "root_cause_hypothesis": "<likely root cause>",
  "recommended_actions": [
    {{
      "action": "<action description>",
      "owner": "<Panchayat/Block Office/District Collector>",
      "urgency": "immediate|within_week|within_month"
    }}
  ],
  "related_schemes": ["<scheme that could address this>"],
  "evidence": {{
    "case_count": <number>,
    "dominant_type": "<most common case type>",
    "affected_area": "<village/ward if identifiable>"
  }}
}}"""

    text = invoke_bedrock(prompt, max_tokens=1024)
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])


@router.post("/cluster-analysis")
async def cluster_analysis(body: dict):
    """
    Group cases/grievances spatially or by category to identify hotspots.
    Body: { items: list[{id, type, village, date}] }
    """
    items = body.get("items", [])

    prompt = f"""Analyze these rural governance events and group them into meaningful clusters.

Events: {json.dumps(items[:30], ensure_ascii=False)}

Return JSON:
{{
  "clusters": [
    {{
      "label": "<cluster name>",
      "count": <number>,
      "types": ["<type1>"],
      "villages": ["<village1>"],
      "risk_level": "high|medium|low",
      "suggested_scheme": "<relevant government scheme>"
    }}
  ],
  "hotspot_village": "<village with most incidents>",
  "total_analyzed": {len(items)}
}}"""

    text = invoke_bedrock(prompt, max_tokens=1024)
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])
