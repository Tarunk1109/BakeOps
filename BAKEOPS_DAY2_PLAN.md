# BakeOps Command Center — Day 2 Build Plan

## Status After Day 1

Working: Backend orchestrator + Maintenance Prophet agent, SSE streaming, basic dashboard.

Not working: The UI looks like a chatbot. The system feels reactive instead of alive. This is the #1 problem to fix today. We are competing against teams whose work will look like throwaway demos — ours needs to look like a shipping product.

## Day 2 Goals (In Priority Order)

1. **Full UI rebuild** — commit to the "Industrial Editorial" design system below. This is non-negotiable.
2. **Supply Sentinel agent** — second specialist, uses live web search.
3. **Recipe Chemist agent** — third specialist, uses Claude vision + Open Food Facts.
4. **Parallel agent execution** — when a scenario triggers multiple specialists, they run simultaneously.
5. **Live factory telemetry** — the dashboard always shows something happening, even when no scenario is running.

## The Aesthetic Direction: "Industrial Editorial"

Commit to this aesthetic fully. Do not deviate.

**The vision:** SpaceX mission control meets Linear meets Bloomberg Terminal. Dark theme. High information density done with elegance. The user feels like they're operating a real factory, not chatting with an AI.

**What this is NOT:**
- Not chatbot UI (no big message bubbles, no centered conversation)
- Not pastel marketing aesthetics (no purple gradients, no soft shadows)
- Not generic dashboard (no Inter font, no shadcn defaults left untouched)
- Not playful (no rounded corners everywhere, no emoji-heavy)

**What this IS:**
- Dense, technical, alive with real-time data
- Confident use of negative space combined with information density
- A signature warm amber accent that subtly nods to bakery without being literal
- Type as a primary design element (refined serif headlines, monospace for data)
- Status as a primary visual element (everything has a state indicator)

## The Design System (Use These Exact Values)

### Color Palette

Define these in `tailwind.config.js` and as CSS variables:

```css
:root {
  /* Surfaces */
  --bg-base: #0A0A0B;          /* Near-black, slightly warm */
  --bg-surface: #131316;       /* Cards */
  --bg-elevated: #1C1C20;      /* Hover, modals */
  --bg-overlay: #08080A;       /* Modal backdrops */

  /* Borders */
  --border-subtle: #1F1F23;
  --border-default: #2A2A30;
  --border-strong: #3D3D45;

  /* Text */
  --text-primary: #FAFAFA;
  --text-secondary: #A1A1AA;
  --text-tertiary: #71717A;
  --text-muted: #52525B;

  /* Brand accent (signature warm amber — used sparingly) */
  --accent: #F59E0B;
  --accent-muted: #D97706;
  --accent-dim: #78350F;
  --accent-glow: rgba(245, 158, 11, 0.15);

  /* Status semantics */
  --status-running: #10B981;
  --status-warning: #F59E0B;
  --status-danger: #EF4444;
  --status-info: #3B82F6;
  --status-idle: #52525B;

  /* Agent identity colors (each agent has its own) */
  --agent-orchestrator: #FAFAFA;       /* white-ish, the boss */
  --agent-maintenance: #F59E0B;         /* amber, alert/warning energy */
  --agent-supply: #3B82F6;              /* blue, navigational */
  --agent-recipe: #A78BFA;              /* refined violet, chemistry */
}
```

### Typography

Load these from Google Fonts or self-host. **Do not use Inter, Roboto, Arial, or system fonts.**

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

Type roles:
- **`font-display`** (Fraunces, serif) — used for the main brand mark, the system name, hero metrics. Sparingly. This is the "personality" font.
- **`font-sans`** (Geist) — body text, labels, descriptions. Default font.
- **`font-mono`** (Geist Mono) — all numerical data, IDs, timestamps, sensor readings, code. Tabular figures.

Type scale:
- Brand mark: 22px Fraunces 500 + 11px Geist Mono uppercase tracking-widest for subtitle
- Section headers: 11px Geist Mono uppercase tracking-[0.18em] semibold — color text-tertiary
- Card titles: 14px Geist 500
- Body: 13px Geist 400
- Data values: 16px or 20px Geist Mono with tabular-nums
- Hero metrics: 36-48px Fraunces 400 with tight tracking
- Micro text: 10-11px Geist Mono uppercase tracking-wider

