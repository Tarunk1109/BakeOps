from __future__ import annotations

import json
import re
from typing import AsyncGenerator

import anthropic

from config import ANTHROPIC_API_KEY, SPECIALIST_MODEL
from streaming import events
from agents.prompts import SUPPLY_SENTINEL_SYSTEM

AGENT_ID = "supply_sentinel"
AGENT_NAME = "Supply Sentinel"


async def run(scenario: str, factory_state: dict) -> AsyncGenerator[str, None]:
    yield events.agent_started(AGENT_ID, AGENT_NAME)

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    products = [line["product"] for line in factory_state.get("lines", [])]
    cost_data = factory_state.get("production_cost_per_hour_usd", {})

    user_message = f"""SUPPLY CHAIN ALERT: {scenario}

CURRENT FACILITY: {factory_state.get('facility', 'North Toronto Plant')}
ACTIVE PRODUCTION LINES:
{json.dumps(products, indent=2)}

PRODUCTION COSTS PER HOUR (USD):
{json.dumps(cost_data, indent=2)}

Assume typical bakery inventory levels:
- Bread flour / wheat flour: 4-6 days on hand
- Specialty ingredients (eggs, dairy, palm oil): 7-10 days on hand
- Packaging materials: 14-21 days on hand

Analyze this supply disruption and provide your recommendation."""

    full_text = ""
    async with client.messages.stream(
        model=SPECIALIST_MODEL,
        max_tokens=2048,
        system=SUPPLY_SENTINEL_SYSTEM,
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
    "current_inventory_days", "confidence",
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
        return {"error": "Could not parse structured recommendation", "raw": text[:200]}
    try:
        return _coerce_numbers(json.loads(match.group(1).strip()))
    except json.JSONDecodeError:
        return {"error": "Invalid JSON in recommendation", "raw": match.group(1)[:200]}
