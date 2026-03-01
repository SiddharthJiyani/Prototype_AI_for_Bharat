from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pathlib import Path
from dotenv import load_dotenv
import boto3
import io
import os
import time
import json

load_dotenv(Path(__file__).parent.parent / '.env', override=True)

router = APIRouter()

# S3 and Transcribe must use the bucket's region, not the general AWS_REGION
s3_region = os.getenv("S3_REGION", os.getenv("AWS_REGION", "us-east-1"))

transcribe = boto3.client(
    "transcribe",
    region_name=s3_region,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

polly = boto3.client(
    "polly",
    region_name=os.getenv("AWS_REGION", "ap-south-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

s3 = boto3.client(
    "s3",
    region_name=s3_region,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

LANGUAGE_CODES = {
    "hi": "hi-IN",
    "en": "en-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "mr": "mr-IN",
}

POLLY_VOICES = {
    "hi": "Kajal",
    "en": "Aditi",
}


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("hi"),
):
    """
    Upload an audio file, transcribe via Amazon Transcribe, return transcript.
    """
    bucket = os.getenv("S3_BUCKET", "intgov-documents-dev")
    key = f"audio/{int(time.time())}_{file.filename}"
    audio_bytes = await file.read()

    # Upload to S3
    s3.put_object(Bucket=bucket, Key=key, Body=audio_bytes)

    job_name = f"intgov-{int(time.time())}"
    lang_code = LANGUAGE_CODES.get(language, "hi-IN")

    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        LanguageCode=lang_code,
        MediaFormat="webm",
        Media={"MediaFileUri": f"s3://{bucket}/{key}"},
    )

    # Poll for completion (prototype: synchronous wait, max 30s)
    for _ in range(30):
        result = transcribe.get_transcription_job(TranscriptionJobName=job_name)
        status = result["TranscriptionJob"]["TranscriptionJobStatus"]
        if status == "COMPLETED":
            transcript_uri = result["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
            import urllib.request
            with urllib.request.urlopen(transcript_uri) as r:
                data = json.loads(r.read())
            text = data["results"]["transcripts"][0]["transcript"]
            return {"transcript": text, "language": language, "jobName": job_name}
        elif status == "FAILED":
            raise HTTPException(status_code=500, detail="Transcription failed")
        time.sleep(1)

    raise HTTPException(status_code=408, detail="Transcription timeout")


@router.post("/synthesize")
async def synthesize_speech(body: dict):
    """
    Convert text to speech via Amazon Polly.
    Body: { text: str, language: "hi" | "en" }
    Returns MP3 audio stream.
    """
    text = body.get("text", "")
    language = body.get("language", "hi")
    voice_id = POLLY_VOICES.get(language, "Kajal")

    response = polly.synthesize_speech(
        Text=text,
        OutputFormat="mp3",
        VoiceId=voice_id,
        Engine="neural" if voice_id in ["Kajal"] else "standard",
    )

    audio_stream = response["AudioStream"].read()
    return StreamingResponse(io.BytesIO(audio_stream), media_type="audio/mpeg")
