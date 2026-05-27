# BakeOps Command Center — Day 3 Build Plan

## Status After Day 2

Working: Three agents (Maintenance Prophet, Supply Sentinel, Recipe Chemist) functioning with parallel execution. Backend solid.

Not working: The UI still doesn't read as a finished premium product. The aesthetic is too "industrial control room" and not enough "Mercury Bank dashboard." It needs to feel like a tool that an executive would proudly demo at a board meeting.

Today fixes that completely, plus revises scenarios so FGF judges experience immediate recognition.

## Day 3 Goals (In Priority Order)

1. **Total UI redesign to "Editorial Operations" aesthetic** (full Phase 1 — non-negotiable)
2. **Replace scenarios with FGF-recognizable problems** (research-backed below)
3. **NFC card integration** for tap-to-trigger demo magic
4. **Light eval/confidence layer** showing each scenario's reliability across runs
5. **Demo polish + rehearsal infrastructure**

---

## Part 1: The New Aesthetic — "Editorial Operations"

### Why we're changing direction

The previous design committed to dense, dark, industrial. After research into what reads as "modern and classy" in 2026 enterprise products, the pattern is clear: **the best AI dashboards in 2026 are restrained, paper-like, generously spaced, and confidently typographic.** Reference set:

- **Mercury Bank** — premium minimalism, off-white surfaces, warm restraint
- **Linear** — calm, refined, deliberate whitespace
- **Anthropic (claude.ai)** — paper-like, restrained, serious without being cold
- **Stripe Dashboard** — financial clarity, big numbers, restrained color
- **Notion Calendar (formerly Cron)** — elegant data, beautiful type pairings

These dashboards make you feel like you're operating a serious product. They do not feel like a "tech demo." That's what we're going for today.

### The aesthetic principles (memorize these)

1. **Light theme primary, dark only for contrast zones.** Off-white warm surface as the canvas. Agent reasoning lives in a dark "transcript" panel for high contrast and editorial feel.
2. **Generous spacing.** Cards have `p-6` to `p-8`. Sections separate with `gap-6` to `gap-8`. The interface breathes.
3. **One hero zone dominates.** At any moment, the user knows what to look at first.
4. **Typography is design.** A distinctive serif display + a refined sans + a tasteful mono. Type carries the personality, color does not.
5. **Restraint with color.** Amber accent used only for status warnings and active states. Most of the interface is white, off-white, ink, and grey.
6. **Hairline borders, no heavy shadows.** Borders are 1px at ~6% opacity. Shadows are soft and very subtle. Cards feel like paper, not glass.
7. **Real data visualization.** Sparklines, gauges, percentages — but minimal chartjunk. Each chart earns its space.
8. **Narrative flow.** Reading the screen top to bottom tells you a story.

### The color palette (use these exact values)

Replace `tailwind.config.js` color values with:

```css
:root {
  /* Surfaces — warm off-white canvas */
  --bg-canvas: #FAFAF7;        /* Main background, warm cream */
  --bg-paper: #FFFFFF;          /* Cards */
  --bg-paper-warm: #F6F4EF;     /* Subtle warm tint for variation */
  --bg-ink: #0E0E10;            /* Dark contrast zone (agent stream) */
  --bg-ink-soft: #1A1A1E;       /* Slightly lighter ink */

  /* Borders — hairlines */
  --border-hairline: rgba(14, 14, 16, 0.06);
  --border-soft: rgba(14, 14, 16, 0.10);
  --border-strong: rgba(14, 14, 16, 0.18);
  --border-ink: rgba(255, 255, 255, 0.08);  /* For dark zones */

  /* Text on light */
  --ink-primary: #0E0E10;       /* Almost-black */
  --ink-secondary: #46464A;     /* Body text */
  --ink-tertiary: #76767C;      /* Captions, labels */
  --ink-muted: #A8A8AE;         /* Disabled */

  /* Text on dark */
  --paper-primary: #FAFAF7;
  --paper-secondary: #C8C8CC;
  --paper-tertiary: #88888E;

  /* Signature accent — warm amber, used sparingly */
  --accent: #B45309;            /* Deeper amber, more refined than #F59E0B */
  --accent-soft: #FCE9C9;       /* Soft amber wash for backgrounds */
  --accent-ink: #78350F;        /* For amber text on light */

  /* Status colors — desaturated for refinement */
  --status-running: #15803D;    /* Deep green */
  --status-running-soft: #DCFCE7;
  --status-warning: #B45309;    /* Amber */
  --status-warning-soft: #FEF3C7;
  --status-danger: #B91C1C;     /* Deep red */
  --status-danger-soft: #FEE2E2;
  --status-info: #1D4ED8;       /* Deep blue */
  --status-info-soft: #DBEAFE;

  /* Agent identity (used as a thin colored bar/accent, not flood color) */
  --agent-orchestrator: #0E0E10;   /* Ink */
  --agent-maintenance: #B45309;    /* Amber */
  --agent-supply: #1D4ED8;         /* Deep blue */
  --agent-recipe: #6D28D9;         /* Refined violet */
}
```

