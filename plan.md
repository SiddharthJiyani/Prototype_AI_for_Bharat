## Plan: IntegratedGov AI Prototype — Full Build

**TL;DR:** Build a monorepo prototype with three layers — a React 19 + Tailwind frontend (already scaffolded), an Express + Node.js backend (main API, auth, DynamoDB orchestration), and a FastAPI Python microservice (all AI/ML — Bedrock, Transcribe, Polly). Both NyayMitra and PanchayatGPT modules built in parallel, connected by a shared integration alert engine. Real AWS services throughout. Target: working end-to-end demo in 4–6 weeks.

---

### Monorepo Structure

```
Prototype_AI_for_Bharat/
├── client/          ← Vite + React 19 + Tailwind (existing scaffold)
├── server/          ← Express + Node.js (API, auth, DynamoDB, integration logic)
└── ai-service/      ← FastAPI + Python (Bedrock, Transcribe, Polly, Comprehend)
```

---

### Steps

**Phase 1 — Foundation & Tooling**

1. **Monorepo setup** — add `server/` and `ai-service/` directories alongside existing client. Add root `package.json` with `concurrently` scripts: `npm run dev` starts all three services.

2. **Client dependencies** — install `react-router-dom` (routing), `axios` (HTTP), `react-hot-toast` (notifications), `lucide-react` (icons) into package.json.

3. **Client config** — update vite.config.js with `@/` path alias and a proxy for `/api → localhost:5000` and `/ai → localhost:8000`. Update index.html title to "IntegratedGov AI". Extend tailwind.config.js with brand colors (saffron, deep green, Ashoka blue), Hindi-friendly font (`Noto Sans Devanagari`).

4. **Express scaffold** — create `server/` with `index.js`, `routes/`, `controllers/`, `middleware/`, `config/dynamodb.js`. Use `aws-sdk` v3 DynamoDB client with IAM credentials from `.env`. Install: `express`, `cors`, `dotenv`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `jsonwebtoken`, `bcryptjs`.

5. **FastAPI scaffold** — create `ai-service/main.py` with routers: `/voice`, `/legal`, `/schemes`, `/budget`, `/meetings`, `/integration`. Install: `fastapi`, `uvicorn`, `boto3`, `python-multipart`, `pydantic`. Configure AWS credentials via `.env`.

6. **DynamoDB tables** — provision 6 tables: `Users`, `Cases` (NyayMitra), `Grievances`, `Budget`, `Schemes` (static seed data), `IntegrationAlerts`. Each with `PK`/`SK` single-table design pattern.

---

**Phase 2 — Frontend Structure & Core Pages**

7. **Routing** — wire up `react-router-dom` in main.jsx. Routes: `/` (landing), `/nyaymitra/*`, `/panchayat/*`, `/admin`, with a `RoleGuard` wrapper (citizen vs sarpanch vs admin).

8. **Shared layout** — `client/src/components/layout/` — `Navbar` (module switcher + language toggle Hindi/English), `Sidebar`, `AlertBanner` (cross-module integration alerts), `BottomNav` (mobile).

9. **Landing page** — `client/src/pages/Landing.jsx` — hero section, two module cards (NyayMitra + PanchayatGPT), integration advantage section, "How it works" steps. Mobile-first.

10. **NyayMitra pages** — `client/src/pages/nyaymitra/`:
    - `Dashboard.jsx` — citizen home, quick-action buttons
    - `FileComplaint.jsx` — multi-step: voice input → AI processing → notice preview → confirm & file
    - `Cases.jsx` — case list with status badges
    - `CaseDetail.jsx` — timeline + document viewer

11. **PanchayatGPT pages** — `client/src/pages/panchayat/`:
    - `Dashboard.jsx` — Sarpanch home, village stats, pending alerts
    - `SchemeSearch.jsx` — voice query → matched scheme cards
    - `BudgetAllocation.jsx` — interactive allocation table + AI suggestions
    - `MeetingMinutes.jsx` — upload recording → auto-generated minutes
    - `Grievances.jsx` — Kanban board (open / in-progress / resolved)

12. **Admin dashboard** — `client/src/pages/Admin.jsx` — cross-module stats, integration alert feed, case volume charts (use `recharts`).

---

**Phase 3 — Voice & AI Integration**

13. **`VoiceRecorder` component** — `client/src/components/VoiceRecorder.jsx` — uses `MediaRecorder` API, captures audio blob, `POST /ai/voice/transcribe` with `multipart/form-data`, displays transcript in real-time. Shows Hindi/English toggle that passes `languageCode` param.

14. **FastAPI `/voice/transcribe`** — receives audio file, calls `Amazon Transcribe` (`start_transcription_job` or streaming), returns transcript + detected language. Falls back to detected language if toggle is "auto".

15. **FastAPI `/voice/synthesize`** — accepts text + language code, calls `Amazon Polly` (`synthesize_speech`), returns MP3 stream. Used for reading legal notices aloud.

16. **`AudioPlayer` component** — plays Polly-generated MP3 response inline in the notice preview screen.

17. **FastAPI `/legal/categorize`** — sends transcript to Amazon Bedrock (Claude model), returns complaint category (`MGNREGA Wage Dispute`, `Land Dispute`, etc.) + clarifying questions if ambiguous.

