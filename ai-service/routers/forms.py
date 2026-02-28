"""
Forms router — endpoints for legal form analysis, field detection, AI suggestions,
AI assist, and filled-form export.
"""
import os
import json
import re
import uuid
import tempfile
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from routers.legal import invoke_bedrock

router = APIRouter()

# Temp directory for uploaded forms
UPLOAD_DIR = Path(tempfile.gettempdir()) / "formauto_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── Pydantic models ──

class DetectedField(BaseModel):
    id: str
    label_text: str
    bbox: List[int]
    page_number: int = 1
    semantic_type: str = "text"
    confidence: str = "High"
    is_sensitive: bool = False
    description: str = ""
    suggestions: List[str] = []
    value: str = ""


class FormAnalyzeResponse(BaseModel):
    success: bool
    form_id: str
    fields: List[DetectedField]


class FieldSuggestRequest(BaseModel):
    field: Dict[str, Any]
    context: str = ""
    language: str = "en"


class FieldSuggestAllRequest(BaseModel):
    fields: List[Dict[str, Any]]
    context: str = ""
    language: str = "en"


class AIAssistRequest(BaseModel):
    prompt: str
    fields: List[Dict[str, Any]] = []
    context: str = ""
    language: str = "en"


class FieldValue(BaseModel):
    id: str
    value: str


class FormExportRequest(BaseModel):
    form_id: str
    field_values: List[FieldValue]
    original_filename: str = ""
    export_format: str = "pdf"


# ── Helpers ──

def _call_bedrock_text(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
    """Call Bedrock Nova for text generation. Falls back to demo data on errors."""
    try:
        result = invoke_bedrock(system_prompt + "\n\n" + user_prompt)
        if isinstance(result, dict):
            return result.get("text", str(result))
        return str(result)
    except Exception as e:
        print(f"[Forms] Bedrock call failed: {e}")
        raise


def _extract_text_from_pdf(file_path: str) -> List[Dict]:
    """Extract text and word positions from PDF using pdfplumber."""
    try:
        import pdfplumber
    except ImportError:
        raise HTTPException(status_code=500, detail="pdfplumber not installed. Run: pip install pdfplumber")

    pages_data = []
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            words = page.extract_words(keep_blank_chars=True, extra_attrs=["fontname", "size"])
            page_words = []
            for w in words:
                page_words.append({
                    "text": w["text"],
                    "bbox": [int(w["x0"]), int(w["top"]), int(w["x1"]), int(w["bottom"])]
                })
            pages_data.append({
                "page_number": i + 1,
                "width": int(page.width),
                "height": int(page.height),
                "words": page_words,
                "full_text": page.extract_text() or ""
            })
    return pages_data


def _extract_text_from_image(file_path: str) -> List[Dict]:
    """Extract text from image using basic OCR approach via Bedrock vision."""
    # We'll use Bedrock's multimodal to read the image
    import base64
    with open(file_path, "rb") as f:
        img_bytes = f.read()

    img_b64 = base64.b64encode(img_bytes).decode()
    ext = Path(file_path).suffix.lower()
    media_type = "image/png" if ext == ".png" else "image/jpeg"

    # Use Bedrock to extract text from image
    system_prompt = (
        "You are a document OCR system. Extract all visible text from the image.\n"
        "Return the extract as plain text, preserving layout as much as possible.\n"
        "Include all form field labels, instructions, headers, and any pre-filled text."
    )

    try:
        import boto3
        client = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))
        response = client.converse(
            modelId="amazon.nova-lite-v1:0",
            messages=[{
                "role": "user",
                "content": [
                    {"image": {"format": ext.replace(".", ""), "source": {"bytes": img_bytes}}},
                    {"text": system_prompt}
                ]
            }],
            inferenceConfig={"maxTokens": 4096, "temperature": 0.1}
        )
        extracted_text = response["output"]["message"]["content"][0]["text"]
    except Exception as e:
        print(f"[Forms] Image OCR via Bedrock failed: {e}")
        extracted_text = ""

    return [{
        "page_number": 1,
        "width": 800,
        "height": 1100,
        "words": [{"text": w, "bbox": [0, 0, 0, 0]} for w in extracted_text.split()],
        "full_text": extracted_text
    }]