### Typography (do not substitute these)

Replace the previous font setup with:

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

In Tailwind:
```js
fontFamily: {
  display: ['Fraunces', 'serif'],
  sans: ['Inter Tight', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
}
```

**Type roles:**
- `font-display` (Fraunces) — hero numbers, the brand mark, recommendation card titles, plant name. This is the personality font. Use it for the moments you want to feel literary or weighty.
- `font-sans` (Inter Tight) — everything else. Body, labels, descriptions, buttons. This is your workhorse.
- `font-mono` (JetBrains Mono) — only for technical identifiers: timestamps, IDs (LINE-03, OVEN-2A), sensor readings, percentages, code-like data. Tabular numbers `font-feature-settings: 'tnum'`.

**Type scale:**
- Brand mark: `text-[22px] font-display font-medium` + small `text-[11px] font-mono uppercase tracking-[0.18em]` subtitle
- Hero numbers (factory status value at risk, etc.): `text-[56px] font-display font-normal tracking-tight`
- Section labels: `text-[11px] font-mono uppercase tracking-[0.18em] text-ink-tertiary`
- Card titles: `text-[15px] font-sans font-semibold text-ink-primary`
- Body: `text-[14px] font-sans text-ink-secondary leading-relaxed`
- Data values (KPI cards): `text-[28px] font-display tabular-nums tracking-tight`
- Status pills: `text-[10px] font-mono uppercase tracking-wider`

**Critical:** No 11px or 10px sans-serif body text. If it's not mono, it's at least 13px.

