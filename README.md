# BakeOps Command Center

Multi-agent AI system acting as a real-time digital twin of a large-scale bakery.

## Quick Start

### 1. Add your Anthropic API key

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > backend/.env
```

### 2. Start the backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

Backend runs on http://localhost:8000

### 3. Start the frontend

```bash
cd frontend
npm run dev
```

Dashboard runs on http://localhost:5173

## Demo Scenario

Click **"⚡ Demo: Line 3 Oven Degradation"** to trigger the Day 1 scenario:

> Line 3 oven temperature dropped to 175°C (target 180°C), health score 0.65, heating element degradation detected.

Expected flow: Orchestrator → Maintenance Prophet → Final Recommendation with cost impact.

## Architecture

- **Backend**: FastAPI + LangGraph + Anthropic SDK (Python)
- **Frontend**: React 18 + Vite + Tailwind CSS + Zustand
- **Streaming**: Server-Sent Events (SSE) with AG-UI event format
- **Models**: Claude Opus 4.7 (Orchestrator) + Claude Sonnet 4.6 (Specialists)
