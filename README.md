<div align="center">

```
██████╗  █████╗ ██╗  ██╗███████╗ ██████╗ ██████╗ ███████╗
██╔══██╗██╔══██╗██║ ██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
██████╔╝███████║█████╔╝ █████╗  ██║   ██║██████╔╝███████╗
██╔══██╗██╔══██║██╔═██╗ ██╔══╝  ██║   ██║██╔═══╝ ╚════██║
██████╔╝██║  ██║██║  ██╗███████╗╚██████╔╝██║     ███████║
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚══════╝
```

**Real-Time Multi-Agent AI Command Center for Industrial Bakeries**

*Built on [FGF Brands](https://fgfbrands.com) · North York, Toronto*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Claude](https://img.shields.io/badge/Claude-Opus%204.7%20%2B%20Sonnet%204.6-D97706?style=flat-square)](https://anthropic.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![SSE](https://img.shields.io/badge/Streaming-SSE%20%2F%20AG--UI-10B981?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

</div>

---

## What Is BakeOps?

BakeOps is an **agentic AI operations platform** that acts as the digital brain of a large-scale bakery. It continuously monitors four production lines, ingests live equipment telemetry, and dispatches specialist AI agents the moment something goes wrong — before a human even notices.

Think of it as having three world-class consultants (a maintenance engineer, a supply chain analyst, and a food scientist) on-call 24/7, able to diagnose any crisis, quantify the financial risk, and deliver an actionable recommendation in under 30 seconds.

<div align="center">

```
┌─────────────────────────────────────────────────────────────┐
│                   INCOMING SCENARIO / NFC TAG               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │  ORCHESTRATOR   │  Claude Opus 4.7
                  │  (Routes & syn- │  — reads factory state
                  │   thesizes)     │  — chooses specialists
                  └────────┬────────┘  — writes exec summary
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │  MAINTENANCE │ │    SUPPLY    │ │    RECIPE    │
  │   PROPHET    │ │   SENTINEL   │ │   CHEMIST    │
  │              │ │              │ │              │
  │ Predictive   │ │ Supply chain │ │ Clean-label  │
  │ maintenance  │ │ disruptions  │ │ reformulat-  │
  │ & equipment  │ │ & emergency  │ │ ion & CFIA   │
  │ health       │ │ procurement  │ │ compliance   │
  └──────────────┘ └──────────────┘ └──────────────┘
  Claude Sonnet 4.6  Claude Sonnet 4.6  Claude Sonnet 4.6
          │                │                │
          └────────────────┴────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  FINAL RECOMMENDATION  │
              │  + Impact Vault Card   │
              │  + Telegram Alert      │
              │  + Chat Follow-up      │
              └────────────────────────┘
```

</div>

---

## ✨ Features

### 🤖 Multi-Agent Intelligence
- **Orchestrator** (Claude Opus 4.7) — reads the factory state, routes the scenario to the right specialists, then synthesizes a C-suite executive summary
- **Maintenance Prophet** — diagnoses equipment failures, predicts failure windows to the hour, calculates cost of action vs. unplanned downtime ($45K/hr on a naan line)
- **Supply Sentinel** — assesses ingredient shortages, identifies alternative suppliers across North America, models inventory exposure in days and dollars
- **Recipe Chemist** — reformulates recipes for clean-label compliance, cross-references Open Food Facts and a proprietary substitution database, calculates cost deltas

### ⚡ Real-Time Streaming
- All agent reasoning streams token-by-token via **Server-Sent Events (SSE)** — watch the AI think in real time
- AG-UI event format: `agent_started → agent_thinking → agent_completed → final_recommendation`
- Parallel agent execution with a shared queue — multiple specialists run simultaneously

### 💰 Impact Vault
- Every recommendation includes a dramatized **savings card** with a slot-machine count-up animation
- Rotating conic-gradient border (CSS `@property`), stacked risk bar visualization, per-character blur-in reveal
- Session-cumulative savings tracker in the top bar — never resets across runs

### 📱 NFC Trigger System
- Tap an NFC tag in the factory → POST `/api/nfc/{scenario_id}` → incident banner slides in, agents fire automatically
- Four pre-mapped scenarios: Tunnel Oven Anomaly, Yeast Supplier Crisis, Costco Clean Label, Stonefire Recall Risk
- **Telegram alert** fires to your operations channel the moment analysis completes

### 📷 Live Label Scanning
- Point your webcam at any product label → Recipe Chemist analyzes ingredients in real time
- Reads barcodes via Open Food Facts API, cross-references FGF's clean-label alternatives database
- Identifies regulated additives (calcium propionate, mono/diglycerides) and proposes swaps

### 🎙️ Voice Input
- Web Speech API integration — speak your scenario, stop, run
- Interim transcript renders as ghost text while you speak

### 💬 Context-Aware Chat
- After any analysis, the command bar flips to **chat mode**
- Follow-up questions are answered with full awareness of the prior scenario, specialist outputs, and factory state

### 📊 Live Factory Dashboard
- Real-time throughput sparklines for all 4 production lines
- OEE, waste %, energy consumption, and total output metrics with history
- Equipment health scores, temperature readings, anomaly detection, alert bands
- News ticker with live ingredient commodity prices

---

## 🏭 The Factory

BakeOps models **FGF Brands North York** — Canada's largest artisan bakery, producing for Costco, Walmart, Loblaw, and Whole Foods. Four production lines run in parallel:

| Line | Product | Target (units/hr) |
|------|---------|-------------------|
| Line 01 | ACE Bakery Sourdough | 4,200 |
| Line 02 | Village Hearth White Bread | 1,800 |
| Line 03 | Stonefire Naan | 3,000 |
| Line 04 | Fancy Pants Brownie Bites | 850 |

---

## 🎬 Demo Scenarios

Load any of the four built-in scenarios from the **Preset** dropdown in the command bar:

| ID | Scenario | Agent(s) | Savings Shown |
|----|----------|----------|---------------|
| **SCN-1** | Tunnel oven thermal drift on Line 03 — 6 hrs to Costco delivery | Maintenance Prophet | $45K–$270K |
| **SCN-2** | Lallemand yeast: 35% allocation cut, 4 days inventory remaining | Supply Sentinel | $120K–$600K |
| **SCN-3** | Costco clean-label compliance — remove calcium propionate by Q3 | Recipe Chemist | Revenue at risk |
| **SCN-4** | Stonefire naan mold reports — 142 complaints, recall imminent | Multi-agent | $185K–$2.1M |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Models** | Claude Opus 4.7 (Orchestrator) · Claude Sonnet 4.6 (Specialists) |
| **Backend** | Python 3.12 · FastAPI · Uvicorn · asyncio |
| **Streaming** | Server-Sent Events · AG-UI event protocol |
| **AI SDK** | Anthropic Python SDK (streaming) |
| **External APIs** | Open Food Facts · Telegram Bot API |
| **Frontend** | React 18 · TypeScript · Vite 6 |
| **State** | Zustand |
| **Styling** | Tailwind CSS v4 · CSS custom properties |
| **Fonts** | Inter Tight · Fraunces · IBM Plex Mono |
| **Animations** | CSS `@keyframes` · `@property` (conic-gradient) · rAF count-up |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)
- *(Optional)* Telegram Bot token for alerts