### The new layout (full redesign)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOP STRIP (h-14, bg-canvas, border-b-hairline)                            │
│                                                                            │
│ BAKEOPS               PLANT 01 · NORTH TORONTO              ⌘ COMMAND      │
│ Command Center        4 lines · 2,847 units/hr              22:41:08 EDT  │
└─────────────────────────────────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────────┬───────────────────────┐
│                  │                               │                       │
│  STAFF           │   HERO STATUS                 │   ACTIVE STREAM       │
│  (left rail)     │   (full-width card)           │   (dark ink panel)    │
│                  │                               │                       │
│  ORCHESTRATOR    │   ┌──────────────────────┐   │   ─────────────       │
│  ● Lead          │   │  Status: NOMINAL     │   │   STREAM              │
│  Coordinator     │   │                      │   │   ─────────────       │
│                  │   │  $284,000            │   │                       │
│  ─────           │   │  Value at risk       │   │   [waiting for        │
│                  │   │  (last 24h)          │   │    scenario...]       │
│  MAINTENANCE     │   │                      │   │                       │
│  ● Idle          │   │  ↓ 18% vs 30-day avg │   │                       │
│  Equipment       │   └──────────────────────┘   │   When active:        │
│                  │                               │   - Agent name        │
│  ─────           │   PRODUCTION FLOOR            │   - Streaming text   │
│                  │   ┌────────┬────────┬─────┐ │   - Tool calls       │
│  SUPPLY          │   │LINE 01 │LINE 02 │ ... │ │   - Final answer     │
│  ● Idle          │   │Naan    │Croiss. │     │ │                       │
│  Logistics       │   │4200/hr │1800/hr │     │ │                       │
│                  │   │● Run   │● Run   │     │ │                       │
│  ─────           │   └────────┴────────┴─────┘ │                       │
│                  │                               │                       │
│  RECIPE          │   OPERATIONAL METRICS         │                       │
│  ● Idle          │   ┌─────┬─────┬─────┬─────┐ │                       │
│  Formulation     │   │ OEE │Waste│Energy│Cost│ │                       │
│                  │   │ 78% │ 4.2%│ ─── │ ─── │ │                       │
│                  │   └─────┴─────┴─────┴─────┘ │                       │
│                  │                               │                       │
└──────────────────┴───────────────────────────────┴───────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│ COMMAND BAR (h-16, bg-paper-warm, border-t-hairline)                      │
│                                                                            │
│ ⌘  Trigger scenario or ask a question...        [Upload] [SCN ▾] [→]      │
└─────────────────────────────────────────────────────────────────────────┘
```

Grid: `grid-cols-[260px_1fr_440px]` on desktop. Use viewport units sensibly. Mobile is irrelevant for this demo.

### Component specifications

#### TopStrip
- `h-14`, `bg-canvas`, `border-b border-hairline`
- Left: Brand mark
  - "BAKEOPS" in Fraunces 500, 22px, ink-primary
  - "Command Center" below in Fraunces 400 italic, 13px, ink-tertiary
- Center: Plant identifier as two-line muted block
  - "PLANT 01 · NORTH TORONTO" in mono uppercase 11px tracking-widest
  - "4 lines · 2,847 units/hr" in sans 13px ink-tertiary
- Right: Live clock + system status
  - Status pill: green dot pulsing + "NOMINAL" in mono uppercase 11px
  - Time: mono 14px ink-secondary, tabular-nums, updates every second
- Padding: `px-8`

#### StaffRail (left sidebar)
- `w-[260px]`, `bg-canvas`, `border-r border-hairline`
- Header: "STAFF" in mono uppercase 11px tracking-widest, `px-6 pt-6 pb-3`
- Each agent block:
  - Padding `px-6 py-4`
  - Top row: status indicator dot (left, 6px) + agent name in Inter Tight 14px semibold
  - Second row: agent role (e.g., "Equipment & Maintenance") in 12px ink-tertiary
  - When active: subtle warm amber left border (3px), name in ink-primary, status dot in amber pulsing
  - When idle: gray dot, ink-tertiary text
  - When done: green dot, "DONE" mini-label in mono 10px

#### HeroStatus card (top of center column)
- `bg-paper`, `rounded-lg`, `border border-hairline`, `p-8`
- Two-column internal layout:
  - Left: Big numeric headline
    - Label: "VALUE AT RISK (LAST 24H)" in mono 11px uppercase tracking-widest, ink-tertiary
    - Value: "$284,000" in Fraunces 56px, tracking-tight, ink-primary
    - Delta: "↓ 18% vs 30-day avg" in sans 13px text-status-running
  - Right: Status indicator
    - Big status pill: "NOMINAL" in display 28px + green dot pulsing
    - Mini caption: "All 4 lines operational"
- This card sets the tone — it should look like the homepage hero of a serious financial product

#### ProductionFloor section
- Section label: "PRODUCTION FLOOR" in mono 11px uppercase tracking-widest, mb-4
- 4 cards in a grid `grid-cols-4 gap-4`
- Each ProductionLineCard:
  - `bg-paper`, `border border-hairline`, `rounded-lg`, `p-5`
  - Header: Line ID in mono 11px uppercase ("LINE 01")
  - Product name: Fraunces 18px font-medium ("Naan")
  - Throughput: Fraunces 32px tabular-nums ("4,200")
  - Throughput unit: mono 11px ink-tertiary ("UNITS / HR")
  - Status row: status dot + "RUNNING" in mono 10px uppercase
  - Sparkline (bottom): 24px height, line in agent color or amber if alerted
  - When alerted: subtle amber inner glow, alert icon top-right, slight pulsing border
- Spacing: gap-4 between cards

#### MetricsBar
- Section label: "OPERATIONAL METRICS"
- 4 KPI cards `grid-cols-4 gap-4`
- Each: label (mono 11px), value (display 28px tabular), sparkline (small), delta below
- Metrics: **OEE %**, **Waste %**, **Energy (kWh)**, **Output (units/hr)**

#### ActiveStream panel (right column, dark contrast zone)
- `bg-ink` (#0E0E10), `text-paper-primary`, `border-l border-hairline`
- Header bar: "STREAM" in mono 11px paper-tertiary uppercase + scenario name if running
- Content area: scrollable, generous `p-6`

**When idle:**
- Centered subtle "Awaiting scenario" message in paper-tertiary, italic Fraunces 16px
- Show a tiny pulsing dot below

**When active:**
- Each agent's contribution rendered as a "turn":
  - Horizontal divider (subtle, paper-tertiary at 12% opacity)
  - Agent name in mono uppercase 11px in their identity color (e.g., amber for Maintenance)
  - Timestamp on the right in mono 11px paper-tertiary
  - Reasoning content in sans 14px paper-primary, leading-relaxed
  - When streaming, a thin blinking cursor at the end (CSS animation)
  - When tool used: small inline pill showing "🔍 searched web for: 'wheat futures'"
- After all agents complete, **Final Recommendation card**:
  - Slightly different background: `bg-paper-warm/5`
  - Border-l 3px in amber
  - Header: "RECOMMENDATION" in mono uppercase 11px amber
  - Title: in Fraunces 18px paper-primary
  - Body: structured fields rendered cleanly
    - Diagnosis: ...
    - Action: ...
    - Cost of action: $X
    - Cost of inaction: $Y
    - Confidence: 87% (shown as a horizontal gauge)
  - This card should look like a memo, not a chat reply

#### CommandBar
- `h-16`, `bg-paper-warm`, `border-t border-hairline`
- Left: ⌘ symbol in ink-tertiary, then the input
- Input: no visible border, transparent bg, sans 15px, with cursor in amber
- Right side: 
  - Upload button (icon + "Upload Label" in sans 13px) — for Recipe Chemist
  - Scenario dropdown (mono 11px "SCN ▾") — preset scenarios
  - Submit (→ button, amber accent)
- Subtle bottom hint text on the right: "Tap NFC card or type a scenario"

### Background atmosphere

The canvas isn't flat. Add this very subtle gradient:

```css
body {
  background: 
    radial-gradient(ellipse 800px 400px at 50% 0%, rgba(180, 83, 9, 0.04), transparent 60%),
    var(--bg-canvas);
}
```

A faint warm wash at the top of the screen makes the interface feel atmospheric without being decorative.

### Motion principles

- **No bouncy animations.** Linear-style: precise, fast, purposeful.
- **Status dot pulse:** 2s ease-in-out infinite, scale 1.0 → 1.15 → 1.0, opacity 1 → 0.8 → 1.
- **Agent activation:** 200ms ease-out, slight slide-up (4px) + fade-in.
- **Number changes:** No number rolling. Just a brief 150ms fade through neutral and back. Keeps it calm.
- **Token streaming cursor:** A 2px wide bar that blinks at 1.2s intervals.
- **Final recommendation arrival:** Slight scale from 0.98 → 1.0 + fade, 250ms.

### What this should feel like

If you took a screenshot and put it next to:
- Mercury Bank dashboard
- Linear's app
- Anthropic claude.ai
- Stripe Dashboard

...it should sit comfortably alongside them without looking like a hackathon project. This is the bar. Take screenshots at major checkpoints and compare honestly.

---

## Part 2: The Refined Scenarios (FGF-Recognizable)

These replace whatever scenarios are currently in use. Each scenario is designed so an FGF judge will immediately think *"yes, we deal with this."*

### Scenario 1 — Maintenance Prophet

**Title in UI:** "Tunnel Oven Anomaly — Line 03"

**Scenario text:**
> *Tunnel oven on Line 03 (Stonefire naan production) showing thermal sensor drift. Heating element health score dropped from 0.92 to 0.61 over the past 4 hours. Current zone temperature 285°C, target 290°C. Peak production window begins in 6 hours. Costco Ontario delivery scheduled at 0500.*

**Why FGF judges will nod:**
- FGF's tunnel ovens are their patented signature equipment for naan production
- "Stonefire" is one of their flagship brands
- The 99% fill rate to retailers like Costco is their public commitment
- Heating element degradation is the most common cause of bakery line failures
- 6-hour window before peak production is a realistic decision pressure

**Expected agent output:**
- Diagnosis (heating element nearing failure)
- Predicted failure window
- Recommended action (2 AM maintenance vs run-to-failure)
- Cost of intervention vs cost of inaction (with realistic numbers)
- Confidence score

### Scenario 2 — Supply Sentinel

**Title in UI:** "Yeast Supplier Allocation Cut"

**Scenario text:**
> *Lallemand Inc. (commercial yeast supplier) issued emergency notice: 35% allocation reduction effective immediately due to fermentation facility incident at their Montreal plant. Currently 4 days of yeast inventory across North York and Mississauga facilities. Croissant, sourdough, and artisan loaf lines depend on this supplier. Decision required within 12 hours.*

**Why FGF judges will nod:**
- Lallemand is a real Montreal-based commercial yeast supplier; FGF likely sources from them or similar
- Yeast disruptions have hit the global baking industry multiple times in the past decade
- Croissant, sourdough, and artisan breads are all in FGF's portfolio (ACE Bakery products)
- The "no synthetic preservatives" identity makes yeast critical — they can't compensate with chemistry
- North York is FGF's actual home office location

**Expected agent output:**
- Disruption impact (which products affected, days of inventory remaining)
- Alternative suppliers (with realistic lead times and cost premiums)
- Recommended action (emergency PO, production rescheduling)
- Cost impact estimates
- Drafted procurement email to backup supplier

### Scenario 3 — Recipe Chemist

**Title in UI:** "Costco Clean Label Request"

**Scenario text:**
> *Costco Canada has issued a clean label compliance request: remove calcium propionate and mono- and diglycerides from all FGF-supplied croissant SKUs by Q3 2026. Affects 6 product lines accounting for $12.4M annual revenue. Reformulation required while maintaining 21-day shelf life and existing texture profile. Provide reformulation analysis.*

**Why FGF judges will nod:**
- Costco is one of FGF's largest customers
- Costco IS pushing clean label compliance across its supplier base in 2026 — this is a real industry trend
- Calcium propionate and mono/diglycerides are the two most common synthetic additives in commercial baked goods
- FGF's entire identity is "cleanest possible ingredients" — they reformulate constantly
- $12.4M is a realistic revenue at-risk number for a single retailer × product family
- 21-day shelf life is realistic for naturally-preserved baked goods

**Expected agent output:**
- Synthetic ingredients identified (calcium propionate, mono- and diglycerides)
- Natural replacements proposed (fermented wheat flour for mold inhibition, sunflower lecithin for emulsification)
- Cost delta and functional impact analysis
- Predicted shelf life with new formulation
- Regulatory compliance check
- Recommendation with confidence

### Bonus scenario (if time): Multi-agent

**Title in UI:** "Stonefire Naan Recall Risk — West Coast Returns"

**Scenario text:**
> *Customer service log: 7 retailers reporting premature mold growth on Stonefire naan products distributed through West Coast warehouse. Shelf life trending 13.4 days versus 18-day commitment. Past 48 hours: 142 customer complaints. Cross-functional investigation required.*

**Why FGF judges will nod:**
- This is the actual nightmare scenario for any clean-label bakery
- Stonefire is FGF's flagship brand
- FGF has had real recall events related to contamination (publicly reported)
- Mold growth in naturally-preserved products is the recurring fear
- West Coast distribution implies the real distribution model

**Why this is the boss-level scenario:** All three agents activate in parallel.
- **Maintenance Prophet** investigates production-environment factors (humidity, oven temperature consistency)
- **Supply Sentinel** investigates ingredient batch traceability and supplier quality
- **Recipe Chemist** evaluates reformulation options to extend shelf life

The Orchestrator synthesizes their findings into a unified incident response with probability-ranked root causes and recommended actions.

If this works in the demo, you have an unforgettable moment.

---

## Part 3: NFC Card Integration

### How it works (architecture)

1. Each NFC card has a URL written to it: `http://<mac-ip>:8000/api/trigger?scn=SCN-1`
2. Judge taps card to iPhone
3. iPhone opens the URL in Safari → hits the FastAPI endpoint
4. Endpoint triggers the scenario internally → returns a small HTML page that says "Triggered ✓"
5. Meanwhile, the Mac dashboard (already open in browser) receives the trigger via SSE/WebSocket broadcast and runs the scenario

