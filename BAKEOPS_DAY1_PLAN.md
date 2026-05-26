# BakeOps Command Center — Day 1 Build Plan

## What We're Building

BakeOps Command Center is a **multi-agent AI system that acts as a real-time digital twin of a large-scale bakery**. Multiple specialized AI agents work together to monitor production, predict equipment failures, respond to supply chain disruptions, and reformulate recipes for clean-label compliance — all coordinated by an Orchestrator agent and visible in real time through a streaming dashboard.

The judge experience: a judge triggers a scenario (via NFC card or natural language input), the Orchestrator routes the problem to the right specialist agents, each agent's reasoning streams live to the dashboard in parallel, and within 60–90 seconds the system delivers a recommendation with cost impact and confidence score.

## Problem Statement

Food manufacturers lose 30–35% of total production capacity to unplanned equipment downtime, supply chain blind spots, and slow manual processes — costing a single mid-sized plant over $1M per year. BakeOps cuts unplanned downtime by 35–50%, reduces supply disruption response from 3 days to under 10 minutes, and compresses ingredient reformulation research from 3 months to 90 seconds.

## Tech Stack (Locked In — Do Not Change)

| Layer | Choice | Why |
|---|---|---|
| Backend language | Python 3.11+ | Best ecosystem for agent frameworks |
| Web framework | FastAPI | Native SSE support, async-first |
| Agent orchestration | LangGraph | Dominant 2026 multi-agent framework, deterministic control, built-in streaming |
| LLM SDK | Anthropic Python SDK | Direct Claude API access |
| Models | Claude Opus 4.7 (Orchestrator), Claude Sonnet 4.6 (Specialists) | Right tradeoff of reasoning vs speed/cost |
| Streaming protocol | Server-Sent Events (SSE) following AG-UI event format | Real-time agent reasoning to frontend |
| Frontend framework | React 18 + Vite | Fast dev, instant hot reload |
| Styling | Tailwind CSS | No design time waste |
| Frontend state | Zustand (lightweight) | Simpler than Redux for this scope |
| Package manager (Python) | uv or pip | Either works |
| Package manager (Node) | pnpm or npm | Either works |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  React Dashboard                         │
│  ┌──────────────┐  ┌──────────────────────────────┐    │
│  │ Factory Map  │  │   Agent Panels (Streaming)   │    │
│  │ (4 lines)    │  │   - Orchestrator             │    │
│  │              │  │   - Maintenance Prophet       │    │
│  │              │  │   - Supply Sentinel           │    │
│  │              │  │   - Recipe Chemist            │    │
│  └──────────────┘  └──────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Scenario Input (NFC trigger or text)             │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ SSE (AG-UI events)
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            LangGraph Orchestrator                 │  │
│  │  routes scenarios → specialist agents             │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Specialist Agent Nodes                  │  │
│  │  - maintenance_prophet (Day 1)                    │  │
│  │  - supply_sentinel (Day 2)                        │  │
│  │  - recipe_chemist (Day 2)                         │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Factory State (JSON file)               │  │
│  │  4 production lines, equipment, sensor data       │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
              Anthropic API (Claude)
```

## Project Structure

```
bakeops/
├── backend/
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── orchestrator.py
│   │   ├── maintenance_prophet.py
│   │   └── prompts.py
│   ├── data/
│   │   └── factory_state.json
│   ├── streaming/
│   │   ├── __init__.py
│   │   └── events.py        # AG-UI event types
│   ├── main.py              # FastAPI app
│   ├── graph.py             # LangGraph workflow
│   ├── config.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FactoryMap.tsx
│   │   │   ├── AgentPanel.tsx
│   │   │   ├── ScenarioInput.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── lib/
│   │   │   ├── sseClient.ts
│   │   │   └── events.ts
│   │   ├── store/
│   │   │   └── agentStore.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
└── README.md
```

## Day 1 Deliverables (End-of-Day Goals)

By end of Day 1, the following must work:

- [ ] `POST /api/trigger` accepts a scenario description and returns an SSE stream
- [ ] The Orchestrator agent decides Maintenance Prophet should handle the scenario
- [ ] Maintenance Prophet reasons about the equipment problem using Claude
- [ ] The reasoning streams token-by-token to the frontend via SSE
- [ ] The dashboard renders the agent panel with live streaming text
- [ ] At least one full scenario works end-to-end: trigger → orchestrator → specialist → final recommendation
- [ ] Code is clean enough to add Supply Sentinel + Recipe Chemist on Day 2 without rewriting

**What does NOT need to exist yet:**
- Beautiful UI (functional is enough)
- NFC trigger (Day 3)
- Multiple agents working in parallel (Day 2)
- Eval framework (Day 3)
- Multiple scenarios (Day 2 onward)

## Step-by-Step Build Plan

### Step 1: Initialize Project

Create the directory structure above. Initialize a git repo. Add `.gitignore` for Python and Node.

### Step 2: Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn anthropic langgraph python-dotenv sse-starlette
pip freeze > requirements.txt
```