### Spacing & Density

- Tighter than typical AI dashboards. This is intentional.
- Cards use `p-4` or `p-5`, not `p-8`
- Gaps between sections: `gap-3` to `gap-4` typically, not `gap-8`
- Inside dense data zones: `gap-1.5` is normal
- The interface should feel "packed but breathable" like Linear or Bloomberg

### Borders & Surfaces

- Cards do NOT use heavy shadows. Use 1px borders in `border-default` instead.
- Subtle inset glow on active/hovered items (1px inner border in agent's identity color)
- No drop shadows except on modals
- No gradients on cards. Gradients are for accent moments only (badges, status indicators)
- Border radius: `rounded-md` (6px) is the default. `rounded-sm` (2px) for tight elements. Never `rounded-3xl` or fully rounded except for status dots.

### Iconography

- Use `lucide-react` exclusively. Stroke width 1.5 (override the default 2).
- Icons should be 14-16px next to text, 20-24px standalone
- Always paired with text labels in headers (do not rely on icons alone)

### Motion

Install `motion` (formerly Framer Motion):
```bash
pnpm add motion
```

Use motion sparingly and intentionally:
- **Status dot pulse**: continuous subtle pulse on "live" indicators (CSS animation, no JS)
- **Number counters**: when a metric changes, animate the digit roll
- **Agent panel activation**: when an agent goes from idle to active, a smooth fade + slight slide-up (200ms, ease-out)
- **Token streaming**: text appears with a blinking caret at the end (CSS)
- **Page load**: nothing fancy. Cards fade in with 50-100ms stagger.

What NOT to do:
- No bouncy spring animations
- No "wow" entrances
- No floating particles or background animations
- Motion should feel earned, not performative

## The New Layout

Replace the current Day 1 layout entirely with this:

```
┌─────────────────────────────────────────────────────────────────────┐
│ TOP STRIP (h-12, border-b)                                           │
│ [BAKEOPS logo] [Plant: North Toronto] [Status: NOMINAL] [Time: ...] │
└─────────────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────┬──────────────────────┐
│          │                                   │                      │
│ AGENT    │   FACTORY FLOOR                   │   ACTIVE STREAM     │
│ ROSTER   │   (4 production lines as cards)   │   (agent reasoning) │
│          │                                   │                      │
│ • Orches │   ┌──────────┐  ┌──────────┐    │   [Orchestrator]    │
│ • Maint  │   │ LINE-01  │  │ LINE-02  │    │   Analyzing scen... │
│ • Supply │   │  Naan    │  │ Croiss.. │    │                      │
│ • Recipe │   │ 4200/hr  │  │ 1800/hr  │    │   [Maintenance]     │
│          │   │ • RUNNING│  │ • RUNNING│    │   Inspecting Line-3 │
│          │   └──────────┘  └──────────┘    │   Oven temp drift.. │
│          │                                   │                      │
│          │   ┌──────────┐  ┌──────────┐    │   ──────────────    │
│          │   │ LINE-03 ⚠│  │ LINE-04  │    │                      │
│          │   │ Muffins  │  │ Sourd... │    │   Recommendation:    │
│          │   │ 3000/hr  │  │ 850/hr   │    │   Schedule oven      │
│          │   │ • ALERT  │  │ • RUNNING│    │   maintenance at 2AM │
│          │   └──────────┘  └──────────┘    │   Cost: $4,200       │
│          │                                   │   Avoided: $38,000   │
│          │   ─── METRICS ───                 │   Confidence: 87%    │
│          │   [Sparklines for OEE, waste,     │                      │
│          │    energy, output]                │                      │
│          │                                   │                      │
└──────────┴───────────────────────────────────┴──────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ COMMAND BAR (h-14, border-t)                                         │
│ > Trigger scenario or ask a question...           [Submit] [SCN-1]  │
└─────────────────────────────────────────────────────────────────────┘
```

Grid: `grid-cols-[240px_1fr_400px]` on desktop. Mobile is not a concern for this demo.

### Component Specifications

**TopStrip:**
- Height: 48px (`h-12`), border-b in `border-default`
- Left: Brand mark — "BAKEOPS" in Fraunces 500 + smaller "/ COMMAND CENTER" in Geist Mono uppercase tracking-widest
- Center: Plant identifier as muted text — "PLANT · NORTH TORONTO · LINE 01-04"
- Right: Live system status with green pulse dot, then live clock (Geist Mono, updates every second)
- Background: `bg-base` (slightly different from surface, creating a subtle separation)

**AgentRoster (left sidebar):**
- Each agent is a card with:
  - Top: 8px colored bar in the agent's identity color
  - Agent name in Geist 500
  - Status pill: IDLE / ACTIVE / THINKING / DONE (Geist Mono uppercase 10px)
  - Tiny role description in text-tertiary
  - Sparkline of recent activity
- When active: subtle glow in the agent's color, status pill animates
- When idle: text-muted, no glow

**ProductionLineCard:**
- Each card shows: Line ID (mono, large), product name (Fraunces), live throughput as big mono number, target as text-tertiary smaller, status dot with pulse
- When alert: subtle red border accent, alert icon
- Hover: shows expanded equipment list (oven, mixer, etc.) with health scores as horizontal bars
- Use real metrics from `factory_state.json`

**MetricsBar (below production lines):**
- Four sparklines side by side: OEE %, Waste %, Energy kWh, Total Output/hr
- Each has: label (mono uppercase 10px), current value (Fraunces large), sparkline (last 30 ticks), delta vs target (color-coded green/red)
- These should tick/update every 2-3 seconds with simulated movement (just for "alive" feel)

**ActiveStream (right panel):**
- Header: "ACTIVE STREAM" mono uppercase, current scenario name if any
- Each agent's contribution shown as a "speech turn" — but NOT a chat bubble. Instead:
  - Colored vertical bar on the left in agent's color (3px wide)
  - Agent name in mono uppercase 10px
  - Timestamp in mono 10px text-tertiary
  - Streaming reasoning text in Geist 13px
  - When agent completes, a small "→" with a one-line summary
- Final recommendation appears at the bottom as a card with stronger styling

**CommandBar:**
- Looks like a terminal command line
- `>` prompt in accent color (Geist Mono)
- Input field with no border, just inherits bg-base
- On the right: dropdown of preset scenarios labeled "SCN-1", "SCN-2", "SCN-3" with mono font
- Submit triggers the scenario; preset buttons fill the input then trigger
- Subtle focus state: thin amber underline

### Background Detail

The base background should not be flat black. Add an extremely subtle radial gradient or noise texture:

```css
body {
  background:
    radial-gradient(ellipse at top, rgba(245, 158, 11, 0.03) 0%, transparent 50%),
    var(--bg-base);
}
```

This creates a very faint warm glow at the top of the screen that makes the interface feel atmospheric rather than dead.

## The Two New Agents

### Supply Sentinel

**Role:** Monitor live web sources for supply chain disruptions affecting bakery ingredients (wheat, flour, eggs, dairy, palm oil, packaging). When a disruption is detected, identify affected products, find alternative suppliers, draft procurement emails.

**Tools available:**
- `web_search` — Anthropic's web search tool, built into the SDK
- `factory_inventory` — reads from `factory_state.json` to find which ingredients are at risk

**Identity color:** Blue (#3B82F6)

**System prompt persona:** Senior supply chain analyst with 15 years of experience in food manufacturing. Calm, precise, action-oriented. Always quantifies risk in days-of-inventory and dollar impact.

**Expected output structure:**
```json
{
  "disruption_summary": "Major wheat producer halted operations due to facility fire",
  "affected_ingredients": ["wheat_flour_grade_a"],
  "affected_products": ["naan", "sourdough", "croissants"],
  "current_inventory_days": 4,
  "alternative_suppliers": [
    {"name": "...", "lead_time_days": 5, "cost_premium_pct": 8}
  ],
  "recommended_action": "Initiate emergency PO with backup supplier within 24 hours",
  "estimated_cost_impact_usd": 12500,
  "estimated_cost_of_inaction_usd": 78000,
  "confidence": 0.91
}
```

### Recipe Chemist

**Role:** Take any product (ingredient list pasted, photo of label uploaded, or barcode/product name), identify all synthetic/artificial ingredients, propose clean-label natural replacements with cost and functional impact estimates.

**Tools available:**
- Claude vision (built into the model, no separate tool) — for reading product labels from images
- `open_food_facts_lookup(barcode_or_name)` — queries the Open Food Facts API at https://world.openfoodfacts.org/api/v2/product/{barcode}.json — no auth needed
- A static knowledge base (hardcoded JSON in `backend/data/clean_label_alternatives.json`) mapping common synthetic ingredients to their natural replacements

**Identity color:** Refined violet (#A78BFA)

**System prompt persona:** Senior food scientist specializing in clean-label reformulation. Encyclopedic knowledge of natural alternatives. Always considers shelf life, texture, and cost when proposing substitutes.

**Expected output structure:**
```json
{
  "original_product": "Competitor Croissant",
  "synthetic_ingredients_found": [
    {"name": "calcium propionate", "function": "mold inhibitor", "concern": "synthetic preservative"},
    {"name": "mono- and diglycerides", "function": "emulsifier", "concern": "highly processed"}
  ],
  "clean_label_reformulation": [
    {"replaces": "calcium propionate", "with": "fermented wheat flour", "rationale": "Natural mold inhibition through organic acids", "cost_delta_pct": "+3.2%"},
    {"replaces": "mono- and diglycerides", "with": "sunflower lecithin", "rationale": "Natural emulsifier with comparable function", "cost_delta_pct": "+1.8%"}
  ],
  "total_cost_delta_pct": 5.0,
  "predicted_shelf_life_days": 19,
  "regulatory_status": "passes CFIA clean label standards",
  "confidence": 0.85
}
```

Create `backend/data/clean_label_alternatives.json` with at least 15 common synthetic-to-natural substitution pairs to seed the agent's knowledge.

## Parallel Agent Execution

Update the Orchestrator to support multi-agent dispatch. When a scenario could benefit from multiple agents, the Orchestrator should:

1. Emit an `orchestrator_routing` event listing all chosen agents
2. Invoke them in parallel using `asyncio.gather()`
3. Stream their reasoning concurrently (the frontend will already handle this because each agent emits independently)
4. After all complete, synthesize a final cross-agent recommendation

In LangGraph, this means defining a parallel branch pattern. Use a router node that returns a list of next nodes, and the graph executes them concurrently.

## Day 2 Step-by-Step Plan

### Phase 1: UI Foundation (3-4 hours, do this FIRST)

1. Add fonts to `index.html` (Fraunces, Geist, Geist Mono)
2. Update `tailwind.config.js` with the color palette and font families
3. Add global CSS for the body background gradient and base styles
4. Install `motion` (Framer Motion successor) and `lucide-react` if not already
5. Rebuild the layout shell: TopStrip, AgentRoster sidebar, main content grid, CommandBar
6. Build the ProductionLineCard component with the spec above
7. Build the AgentRoster items
8. Build the MetricsBar with sparklines (use Recharts: `pnpm add recharts`)
9. Build the ActiveStream component
10. Connect the existing SSE stream to the new ActiveStream

**Checkpoint:** The dashboard should look completely different. Show only Maintenance Prophet still — but in the new UI. It should look like a real product. Take a screenshot. If it still looks like a hackathon project, redo it before moving on.

### Phase 2: Live Telemetry (1 hour)

Make the dashboard feel alive even when nothing is happening:

11. Add a `/api/telemetry` SSE endpoint that emits simulated metric updates every 2 seconds (throughput jitter ±5%, sensor noise on temperatures, etc.)
12. Frontend subscribes on mount, updates production line cards and sparklines smoothly
13. Add the live clock to TopStrip
14. Add the pulse animation to status dots

**Checkpoint:** Open the dashboard with no scenario running. Numbers should subtly tick. Status dots pulse. It should look like the factory is operating.

### Phase 3: Supply Sentinel (2 hours)

15. Create `backend/agents/supply_sentinel.py`
16. Implement the web search tool integration (Anthropic's built-in web search)
17. Define the system prompt with the persona above
18. Define the structured output schema
19. Add Supply Sentinel as a node in the LangGraph workflow
20. Update Orchestrator to route supply-related scenarios to it
21. Test with scenario: "Major wheat shortage detected in Western Canada"

### Phase 4: Recipe Chemist (2 hours)

22. Create `backend/agents/recipe_chemist.py`
23. Create `backend/data/clean_label_alternatives.json` with substitution knowledge
24. Implement the Open Food Facts lookup function as a tool
25. Add a file upload endpoint `POST /api/upload_label` that accepts an image and passes it to the agent
26. Add Recipe Chemist as a node in the LangGraph workflow
27. Update Orchestrator to route reformulation scenarios to it
28. Add a file upload UI to the CommandBar (small upload button)
29. Test with scenario: paste a real ingredient list from any food package

### Phase 5: Parallel Execution (1 hour)

30. Update Orchestrator to identify when multiple agents should run
31. Implement parallel dispatch in LangGraph using a fan-out pattern
32. Verify the frontend shows multiple agents thinking simultaneously without breaking
33. Test with scenario: "Wheat shortage detected — also assess impact on current production schedule and propose reformulation alternatives"

## Day 2 Success Criteria

Before calling Day 2 done:

- [ ] The UI no longer looks like a chatbot — it looks like a mission control product
- [ ] All three agents (Maintenance Prophet, Supply Sentinel, Recipe Chemist) work independently
- [ ] At least one scenario triggers multiple agents in parallel and they all stream visibly
- [ ] The dashboard ticks live telemetry even when idle (numbers, status, time)
- [ ] Recipe Chemist accepts an image upload and reformulates from a real label
- [ ] Supply Sentinel does a real web search and returns relevant results
- [ ] Three demo scenarios are reproducible and produce consistently good output:
  - SCN-1: "Line 3 oven temperature dropped to 175°C, health degraded" (Maintenance Prophet)
  - SCN-2: "Wheat supplier facility fire in Saskatchewan reported" (Supply Sentinel)
  - SCN-3: Upload croissant ingredient label → reformulate (Recipe Chemist)
- [ ] No console errors, no broken layouts at common screen sizes
- [ ] Code is committed to git

## Important Reminders

1. **Build the UI first.** If the UI doesn't get fixed today, the rest doesn't matter. Demo judges decide in 5 seconds whether your project looks credible.
2. **Resist the urge to add features.** Three agents working with a beautiful UI beats five agents in an ugly UI.
3. **Test each scenario at least 5 times.** Flaky agents lose demos.
4. **Commit often.** End of Phase 1, end of Phase 2, etc. If something breaks, you can roll back.
5. **Take a screenshot at the end of Phase 1.** Compare against the aesthetic goals. Be honest. Iterate until it actually looks classy.

## What Day 3 Will Add (Preview)

- NFC card integration (URL endpoints + iPhone tap-to-trigger)
- Eval framework: each scenario is run N times, variance shown in UI
- One more scenario: Demand Oracle agent (if time allows) — predicting product demand from weather + events
- Final demo polish, scenario card printing, rehearsal

## Library Installation Summary

Add to backend:
```bash
pip install anthropic  # already have
# web search is built into Anthropic's SDK now
```

Add to frontend:
```bash
pnpm add motion recharts
```

Verify these are still installed from Day 1: react, tailwindcss, zustand, lucide-react.

## Reference Aesthetics

When in doubt about whether the UI looks right, compare against these references (open them in a new tab):
- Linear's app interface — for density, restraint, motion
- Vercel Dashboard — for dark theme refinement
- Bloomberg Terminal — for information density done seriously
- SpaceX live launch dashboards — for mission control aesthetic
- Stripe Dashboard — for elegant data presentation

If your UI doesn't sit comfortably alongside those, keep iterating.
