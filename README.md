# Prototype AI for Bharat

## Startup Guide (3 Services)

### Prerequisites
- Node.js 18+
- Python 3.10+

### 1) Install dependencies
From project root:

```bash
npm install
npm run install:all
```

Install AI service Python packages:

```bash
cd ai-service
pip install -r requirements.txt
```

### 2) Start all three services
From project root (single command):

```bash
npm run dev
```

This starts:
- Client (Vite): `http://localhost:5173`
- Node server: `http://localhost:5000`
- AI service (FastAPI): `http://localhost:8000`

### Optional: Start each service separately
```bash
npm run dev:client
npm run dev:server
npm run dev:ai
```