Create `.env`:
```
ANTHROPIC_API_KEY=your_key_here
```

Create `backend/config.py` to load environment variables.

### Step 3: Define Factory State

Create `backend/data/factory_state.json` with realistic simulated data:

```json
{
  "facility": "FGF Bakery — North Toronto Plant",
  "lines": [
    {
      "id": "line_1",
      "product": "Naan",
      "status": "running",
      "throughput_per_hour": 4200,
      "target_per_hour": 4500,
      "equipment": [
        {"id": "oven_1a", "type": "tunnel_oven", "current_temp_c": 285, "target_temp_c": 290, "health_score": 0.78},
        {"id": "mixer_1a", "type": "dough_mixer", "vibration_level": "normal", "health_score": 0.92},
        {"id": "conveyor_1a", "type": "conveyor", "speed_mps": 0.42, "health_score": 0.88}
      ]
    },
    {
      "id": "line_2",
      "product": "Croissants",
      "status": "running",
      "throughput_per_hour": 1800,
      "target_per_hour": 2000,
      "equipment": [
        {"id": "oven_2a", "type": "convection_oven", "current_temp_c": 195, "target_temp_c": 200, "health_score": 0.95},
        {"id": "sheeter_2a", "type": "dough_sheeter", "health_score": 0.83}
      ]
    },
    {
      "id": "line_3",
      "product": "Muffins",
      "status": "running",
      "throughput_per_hour": 3000,
      "target_per_hour": 3200,
      "equipment": [
        {"id": "oven_3a", "type": "rack_oven", "current_temp_c": 175, "target_temp_c": 180, "health_score": 0.65, "anomaly": "heating_element_degradation_detected"},
        {"id": "depositor_3a", "type": "batter_depositor", "health_score": 0.90}
      ]
    },
    {
      "id": "line_4",
      "product": "Sourdough Loaves",
      "status": "running",
      "throughput_per_hour": 850,
      "target_per_hour": 900,
      "equipment": [
        {"id": "oven_4a", "type": "stone_deck_oven", "current_temp_c": 235, "target_temp_c": 240, "health_score": 0.88}
      ]
    }
  ],
  "production_cost_per_hour_usd": {
    "line_1": 1200,
    "line_2": 2100,
    "line_3": 950,
    "line_4": 1800
  }
}
```

### Step 4: AG-UI Event Types

Create `backend/streaming/events.py`. Define the event types the frontend will receive:

```python
# Event types to support:
# - "agent_started": when an agent begins working
# - "agent_thinking": each token of reasoning as it streams
# - "agent_tool_call": when an agent calls a tool
# - "agent_tool_result": when a tool returns
# - "agent_completed": when an agent finishes with its output
# - "orchestrator_routing": when the orchestrator decides which agents to call
# - "final_recommendation": the synthesized answer

# Each event is a JSON object with:
# {
#   "event_type": "agent_thinking",
#   "agent_id": "maintenance_prophet",
#   "timestamp": "2026-05-26T12:34:56Z",
#   "data": { ... type-specific payload ... }
# }
```

Implement helper functions to create and serialize these events as SSE messages.

### Step 5: Maintenance Prophet Agent

Create `backend/agents/maintenance_prophet.py`.

This agent should:
1. Receive a scenario and the current factory state
2. Use Claude Sonnet 4.6 with streaming enabled
3. Reason through the problem step-by-step (use a clear system prompt)
4. Emit `agent_thinking` events for each token
5. Identify the affected equipment, predict time to failure, estimate cost impact
6. Return a structured recommendation: `{"diagnosis": "...", "predicted_failure_window_hours": 14, "recommended_action": "...", "cost_of_action_usd": 4200, "cost_of_inaction_usd": 38000, "confidence": 0.87}`

The system prompt should establish the agent's persona as a senior bakery maintenance engineer with 20 years of experience and access to equipment health data.

### Step 6: Orchestrator Agent

Create `backend/agents/orchestrator.py`.

This agent should:
1. Receive the user's scenario
2. Use Claude Opus 4.7 with streaming
3. Decide which specialist agents are relevant (on Day 1, only Maintenance Prophet exists)
4. Emit an `orchestrator_routing` event explaining its decision
5. Invoke the chosen specialist(s)
6. After specialists finish, synthesize their outputs into a final recommendation
7. Emit `final_recommendation` event

Use LangGraph to define this as a state graph:
- Start node: orchestrator decides routing
- Conditional edge: routes to specialist nodes
- Specialist nodes execute and return state
- End node: orchestrator synthesizes final answer

### Step 7: FastAPI Endpoints

Create `backend/main.py` with:

- `GET /api/health` — health check
- `GET /api/factory_state` — returns the current factory state JSON
- `POST /api/trigger` — accepts `{"scenario": "..."}` and returns an SSE stream of agent events

