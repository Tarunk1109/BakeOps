from __future__ import annotations

import asyncio
import json
import re
import time
from datetime import datetime, timezone
from typing import AsyncGenerator, List

import anthropic

from config import ANTHROPIC_API_KEY, ORCHESTRATOR_MODEL
from streaming import events
from agents.prompts import ORCHESTRATOR_SYSTEM
from agents import maintenance_prophet, supply_sentinel, recipe_chemist

AGENT_ID = "orchestrator"
AGENT_NAME = "Orchestrator"

_AGENT_MAP = {
    "maintenance_prophet": maintenance_prophet.run,
    "supply_sentinel": supply_sentinel.run,
    "recipe_chemist": recipe_chemist.run,
}

# ── Scenario title detection for Telegram alert ────────────────────────────────
_TITLE_PATTERNS: list[tuple[str, str]] = [
    (r"tunnel oven|heating element|oven.*anomaly|thermal sensor|stonefire.*naan.*line", "Tunnel Oven Anomaly — Line 03"),
    (r"yeast|lallemand|allocation.*reduc|fermentation facility",                        "Yeast Supplier Crisis — Lallemand Inc."),
    (r"costco.*clean label|clean label.*costco|calcium propionate|mono.*diglyceride",   "Costco Clean Label Compliance — Croissants"),
    (r"mold|recall|premature.*mold|shelf life.*trend",                                  "⚠️ Stonefire Naan Recall Risk"),
    (r"live label|webcam|label scan|scanned product",                                   "Live Label Scan — Recipe Chemist"),
]


def _infer_title(scenario: str) -> str:
    s = scenario.lower()
    for pattern, title in _TITLE_PATTERNS:
        if re.search(pattern, s):
            return title
    return "BakeOps Incident Alert"