### Implementation steps

1. Add `GET /api/trigger` endpoint that accepts `?scn=` parameter
2. When called, broadcast a "trigger" event over an internal pub/sub to all connected dashboard clients
3. Dashboard subscribes to this broadcast channel via SSE on mount (separate from the per-scenario stream)
4. When trigger received, dashboard auto-fires the scenario as if user clicked Submit
5. The endpoint itself returns a small, beautifully styled "Scenario Triggered" success page for the iPhone screen

### Writing the NFC cards

Use the **NFC Tools** iOS app:
- Open NFC Tools → Write → Add Record → URL
- Enter: `http://<mac-ip>:8000/api/trigger?scn=SCN-1` (replace IP)
- Tap card to phone, hold for 1 second
- Repeat for SCN-2, SCN-3, BONUS

### Setup checklist for demo

- [ ] Find Mac's local IP (`ifconfig | grep "inet "` → look for 192.168.x.x)
- [ ] Bring portable WiFi hotspot as backup (venue WiFi unreliable)
- [ ] Test that iPhone and Mac can talk on same network
- [ ] Write 4 cards (3 scenarios + 1 multi-agent bonus)
- [ ] Label each card subtly on the back (small mono text: "SCN-1: Oven", etc.) for your own reference
- [ ] Have a tester tap each card before demo day

