"""
TTS router — AWS Polly for text-to-speech.
Converts text responses to audio so the app can speak answers aloud.
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import boto3
import os
import io
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

polly_client = boto3.client(
    "polly",
    region_name=os.getenv("AWS_REGION", "ap-south-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

# Voice IDs for Indian languages
VOICE_MAP = {
    "hi": {"voice_id": "Aditi", "engine": "standard"},       # Hindi
    "en": {"voice_id": "Aditi", "engine": "standard"},       # English (Indian accent)
    "en-us": {"voice_id": "Joanna", "engine": "neural"},     # US English
    "ta": {"voice_id": "Aditi", "engine": "standard"},       # Tamil (fallback to Hindi)
    "te": {"voice_id": "Aditi", "engine": "standard"},       # Telugu (fallback)
}


@router.post("/speak")
async def text_to_speech(body: dict):
    """
    Convert text to speech using AWS Polly.
    Body: { text, language }
    Returns: audio/mpeg stream
    """
    text = body.get("text", "")
    language = body.get("language", "hi")

    if not text:
        return {"error": "No text provided"}

    # Truncate very long text (Polly has limits)
    if len(text) > 3000:
        text = text[:3000] + "..."

    voice_config = VOICE_MAP.get(language, VOICE_MAP["hi"])

    try:
        response = polly_client.synthesize_speech(
            Text=text,
            OutputFormat="mp3",
            VoiceId=voice_config["voice_id"],
            Engine=voice_config["engine"],
        )

        audio_stream = response["AudioStream"].read()
        return StreamingResponse(
            io.BytesIO(audio_stream),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except Exception as e:
        print(f"Polly TTS error: {e}")
        return {"error": f"Text-to-speech failed: {str(e)}"}


@router.get("/voices")
async def list_voices():
    """List available Polly voices for Indian languages."""
    try:
        response = polly_client.describe_voices(LanguageCode="hi-IN")
        voices = [
            {"id": v["Id"], "name": v["Name"], "gender": v["Gender"], "language": v["LanguageCode"]}
            for v in response.get("Voices", [])
        ]
        return {"voices": voices}
    except Exception as e:
        return {"voices": [], "error": str(e)}