def _detect_form_fields(pages_data: List[Dict], context: str = "") -> List[Dict]:
    """Use Bedrock LLM to detect fillable fields from extracted OCR data."""
    # Serialize page data (cap at ~4000 words)
    word_count = 0
    trimmed_pages = []
    for page in pages_data:
        if word_count > 4000:
            break
        trimmed_pages.append({
            "page_number": page["page_number"],
            "width": page["width"],
            "height": page["height"],
            "words": page["words"][:500]
        })
        word_count += len(page["words"])

    # Also send full text for better understanding
    full_text_concat = "\n\n".join(p.get("full_text", "") for p in pages_data)[:6000]

    system_prompt = (
        "You are an expert form layout analyst. Analyze this document and identify all fillable form fields.\n"
        "For each field, determine:\n"
        "- label_text: The label/heading for the field\n"
        "- semantic_type: One of [name, date, address, phone, email, pan, amount, text, number, signature, checkbox]\n"
        "- bbox: Approximate bounding box [xmin, ymin, xmax, ymax] for the blank input area "
        "(use coordinates relative to the page dimensions provided)\n"
        "- page_number: Which page the field is on\n\n"
        "Return ONLY a valid JSON array of objects. Example:\n"
        '[{"label_text": "Full Name", "semantic_type": "name", "bbox": [100, 200, 400, 230], "page_number": 1}]\n\n'
        "Identify ALL fillable fields including checkboxes, dates, signatures etc."
    )

    user_prompt = f"Document OCR Data:\n{json.dumps(trimmed_pages, default=int)[:80000]}\n\nFull Text:\n{full_text_concat}\n\nIdentified Fields JSON Array:"

    try:
        response = _call_bedrock_text(system_prompt, user_prompt, temperature=0.0)
        match = re.search(r'\[.*\]', response, re.DOTALL)
        if not match:
            return []
        llm_fields = json.loads(match.group(0))
    except Exception as e:
        print(f"[Forms] Field detection failed: {e}")
        return []

    # Generate context-aware descriptions for all fields
    field_descriptions = _batch_generate_descriptions(llm_fields, context or full_text_concat[:3000])

    detected = []
    for i, field_data in enumerate(llm_fields):
        if not isinstance(field_data.get('bbox'), list) or len(field_data['bbox']) != 4:
            continue

        field_id = f"field_{i}"
        label = field_data.get('label_text', 'Unknown')
        sem_type = field_data.get('semantic_type', 'text').lower()
        is_sensitive = sem_type in ['pan', 'address', 'phone', 'email', 'amount', 'signature']

        detected.append({
            'id': field_id,
            'label_text': label,
            'bbox': field_data['bbox'],
            'page_number': field_data.get('page_number', 1),
            'semantic_type': sem_type,
            'confidence': 'High',
            'is_sensitive': is_sensitive,
            'description': field_descriptions.get(label, "Enter the required information."),
            'value': ''
        })

    return detected


def _batch_generate_descriptions(fields_info: List[Dict], context: str) -> Dict[str, str]:
    """Generate simple, layperson-friendly descriptions for all fields in one LLM call."""
    if not fields_info:
        return {}

    field_list_str = "\n".join([
        f"- Label: \"{f.get('label_text', 'Unknown')}\", Type: \"{f.get('semantic_type', 'text')}\""
        for f in fields_info
    ])
    safe_context = (context or "")[:4000]

    system_prompt = (
        "You are a helpful AI assistant explaining a legal/government form to a layperson.\n"
        "Explain what to write and why it is needed in extremely simple, plain language.\n\n"
        "INSTRUCTIONS:\n"
        "1. Use 5th-grade reading level English. No legal jargon.\n"
        "2. For each field, explain what information is required and why.\n"
        "3. Be helpful and encouraging.\n"
        "4. Return a valid JSON object: {\"Label Text\": \"Description\"}\n\n"
        f"Document Context:\n{safe_context}\n\n"
        f"Field List:\n{field_list_str}\n\n"
        "JSON Output:"
    )

    try:
        response = _call_bedrock_text(system_prompt, "Generate simple JSON descriptions.", temperature=0.3)
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception as e:
        print(f"[Forms] Batch description generation failed: {e}")

    return {f.get('label_text', ''): "Enter the required information." for f in fields_info}


def _generate_field_suggestions(field: Dict, context: str) -> List[str]:
    """Generate potential values for a specific form field."""
    sem_type = field.get('semantic_type', 'text')
    label = field.get('label_text', '')
    is_sensitive = field.get('is_sensitive', False)

    if is_sensitive or sem_type in ['signature', 'pan']:
        return []

    system_prompt = (
        "You are a concise assistant that suggests potential values for a form field.\n"
        "Based on the field type, label, and context, provide 1-3 likely candidate values.\n"
        "Return a valid JSON list of strings [].\n"
        "Keep suggestions short and appropriate for the field type.\n"
        "Output ONLY the JSON list."
    )
    user_prompt = (
        f"Field Label: \"{label}\"\n"
        f"Field Type: \"{sem_type}\"\n"
        f"Context: \"{(context or '')[:1000]}\"\n\n"
        "Candidate values JSON list:"
    )

    try:
        response = _call_bedrock_text(system_prompt, user_prompt, temperature=0.3)
        match = re.search(r'\[.*?\]', response, re.DOTALL)
        if match:
            suggestions = json.loads(match.group(0))
            return [str(s) for s in suggestions[:3]]
    except Exception as e:
        print(f"[Forms] Suggestion generation failed for {label}: {e}")

    return []


# ── API Endpoints ──