---

## Part 4: Eval & Confidence Layer

Add a small but mighty observability element that TMLS judges will love.

### What to add

1. **Each agent output already has a confidence score.** Visualize it properly in the recommendation card — a horizontal bar with the confidence percentage, color-coded.

2. **"Reliability" panel below each completed run:**
   - Small bottom-of-stream section: "RUN STATISTICS"
   - Shows: "Run #N · Same scenario · Variance: low · Agents agreed: 3/3"
   - This implies you've run it before and tracked consistency

3. **Add a `/api/scenarios/{id}/replay` endpoint:** runs the same scenario 5 times in the background, surfaces variance statistics. Hide this in the UI unless judge asks — but have it ready as a "deep dive" moment.

The eval framework doesn't have to be elaborate. The signal is: *"we measured our own reliability."* That alone separates you from 95% of hackathon projects.

---

## Part 5: Demo Day Polish

### Pre-recorded fallback video

Record a 60-second screen capture of the perfect demo (all three scenarios working). Have it ready to play if anything fails on Friday. Submit it with your Thursday deliverable too — the form usually accepts a video.

### Onboarding overlay

When the dashboard first loads, show a subtle 3-step overlay:
1. "Tap an NFC card or pick a preset scenario below"
2. "Watch agents reason in real time on the right"
3. "Read the final recommendation card at the bottom of the stream"