Use `sse-starlette` for the SSE endpoint. Make sure CORS is configured to allow the frontend at localhost:5173.

### Step 8: Frontend Setup

```bash
cd ../
pnpm create vite frontend --template react-ts
cd frontend
pnpm install
pnpm add tailwindcss @tailwindcss/vite zustand
```

Configure Tailwind. Set up the basic dashboard layout: factory map on the left, agent panels on the right, scenario input at the bottom.

### Step 9: SSE Client and Event Handling

Create `frontend/src/lib/sseClient.ts`:
- Function `triggerScenario(scenarioText: string, onEvent: (event) => void)` that POSTs to `/api/trigger` and processes the SSE stream
- Parses each event and calls the callback

Create `frontend/src/store/agentStore.ts` using Zustand:
- State: `{ agents: { [agentId]: { status, thinking_text, output } }, finalRecommendation }`
- Actions: `appendThinking`, `setStatus`, `setOutput`, `setRecommendation`

### Step 10: Dashboard Components

Build minimal components:

**`Dashboard.tsx`** — main layout with factory map, agent panels grid, scenario input

**`AgentPanel.tsx`** — shows one agent's status (idle/active/done), streaming text, and final output. Style it like a card with a colored header per agent.

**`ScenarioInput.tsx`** — text input + "Trigger" button. Calls `triggerScenario` on submit. Hardcode 1 example scenario as a button for fast testing.

**`FactoryMap.tsx`** — simple grid showing 4 lines with their current status (just colored boxes with text for now, no fancy graphics).

### Step 11: First Scenario Test

The Day 1 demo scenario:

> "Line 3 oven temperature has dropped to 175°C — target is 180°C. Health score 0.65. Sensor reports heating element degradation."

Expected flow:
1. Scenario submitted
2. Orchestrator routes to Maintenance Prophet (only specialist available)
3. Maintenance Prophet reasons: identifies the affected oven, predicts failure window, calculates cost-of-action vs cost-of-inaction, recommends scheduling maintenance during the 2 AM window
4. Orchestrator synthesizes final recommendation
5. All reasoning visible streaming on screen

Run this scenario at least 10 times. Tune the prompts until the output is consistently good.

## Day 1 Success Criteria

Run through this checklist before calling Day 1 done:

- [ ] Backend starts cleanly with `uvicorn main:app --reload`
- [ ] Frontend starts cleanly with `pnpm dev`
- [ ] Health check responds at `GET /api/health`
- [ ] Triggering the test scenario produces visible streaming output on the dashboard
- [ ] The agent panel shows tokens appearing in real time (not just the final result)
- [ ] The final recommendation includes diagnosis, action, cost impact, and confidence
- [ ] Running the same scenario 5 times produces consistent (though not identical) results
- [ ] No errors in browser console or backend logs during a full run
- [ ] Code is committed to git

## What Day 2 Adds (Preview — Do Not Build Yet)

- Supply Sentinel agent (web search integration via MCP or Anthropic's web_search tool)
- Recipe Chemist agent (Claude vision + Open Food Facts API)
- Parallel agent execution (multiple specialists running simultaneously)
- A2A protocol simulation for agent-to-agent handoffs
- 2 more scenarios working end-to-end

## Important Constraints (Read Before Starting)

1. **Do not over-engineer.** This is a hackathon. A working ugly thing beats a beautiful broken thing.
2. **Hardcode where possible.** Configuration files, settings, prompts — keep them inline until they need to move.
3. **Skip authentication.** Local dev only.
4. **Keep state simple.** The `factory_state.json` file is read on every request. No database needed.
5. **Don't write tests yet.** Tests come Day 3 when the structure stabilizes.
6. **Don't optimize prompts perfectly today.** Get something working, iterate Day 2.
7. **Use environment variables for the API key only.** Everything else can be hardcoded constants.
8. **If something takes longer than 1 hour to debug, work around it.** This is critical — don't get stuck.

## Environment Setup Notes

- Anthropic API key needed (set in `backend/.env`)
- Python 3.11+ recommended (LangGraph needs modern Python)
- Node 20+ recommended
- Both servers run locally: backend on `:8000`, frontend on `:5173`
- CORS must allow `http://localhost:5173` on the backend

## Start Order

When ready to code, work in this exact sequence:

1. Create the project directory structure
2. Set up the backend virtual environment and install dependencies
3. Create `factory_state.json` with the data above
4. Build the Maintenance Prophet agent and test it standalone with a simple Python script
5. Build the Orchestrator and wire it to Maintenance Prophet via LangGraph
6. Add the FastAPI SSE endpoint
7. Verify the SSE stream works using `curl` or a browser
8. Set up the frontend with Vite + Tailwind
9. Build the SSE client
10. Build the minimal dashboard
11. Run the full end-to-end scenario
12. Iterate on the system prompts until output quality is consistent

Stop when the success criteria are met. Do not start Day 2 work today.