### 1. Clone

```bash
git clone https://github.com/Tarunk1109/BakeOps.git
cd BakeOps
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env            # then open .env and fill in your key
```

Your `.env` should look like:

```env
ANTHROPIC_API_KEY=sk-ant-...

# Optional — leave blank to skip Telegram alerts
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

```bash
# Start the API server
uvicorn main:app --reload --port 8000
```

Backend is live at **http://localhost:8000**

### 3. Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Dashboard is live at **http://localhost:5173**

---

## 📁 Project Structure

```
BakeOps/
├── backend/
│   ├── agents/
│   │   ├── orchestrator.py          # Master router + synthesizer
│   │   ├── maintenance_prophet.py   # Equipment & predictive maintenance
│   │   ├── supply_sentinel.py       # Supply chain & procurement
│   │   ├── recipe_chemist.py        # Clean-label reformulation + vision
│   │   └── prompts.py               # System prompts for all agents
│   ├── services/
│   │   └── telegram.py              # Telegram alert delivery
│   ├── streaming/
│   │   └── events.py                # SSE event helpers (AG-UI format)
│   ├── data/
│   │   ├── factory_state.json       # Live factory state (telemetry seed)
│   │   └── clean_label_alternatives.json
│   ├── config.py                    # Model IDs, env vars
│   ├── main.py                      # FastAPI app + all endpoints
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.tsx         # Root layout
    │   │   ├── TopStrip.tsx          # Header — brand, savings badge, clock
    │   │   ├── MetricsBar.tsx        # OEE, waste, energy sparklines
    │   │   ├── HeroStatus.tsx        # Factory health at a glance
    │   │   ├── ProductionLineCard.tsx # Per-line throughput + health
    │   │   ├── ActiveStream.tsx       # Live agent stream + final card
    │   │   ├── SavingsCard.tsx        # Impact Vault with count-up animation
    │   │   ├── CommandBar.tsx         # Scenario input + voice + presets
    │   │   ├── AgentRoster.tsx        # Specialist agent status panel
    │   │   ├── StaffRail.tsx          # Agent avatar rail
    │   │   ├── IncidentBanner.tsx     # NFC incident slide-in banner
    │   │   ├── SpeedComparison.tsx    # AI vs human response time
    │   │   ├── NewsTicker.tsx         # Commodity price ticker
    │   │   ├── OnboardingOverlay.tsx  # First-run walkthrough
    │   │   ├── WebcamScanner.tsx      # Live label scan
    │   │   └── ErrorBoundary.tsx
    │   ├── store/
    │   │   └── agentStore.ts          # Zustand global store
    │   ├── lib/
    │   │   ├── sseClient.ts           # SSE connection + event dispatch
    │   │   └── events.ts              # Event type definitions
    │   └── index.css                  # Design tokens + all animations
    └── tailwind.config.js
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Dashboard HTML (production build) |
| `POST` | `/api/scenario` | Run a text scenario through all agents |
| `POST` | `/api/scenario-with-image` | Scenario + image (label scan) |
| `POST` | `/api/nfc/{scenario_id}` | Trigger a pre-mapped NFC scenario |
| `POST` | `/api/scan-label` | Run Recipe Chemist on a base64 image |
| `POST` | `/api/chat` | Chat follow-up with full recommendation context |
| `GET` | `/api/telemetry` | SSE stream of live factory metrics |
| `GET` | `/health` | Health check |

