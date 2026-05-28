import json
import re
from typing import AsyncGenerator

import anthropic

from config import ANTHROPIC_API_KEY, SPECIALIST_MODEL
from streaming import events
from agents.prompts import MAINTENANCE_PROPHET_SYSTEM

AGENT_ID = "maintenance_prophet"
AGENT_NAME = "Maintenance Prophet"


async def run(scenario: str, factory_state: dict) -> AsyncGenerator[str, None]:
    yield events.agent_started(AGENT_ID, AGENT_NAME)

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    user_message = f"""SCENARIO: {scenario}

LIVE FACTORY STATE:
{json.dumps(factory_state, indent=2)}

Analyze this situation and provide your maintenance recommendation."""

    full_text = ""

    async with client.messages.stream(
        model=SPECIALIST_MODEL,
        max_tokens=2048,
        system=MAINTENANCE_PROPHET_SYSTEM,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        async for text in stream.text_stream:
            full_text += text
            yield events.agent_thinking(AGENT_ID, text)

    recommendation = _extract_recommendation(full_text)
    yield events.agent_completed(AGENT_ID, {"raw_analysis": full_text, "recommendation": recommendation})


_NUMERIC_FIELDS = {
    "cost_of_action_usd", "cost_of_inaction_usd",
    "estimated_cost_impact_usd", "estimated_cost_of_inaction_usd",
    "predicted_failure_window_hours", "confidence",
}


def _coerce_numbers(rec: dict) -> dict:
    """Ensure known numeric fields are Python floats, not strings."""
    for field in _NUMERIC_FIELDS:
        if field in rec and not isinstance(rec[field], (int, float)):
            try:
                rec[field] = float(str(rec[field]).replace(",", "").replace("$", "").strip())
            except (ValueError, TypeError):
                pass
    return rec


def _extract_recommendation(text: str) -> dict:
    match = re.search(r"<recommendation>(.*?)</recommendation>", text, re.DOTALL)
    if not match:
        return {"error": "Could not parse structured recommendation", "raw": text}
    try:
        return _coerce_numbers(json.loads(match.group(1).strip()))
    except json.JSONDecodeError:
        return {"error": "Invalid JSON in recommendation", "raw": match.group(1)}
