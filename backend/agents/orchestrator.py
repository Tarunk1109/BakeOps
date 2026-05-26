import json
from typing import AsyncGenerator

import anthropic

from config import ANTHROPIC_API_KEY, ORCHESTRATOR_MODEL
from streaming import events
from agents.prompts import ORCHESTRATOR_SYSTEM
from agents import maintenance_prophet

AGENT_ID = "orchestrator"
AGENT_NAME = "Orchestrator"


async def run(scenario: str, factory_state: dict) -> AsyncGenerator[str, None]:
    yield events.agent_started(AGENT_ID, AGENT_NAME)

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    routing_message = f"""INCOMING SCENARIO: {scenario}

FACTORY CONTEXT:
{json.dumps(factory_state, indent=2)}

Briefly explain which specialist agent(s) you are routing this to and why (1-2 sentences only).
Then say: "Routing to: maintenance_prophet" """

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

    yield events.orchestrator_routing(AGENT_ID, routing_text, ["maintenance_prophet"])

    specialist_output = None
    async for event_str in maintenance_prophet.run(scenario, factory_state):
        yield event_str
        # capture the completed event to extract recommendation
        try:
            payload = json.loads(event_str.removeprefix("data: ").strip())
            if payload.get("event_type") == "agent_completed" and payload.get("agent_id") == "maintenance_prophet":
                specialist_output = payload["data"]
        except Exception:
            pass

    synthesis_context = json.dumps(specialist_output, indent=2) if specialist_output else "No specialist output."
    synthesis_message = f"""ORIGINAL SCENARIO: {scenario}

MAINTENANCE PROPHET ANALYSIS:
{synthesis_context}

Synthesize this into a 2-3 sentence executive summary for plant management. Be direct and include the key numbers."""

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

    rec = specialist_output.get("recommendation", {}) if specialist_output else {}
    final_rec = {
        "summary": synthesis_text,
        "specialist_recommendation": rec,
    }

    yield events.final_recommendation(AGENT_ID, final_rec)
    yield events.agent_completed(AGENT_ID, {"final_recommendation": final_rec})
    yield events.stream_done()