18. **FastAPI `/legal/generate-notice`** — sends categorized complaint data to Bedrock with a prompt template, returns a formatted Hindi/English legal notice citing the relevant law sections (Labour Act, MGNREGA Act, etc.).

19. **FastAPI `/legal/extract-entities`** — uses Bedrock or Amazon Comprehend to extract: amount owed, dates, parties, location from transcript.

20. **FastAPI `/schemes/search`** — accepts voice query transcript, uses Bedrock with a pre-loaded scheme catalog context (stored in S3 / in-memory for prototype) to return top-5 matched schemes with eligibility criteria and required documents.

21. **FastAPI `/budget/suggest`** — accepts village profile data (population, existing schemes, pending grievances) → Bedrock returns a suggested budget allocation breakdown.

22. **FastAPI `/meetings/generate-minutes`** — audio transcript → Bedrock generates formal Gram Sabha minutes in both Hindi and English, structured as: attendees, resolutions, action items, next meeting date.

---

**Phase 4 — Business Logic (Express)**

23. **Auth** — `POST /api/auth/login` — mock user lookup in DynamoDB `Users` table, return JWT. Three roles: `citizen`, `sarpanch`, `admin`. Seed 3 demo accounts.

24. **Cases CRUD** — `POST /api/cases` (file complaint → save to DynamoDB Cases table + trigger integration analysis), `GET /api/cases/:userId`, `PATCH /api/cases/:id/status`.

25. **Grievance CRUD** — `POST /api/grievances`, `GET /api/grievances/:panchayatId`, `PATCH /api/grievances/:id`.

26. **Budget CRUD** — `POST /api/budget`, `GET /api/budget/:panchayatId`.

27. **eCourts mock** — `POST /api/ecourts/file` — generates a fake case number (`LC/2026/XXXXX`), stores in DynamoDB, returns confirmation. No real eCourts API call.

28. **Schemes endpoint** — `GET /api/schemes?query=` — returns from DynamoDB `Schemes` table pre-seeded with ~20 real government schemes (PM-Kisan, Ayushman Bharat, MGNREGA, PMAY, etc.).

---

**Phase 5 — Integration Engine**

29. **Pattern detection** — `POST /api/integration/analyze` — Express route queries DynamoDB Cases table, counts complaint categories per panchayat in rolling 30-day window. If ≥5 MGNREGA cases from same panchayat → triggers alert.

30. **Alerts CRUD** — `POST /api/integration/alerts` (create), `GET /api/integration/alerts/:panchayatId` (fetch active). Alerts written to DynamoDB `IntegrationAlerts` table.

31. **FastAPI `/integration/detect-patterns`** — deeper AI analysis via Bedrock: given a cluster of cases, generates a natural-language insight ("5 MGNREGA wage complaints suggest payment release pending from BDO — recommend direct escalation").

32. **`AlertPanel` component** — polls `GET /api/integration/alerts` every 30s, renders sticky banner on PanchayatGPT dashboard with the Bedrock-generated insight and an action button ("Escalate to BDO").

33. **S3 integration** — Express `POST /api/cases/:id/document` — uploads generated legal notice PDF (or text) to S3, returns presigned URL for download.

---

**Phase 6 — Polish & PWA**

34. **Mobile responsive pass** — audit all pages for `sm:` / `md:` breakpoints. Ensure `VoiceRecorder` works on Android Chrome. Bottom navigation for mobile.

35. **Loading states & error handling** — skeleton loaders on all async fetches, toast notifications via `react-hot-toast`, error boundaries.

36. **PWA config** — add `vite-plugin-pwa` to vite.config.js, generate `manifest.json` with app name, icons, theme colors. Enable basic service worker for offline asset caching.

37. **Demo seed data** — Express startup script seeds DynamoDB with: 3 users, 8 pre-existing cases (including 5 MGNREGA to trigger the integration demo), 4 grievances, 20 schemes, 1 active alert. Makes the demo immediately compelling without manual input.

38. **Environment config** — `.env.example` files for both `server/` and `ai-service/` documenting required AWS keys, region, table names, Bedrock model IDs.

---

### Verification

- **Voice flow**: Open app as Ramesh → click "File Complaint" → record "MGNREGA wages not received for 2 months" in Hindi → verify Transcribe returns Hindi text → Bedrock categorizes as MGNREGA dispute → see generated legal notice → Polly reads it aloud → confirm filing → get case number.
- **Integration demo**: Log in as Sarpanch Sunita → check PanchayatGPT dashboard → see "5 MGNREGA cases detected" alert with Bedrock-generated recommendation.
- **Scheme search**: PanchayatGPT → speak "small farmers water irrigation scheme" → verify top matches returned from Bedrock with eligibility criteria.
- **Budget**: Input village population + category → verify AI-suggested allocation table.
- **Run locally**: `npm run dev` from root starts all 3 services (Vite :5173, Express :5000, FastAPI :8000).

---

**Decisions**
- Express handles main API + DynamoDB (JS-native with AWS SDK v3); FastAPI handles all AI/ML to keep Python's boto3 + async streaming natural
- Real AWS services (Bedrock, Transcribe, Polly, DynamoDB) — no mocking
- DynamoDB over SQL for production-architecture alignment
- Both modules built in parallel — shared components (VoiceRecorder, AlertPanel) benefit both
- eCourts/MGNREGA integrations are mocked endpoints (per prototype scope in req.md)