User dismisses with one click. This makes the first 5 seconds clear for any judge.

### Demo script (memorize)

**Opening (15 seconds):**
> "BakeOps is a multi-agent AI system for large-scale bakeries like FGF. It runs as a real-time digital twin of a production facility. When something goes wrong, specialist agents diagnose and respond in parallel. Want to try?"

**Hand them a card. They tap.**

**During the demo (30-60 seconds):**
Stay silent. Let the agents stream. Point to the active stream panel.

**Closing (10 seconds):**
> "Each plant we monitor saves an estimated $500K to $1M annually from predicted downtime, supply disruption response, and reformulation acceleration. FGF runs 22 plants."

Pause. Let it land. Ask if they have a question.

---

## Day 3 Step-by-Step Plan

### Phase 1 — UI Foundation (4-5 hours) [DO FIRST]

1. Update `tailwind.config.js` with the new color palette (use CSS variables)
2. Update `index.html` with new Google Fonts (Fraunces + Inter Tight + JetBrains Mono)
3. Add global CSS for body background gradient and base styles
4. Rebuild `TopStrip` component to new spec
5. Rebuild `StaffRail` (formerly AgentRoster) component
6. Rebuild `HeroStatus` card
7. Rebuild `ProductionFloor` section with new card design
8. Rebuild `MetricsBar` with new card design
9. Rebuild `ActiveStream` panel — this is the biggest visual change (dark contrast zone)
10. Rebuild `CommandBar`