async def run(
    scenario: str,
    factory_state: dict,
    image_b64: str = "",
    image_media_type: str = "image/jpeg",
    _start_time: float | None = None,
) -> AsyncGenerator[str, None]:
    t0 = _start_time or time.monotonic()

    yield events.agent_started(AGENT_ID, AGENT_NAME)

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    # Step 1: Orchestrator decides routing
    routing_message = (
        f"INCOMING SCENARIO: {scenario}\n\n"
        f"FACTORY STATE SUMMARY:\n"
        f"Facility: {factory_state.get('facility', 'North Toronto Plant')}\n"
        f"Lines: {', '.join(l['product'] for l in factory_state.get('lines', []))}\n\n"
        "Briefly explain your routing decision (1-2 sentences), "
        "then end with: ROUTE_TO: <agents>"
    )

    routing_text = ""
    async with client.messages.stream(
        model=ORCHESTRATOR_MODEL,
        max_tokens=256,
        system=ORCHESTRATOR_SYSTEM,
        messages=[{"role": "user", "content": routing_message}],
    ) as stream:
        async for text in stream.text_stream:
            routing_text += text
            yield events.agent_thinking(AGENT_ID, text)

    chosen_agents = _parse_route(routing_text, scenario)
    yield events.orchestrator_routing(AGENT_ID, routing_text, chosen_agents)

    # Step 2: Run specialist agents (parallel if multiple)
    specialist_outputs: List[dict] = []

    async def _collect(gen: AsyncGenerator[str, None], output_list: List[dict]) -> None:
        async for chunk in gen:
            await queue.put(chunk)
            try:
                payload = json.loads(chunk.removeprefix("data: ").strip())
                if (
                    payload.get("event_type") == "agent_completed"
                    and payload.get("agent_id") != AGENT_ID
                ):
                    output_list.append(payload.get("data", {}))
            except Exception:
                pass
        await queue.put(None)

    queue: asyncio.Queue[str | None] = asyncio.Queue()

    agent_gens = []
    for agent_id in chosen_agents:
        runner = _AGENT_MAP.get(agent_id)
        if runner is None:
            continue
        if agent_id == "recipe_chemist" and image_b64:
            gen = recipe_chemist.run(scenario, factory_state, image_b64, image_media_type)
        else:
            gen = runner(scenario, factory_state)
        agent_gens.append(gen)

    if not agent_gens:
        agent_gens = [maintenance_prophet.run(scenario, factory_state)]

    tasks = [asyncio.create_task(_collect(gen, specialist_outputs)) for gen in agent_gens]

    done_count = 0
    while done_count < len(tasks):
        item = await queue.get()
        if item is None:
            done_count += 1
        else:
            yield item

    await asyncio.gather(*tasks, return_exceptions=True)

    # Step 3: Synthesize final recommendation
    synthesis_context = json.dumps(specialist_outputs, indent=2)
    synthesis_message = (
        f"ORIGINAL SCENARIO: {scenario}\n\n"
        f"SPECIALIST ANALYSES:\n{synthesis_context}\n\n"
        "Write a 2-3 sentence executive summary for plant management. "
        "Include the most important number (cost saved, failure window, or cost delta) and the action to take."
    )

    synthesis_text = ""
    async with client.messages.stream(
        model=ORCHESTRATOR_MODEL,
        max_tokens=512,
        system=ORCHESTRATOR_SYSTEM,
        messages=[{"role": "user", "content": synthesis_message}],
    ) as stream:
        async for text in stream.text_stream:
            synthesis_text += text
            yield events.agent_thinking(AGENT_ID, text)

    # specialist_outputs[0] is the raw SSE data dict: {"output": {"recommendation": {...}, ...}}
    raw_output  = specialist_outputs[0] if specialist_outputs else {}
    inner       = raw_output.get("output", raw_output)           # unwrap the "output" wrapper
    primary_rec = inner.get("recommendation", inner)             # get the structured rec
    final_rec = {
        "summary": synthesis_text,
        "specialist_recommendation": primary_rec,
        "all_specialist_outputs": specialist_outputs,
        "scenario": scenario,
    }

    yield events.final_recommendation(AGENT_ID, final_rec)
    yield events.agent_completed(AGENT_ID, {"final_recommendation": final_rec})

    # ── Step 4: Send Telegram alert ────────────────────────────────────────────
    elapsed = int(time.monotonic() - t0)
    try:
        from services.telegram import send_alert, _is_configured
        if _is_configured():
            sr = primary_rec
            delivered = await send_alert(
                scenario_title     = _infer_title(scenario),
                diagnosis          = str(sr.get("diagnosis") or sr.get("disruption_summary") or "See full analysis"),
                recommended_action = str(sr.get("recommended_action", "See full analysis")),
                cost_of_action     = f"${int(sr.get('cost_of_action_usd', 0)):,}"
                                     if sr.get("cost_of_action_usd") is not None
                                     else str(sr.get("estimated_cost_impact_usd", "N/A")),
                cost_of_inaction   = f"${int(sr.get('cost_of_inaction_usd', 0)):,}"
                                     if sr.get("cost_of_inaction_usd") is not None
                                     else str(sr.get("estimated_cost_of_inaction_usd", "N/A")),
                confidence         = float(sr.get("confidence", 0.85)),
                response_time_seconds = elapsed,
            )
            if delivered:
                yield events.alert_sent(AGENT_ID, {
                    "channel":   "telegram",
                    "status":    "delivered",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    except Exception as exc:
        print(f"[Orchestrator] Telegram step error (non-fatal): {exc}")

    yield events.stream_done()


def _parse_route(routing_text: str, scenario: str) -> List[str]:
    """Extract ROUTE_TO list from orchestrator text, fall back to keyword matching."""
    match = re.search(r"ROUTE_TO:\s*([^\n]+)", routing_text, re.IGNORECASE)
    if match:
        raw = match.group(1).strip()
        agents = [a.strip() for a in re.split(r"[|,\s]+", raw) if a.strip() in _AGENT_MAP]
        if agents:
            return agents

    # Keyword fallback
    lower = scenario.lower()
    chosen = []
    if any(w in lower for w in ["oven", "equipment", "temperature", "vibration", "maintenance", "bearing", "conveyor", "mixer", "health score", "degradation"]):
        chosen.append("maintenance_prophet")
    if any(w in lower for w in ["wheat", "flour", "supplier", "shortage", "supply", "ingredient", "inventory", "procurement"]):
        chosen.append("supply_sentinel")
    if any(w in lower for w in ["recipe", "reformulat", "label", "ingredient list", "clean", "additive", "preservative", "synthetic", "webcam", "scanned"]):
        chosen.append("recipe_chemist")
    return chosen or ["maintenance_prophet"]
