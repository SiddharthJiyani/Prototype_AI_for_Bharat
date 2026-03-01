from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env', override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import voice, legal, schemes, budget, meetings, integration, rag, translate, tts, forms

app = FastAPI(
    title="IntegratedGov AI Service",
    description="FastAPI microservice handling all AI/ML — Amazon Bedrock, RAG, Transcribe, Polly, Translate",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Existing routers
app.include_router(voice.router, prefix="/ai/voice", tags=["Voice"])
app.include_router(legal.router, prefix="/ai/legal", tags=["Legal"])
app.include_router(schemes.router, prefix="/ai/schemes", tags=["Schemes"])
app.include_router(budget.router, prefix="/ai/budget", tags=["Budget"])
app.include_router(meetings.router, prefix="/ai/meetings", tags=["Meetings"])
app.include_router(integration.router, prefix="/ai/integration", tags=["Integration"])

# New routers
app.include_router(rag.router, prefix="/ai/rag", tags=["RAG Legal Chat"])
app.include_router(translate.router, prefix="/ai/translate", tags=["Translation"])
app.include_router(tts.router, prefix="/ai/tts", tags=["Text-to-Speech"])
app.include_router(forms.router, prefix="/ai/forms", tags=["Form Auto-Fill"])


@app.on_event("startup")
async def startup_event():
    """Seed legal knowledge base on first startup."""
    try:
        from rag.knowledge_base import seed_knowledge_base
        print("Seeding legal knowledge base...")
        seed_knowledge_base()
        print("Knowledge base ready.")
    except Exception as e:
        print(f"Warning: Knowledge base seeding failed: {e}")


@app.get("/ai/health")
async def health():
    return {"status": "ok", "service": "integatedgov-ai-service", "version": "2.0.0"}