**Checkpoint:** Screenshot the dashboard with no scenario running. Place it side-by-side with screenshots of Mercury Bank, Linear, and Anthropic claude.ai. If yours looks credibly in that family, move on. If it still looks like a hackathon project, iterate before proceeding.

### Phase 2 — Refined Scenarios (1 hour)

11. Update preset scenarios in the backend to use the new FGF-recognizable text
12. Update preset dropdown in CommandBar to show short labels:
    - SCN-1: Tunnel Oven Anomaly
    - SCN-2: Yeast Supplier Allocation Cut
    - SCN-3: Costco Clean Label Request
    - SCN-4: Stonefire Naan Recall Risk (BONUS)
13. Tune the system prompts of each agent to produce output that references FGF context naturally (use words like "Stonefire," "Costco," "naan," "tandoor oven," "Western Canadian wheat" where appropriate)
14. Test each scenario 5 times — output should be consistently strong

### Phase 3 — NFC Integration (1-2 hours)

15. Add `GET /api/trigger?scn={id}` endpoint
16. Add internal broadcast channel (use a simple in-memory pub/sub like `asyncio.Queue`)
17. Add SSE endpoint for the dashboard to subscribe to trigger events
18. Update frontend to listen for trigger events and auto-fire the matching scenario
19. Style the iPhone success page (it should be a tiny dark card that says "TRIGGERED ✓" with the scenario name)
20. Write the 4 NFC cards using NFC Tools app

### Phase 4 — Eval Layer (1 hour)

21. Add confidence visualization to recommendation cards (horizontal gauge)
22. Add "RUN STATISTICS" footer below completed runs
23. Add `/api/scenarios/{id}/replay` endpoint for variance analysis (don't expose in UI unless asked)

### Phase 5 — Demo Polish (1-2 hours)

24. Record the 60-second fallback video
25. Add the onboarding overlay
26. Print physical scenario cards (small business-card sized, mono font, just scenario name) as backup props
27. Memorize and rehearse the demo script
28. Run the full demo end-to-end 10+ times, noting any flakiness

---

## Day 3 Success Criteria

Before calling Day 3 done, every box must be checked:

- [ ] Side-by-side with Mercury/Linear/Anthropic, the dashboard does not look out of place
- [ ] All three core scenarios produce consistently strong output (run 5+ times each)
- [ ] NFC cards trigger scenarios reliably from iPhone tap
- [ ] Confidence scores and reliability stats visible in the UI
- [ ] Fallback demo video recorded
- [ ] Demo script rehearsed 10+ times
- [ ] Code committed to git
- [ ] Submission package prepared (project name, problem statement, video, repo link)

---

## Day 4 (Thursday) Preview

Thursday is **finish, polish, submit**. Not building.

Morning:
- Final bug pass
- One more rehearsal
- Submit by 2 PM

Afternoon:
- Pack equipment for Friday (laptop, backup laptop, hotspot, NFC cards, printed cards, scenario card "deck")
- Rest

---

## What Must Not Happen Today

- Do not add a 5th agent. Three is enough.
- Do not redesign the architecture. UI and prompts only.
- Do not chase perfection on the eval framework. A small, visible signal is enough.
- Do not skip the demo rehearsal at the end.

The biggest risk today is treating the UI redesign as optional or rushing it. The UI is what every judge sees in their first 5 seconds. It either earns trust or loses it. Spend the time.

---

## Reference Screenshots to Pull Up While Designing

Open these in tabs as you work:
- **Mercury Bank** dashboard: https://mercury.com
- **Linear** app: https://linear.app
- **Anthropic claude.ai**
- **Stripe Dashboard** examples: search "Stripe dashboard screenshot"
- **Notion Calendar** (formerly Cron)

If your UI doesn't sit comfortably with these, keep iterating until it does.
