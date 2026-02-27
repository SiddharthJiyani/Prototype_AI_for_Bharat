from fastapi import APIRouter
import json
from datetime import datetime
from .legal import invoke_bedrock

router = APIRouter()


@router.post("/generate-minutes")
async def generate_minutes(body: dict):
    """
    Generate structured Gram Sabha meeting minutes from audio transcript.
    Body: { transcript, date, location, attendees, meeting_type }
    """
    transcript = body.get("transcript", "")
    date = body.get("date", datetime.now().strftime("%d %B %Y"))
    location = body.get("location", "Gram Panchayat Bhavan")
    attendees = body.get("attendees", [])
    meeting_type = body.get("meeting_type", "Gram Sabha")

    attendee_list = ", ".join(attendees[:20]) if attendees else "Not specified"

    prompt = f"""You are an expert at generating formal Gram Sabha meeting minutes from transcripts.

Meeting Details:
- Type: {meeting_type}
- Date: {date}
- Location: {location}
- Attendees: {attendee_list}

Audio Transcript:
{transcript[:3000]}

Generate comprehensive meeting minutes in formal government format.
Return JSON:
{{
  "meeting_details": {{
    "title": "<formal meeting title>",
    "date": "{date}",
    "location": "{location}",
    "presided_by": "<name from transcript or 'Sarpanch'>",
    "total_attendance": <number or "Not recorded">,
    "quorum_met": true
  }},
  "agenda_items": ["<item1>", "<item2>", "<item3>"],
  "key_decisions": [
    {{
      "item": "<agenda item>",
      "decision": "<what was decided>",
      "resolution_no": "GS/<year>/<number>"
    }}
  ],
  "action_items": [
    {{
      "task": "<task description>",
      "responsible": "<person/office>",
      "due_date": "<date or timeframe>",
      "priority": "high|medium|low"
    }}
  ],
  "schemes_discussed": ["<scheme1>"],
  "funds_approved": [
    {{
      "purpose": "<purpose>",
      "amount_inr": <amount or 0>,
      "source": "<fund source>"
    }}
  ],
  "next_meeting": "<suggested date or 'To be decided'>",
  "summary_hindi": "<2-3 sentence meeting summary in Hindi>"
}}"""

    text = invoke_bedrock(prompt, max_tokens=2048)
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])
