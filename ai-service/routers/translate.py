"""
Translation router — AWS Translate + Comprehend for multi-language support.
"""
from fastapi import APIRouter
import boto3
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

translate_client = boto3.client(
    "translate",
    region_name=os.getenv("AWS_REGION", "ap-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

comprehend_client = boto3.client(
    "comprehend",
    region_name=os.getenv("AWS_REGION", "ap-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

# Language code mapping for AWS Translate
LANG_MAP = {
    "hi": "hi",    # Hindi
    "en": "en",    # English
    "mr": "mr",    # Marathi
    "ta": "ta",    # Tamil
    "te": "te",    # Telugu
    "bn": "bn",    # Bengali
    "gu": "gu",    # Gujarati
    "kn": "kn",    # Kannada
    "ml": "ml",    # Malayalam
    "pa": "pa",    # Punjabi
    "ur": "ur",    # Urdu
}


@router.post("/translate")
async def translate_text(body: dict):
    """
    Translate text between languages.
    Body: { text, source_lang, target_lang }
    """
    text = body.get("text", "")
    source = body.get("source_lang", "auto")
    target = body.get("target_lang", "hi")

    if not text:
        return {"error": "No text provided"}

    try:
        result = translate_client.translate_text(
            Text=text,
            SourceLanguageCode=source,
            TargetLanguageCode=LANG_MAP.get(target, target)
        )
        return {
            "translated_text": result["TranslatedText"],
            "source_language": result["SourceLanguageCode"],
            "target_language": result["TargetLanguageCode"]
        }
    except Exception as e:
        print(f"Translation error: {e}")
        # Fallback: return original text
        return {
            "translated_text": text,
            "source_language": source,
            "target_language": target,
            "error": str(e)
        }


@router.post("/detect-language")
async def detect_language(body: dict):
    """
    Detect the dominant language of the input text.
    Body: { text }
    """
    text = body.get("text", "")
    if not text:
        return {"error": "No text provided"}

    try:
        result = comprehend_client.detect_dominant_language(Text=text[:5000])
        languages = result.get("Languages", [])
        if languages:
            top = max(languages, key=lambda x: x["Score"])
            return {
                "language": top["LanguageCode"],
                "confidence": top["Score"],
                "all_languages": languages
            }
        return {"language": "en", "confidence": 0.5}
    except Exception as e:
        print(f"Language detection error: {e}")
        return {"language": "en", "confidence": 0.0, "error": str(e)}
