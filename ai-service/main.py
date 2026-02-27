from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import voice, legal, schemes, budget, meetings, integration

app = FastAPI(
    title="IntegratedGov AI Service",
    description="FastAPI microservice handling all AI/ML — Amazon Bedrock, Transcribe, Polly, Comprehend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice.router, prefix="/ai/voice", tags=["Voice"])
app.include_router(legal.router, prefix="/ai/legal", tags=["Legal"])
app.include_router(schemes.router, prefix="/ai/schemes", tags=["Schemes"])
app.include_router(budget.router, prefix="/ai/budget", tags=["Budget"])
app.include_router(meetings.router, prefix="/ai/meetings", tags=["Meetings"])
app.include_router(integration.router, prefix="/ai/integration", tags=["Integration"])


@app.get("/ai/health")
async def health():
    return {"status": "ok", "service": "integatedgov-ai-service"}
