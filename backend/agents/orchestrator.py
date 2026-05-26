from __future__ import annotations

import asyncio
import json
import re
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


async def run(
    scenario: str,
    factory_state: dict,
    image_b64: str = "",
    image_media_type: str = "image/jpeg",
) -> AsyncGenerator[str, None]:
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

    primary_rec = specialist_outputs[0].get("recommendation", {}) if specialist_outputs else {}
    final_rec = {
        "summary": synthesis_text,
        "specialist_recommendation": primary_rec,
        "all_specialist_outputs": specialist_outputs,
    }

    yield events.final_recommendation(AGENT_ID, final_rec)
    yield events.agent_completed(AGENT_ID, {"final_recommendation": final_rec})
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
    if any(w in lower for w in ["recipe", "reformulat", "label", "ingredient list", "clean", "additive", "preservative", "synthetic"]):
        chosen.append("recipe_chemist")
    return chosen or ["maintenance_prophet"]