All streaming endpoints return `text/event-stream` with newline-delimited `data: {...}` JSON.

### Event Types

```
agent_started          → agent is initializing
agent_thinking         → streaming token from the model
agent_tool_call        → agent invoked an external tool
agent_tool_result      → tool returned data
orchestrator_routing   → orchestrator chose specialists
agent_completed        → specialist finished, structured output attached
final_recommendation   → executive summary + all specialist outputs
alert_sent             → Telegram delivery confirmed
stream_done            → stream closed
```

---

## 🎨 Design System

BakeOps uses an **Industrial Editorial** design language — the warmth of a bakery, the precision of a factory floor, the authority of financial data.

- **Typography**: Fraunces (display/numbers) · Inter Tight (body) · IBM Plex Mono (labels/data)
- **Palette**: Warm canvas (`#FAFAF7`) · Amber accent (`#B45309`) · Ink primary (`#0E0E10`)
- **Dark panels**: Near-black (`#0E0E10`) with translucent agent color overlays
- **Animations**: All via CSS `@keyframes` — no heavy animation libraries
  - `vault-spin` — CSS `@property` conic-gradient rotation on the savings card
  - `digit-land` — per-character blur-in reveal after count-up
  - `bar-grow-left/right` — stacked risk bar fill
  - `live-pulse` — heartbeat dots on all live indicators

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ and too much coffee — because every great bakery deserves a great command center.

*BakeOps · FGF Brands Digital Twin · Toronto, ON*

</div>