@router.post("/analyze", response_model=FormAnalyzeResponse)
async def analyze_form(
    file: UploadFile = File(...),
    language: str = Form("en")
):
    """
    Upload a legal/government form (PDF or image). 
    OCR → LLM field detection → descriptions → suggestions.
    Returns detected fields with bounding boxes.
    """
    form_id = str(uuid.uuid4())[:8]
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()

    if ext not in [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF or image files.")

    # Save uploaded file
    save_path = UPLOAD_DIR / f"{form_id}_{filename}"
    contents = await file.read()
    with open(save_path, "wb") as f:
        f.write(contents)

    try:
        # 1. Extract text/layout
        if ext == ".pdf":
            pages_data = _extract_text_from_pdf(str(save_path))
        else:
            pages_data = _extract_text_from_image(str(save_path))

        if not pages_data or all(len(p.get("words", [])) == 0 for p in pages_data):
            raise HTTPException(status_code=422, detail="Could not extract any text from the document.")

        # 2. Build context from full text
        context_summary = "\n".join(p.get("full_text", "") for p in pages_data)[:4000]

        # 3. Detect fields via LLM
        detected_fields_raw = _detect_form_fields(pages_data, context_summary)

        if not detected_fields_raw:
            raise HTTPException(status_code=422, detail="Could not detect any fillable fields.")

        # 4. Generate suggestions per field
        final_fields = []
        for field_data in detected_fields_raw:
            suggestions = []
            if not field_data.get('is_sensitive', False):
                suggestions = _generate_field_suggestions(field_data, context_summary)

            final_fields.append(DetectedField(
                id=field_data['id'],
                label_text=field_data.get('label_text', 'Unknown'),
                bbox=field_data['bbox'],
                page_number=field_data.get('page_number', 1),
                semantic_type=field_data['semantic_type'],
                confidence=field_data['confidence'],
                is_sensitive=field_data['is_sensitive'],
                description=field_data.get('description', 'Enter required info.'),
                suggestions=suggestions,
                value=""
            ))

        # 5. Translate descriptions if needed
        if language and language != "en":
            try:
                import boto3
                translate_client = boto3.client("translate",
                    region_name=os.environ.get("AWS_REGION", "us-east-1"))
                for field in final_fields:
                    if field.description:
                        resp = translate_client.translate_text(
                            Text=field.description,
                            SourceLanguageCode="en",
                            TargetLanguageCode=language
                        )
                        field.description = resp["TranslatedText"]
            except Exception as e:
                print(f"[Forms] Translation failed: {e}")

        return FormAnalyzeResponse(success=True, form_id=form_id, fields=final_fields)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Forms] Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Form analysis failed: {str(e)}")


@router.post("/suggest")
async def suggest_field_value(body: FieldSuggestRequest):
    """Generate AI suggestions for a single form field."""
    suggestions = _generate_field_suggestions(body.field, body.context)
    return {"suggestions": suggestions}


@router.post("/suggest-all")
async def suggest_all_fields(body: FieldSuggestAllRequest):
    """Generate AI suggestions for all non-sensitive fields at once."""
    results = {}
    for field in body.fields:
        if not field.get('is_sensitive', False):
            suggestions = _generate_field_suggestions(field, body.context)
            if suggestions:
                results[field.get('id', '')] = suggestions[0]  # Use first suggestion
    return {"values": results}


@router.post("/assist")
async def ai_assist(body: AIAssistRequest):
    """Free-form AI assistance for form filling."""
    fields_summary = "\n".join([
        f"- {f.get('label_text', 'Unknown')} ({f.get('semantic_type', 'text')}): "
        f"{'[filled: ' + f.get('value', '') + ']' if f.get('value') else '[empty]'}"
        for f in body.fields
    ]) if body.fields else "No fields detected yet."

    system_prompt = (
        "You are a helpful AI assistant helping a user fill out a legal/government form.\n"
        "The user may ask questions about the form, what to write in specific fields, "
        "or request guidance on legal terminology.\n\n"
        "Respond in simple, clear language. If the user asks in Hindi (or other Indian language), "
        "respond in that language.\n\n"
        f"Current form fields:\n{fields_summary}\n\n"
        f"Document context:\n{(body.context or '')[:2000]}"
    )

    try:
        response = _call_bedrock_text(system_prompt, body.prompt)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI assist failed: {str(e)}")


@router.post("/export")
async def export_filled_form(body: FormExportRequest = Body(...)):
    """Download the form with filled values overlaid as a PDF."""
    if not body.original_filename:
        raise HTTPException(status_code=400, detail="Missing original_filename.")

    original_path = UPLOAD_DIR / f"{body.form_id}_{body.original_filename}"
    if not original_path.exists():
        raise HTTPException(status_code=404, detail="Original form file not found.")

    # For now, return the original file — client-side rendering handles overlay
    # In production, use reportlab/fpdf2 to overlay text onto PDF pages
    def iterfile():
        try:
            with open(original_path, "rb") as f:
                yield from f
        finally:
            pass  # Keep original for re-downloads

    filename = f"filled_{body.form_id}.pdf"
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    return StreamingResponse(iterfile(), media_type="application/pdf", headers=headers)
