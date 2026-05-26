from __future__ import annotations

import base64
import json
import re
from pathlib import Path
from typing import AsyncGenerator, Optional

import anthropic
import httpx

from config import ANTHROPIC_API_KEY, SPECIALIST_MODEL
from streaming import events
from agents.prompts import RECIPE_CHEMIST_SYSTEM

AGENT_ID = "recipe_chemist"
AGENT_NAME = "Recipe Chemist"

_ALTERNATIVES_PATH = Path(__file__).parent.parent / "data" / "clean_label_alternatives.json"


def _load_alternatives() -> dict:
    return json.loads(_ALTERNATIVES_PATH.read_text())


async def _lookup_open_food_facts(query: str) -> dict:
    """Query Open Food Facts API by barcode or product name."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            if query.isdigit():
                url = f"https://world.openfoodfacts.org/api/v2/product/{query}.json"
                r = await client.get(url)
                data = r.json()
                if data.get("status") == 1:
                    prod = data["product"]
                    return {
                        "found": True,
                        "product_name": prod.get("product_name", "Unknown"),
                        "ingredients_text": prod.get("ingredients_text", ""),
                        "additives_tags": prod.get("additives_tags", []),
                        "nova_group": prod.get("nova_group"),
                        "nutriscore_grade": prod.get("nutriscore_grade"),
                    }
            else:
                r = await client.get(
                    "https://world.openfoodfacts.org/cgi/search.pl",
                    params={"search_terms": query, "json": "1", "page_size": "1"},
                )
                data = r.json()
                if data.get("products"):
                    prod = data["products"][0]
                    return {
                        "found": True,
                        "product_name": prod.get("product_name", "Unknown"),
                        "ingredients_text": prod.get("ingredients_text", ""),
                        "additives_tags": prod.get("additives_tags", []),
                    }
    except Exception as e:
        return {"found": False, "error": str(e)}
    return {"found": False, "error": "Not found"}


async def run(
    scenario: str,
    factory_state: dict,
    image_b64: Optional[str] = None,
    image_media_type: str = "image/jpeg",
) -> AsyncGenerator[str, None]:
    yield events.agent_started(AGENT_ID, AGENT_NAME)

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    alternatives = _load_alternatives()

    # Build message content
    text_content = f"""REFORMULATION REQUEST: {scenario}

CLEAN-LABEL SUBSTITUTION KNOWLEDGE BASE (use as reference):
{json.dumps(alternatives['substitutions'][:8], indent=2)}

Analyze the ingredient list and provide your clean-label reformulation recommendation."""

    if image_b64:
        yield events.agent_tool_call(AGENT_ID, "vision_analysis", {"type": "product_label_image"})
        content: list = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_media_type,
                    "data": image_b64,
                },
            },
            {"type": "text", "text": text_content},
        ]
    else:
        content = [{"type": "text", "text": text_content}]

    # Check if scenario contains a barcode or product name for Open Food Facts
    barcode_match = re.search(r"\b(\d{8,13})\b", scenario)
    if barcode_match:
        barcode = barcode_match.group(1)
        yield events.agent_tool_call(AGENT_ID, "open_food_facts_lookup", {"query": barcode})
        off_data = await _lookup_open_food_facts(barcode)
        if off_data.get("found"):
            yield events.agent_tool_result(AGENT_ID, "open_food_facts_lookup", off_data)
            content.append({
                "type": "text",
                "text": f"\nOPEN FOOD FACTS DATA:\n{json.dumps(off_data, indent=2)}",
            })

    full_text = ""
    async with client.messages.stream(
        model=SPECIALIST_MODEL,
        max_tokens=2048,
        system=RECIPE_CHEMIST_SYSTEM,
        messages=[{"role": "user", "content": content}],
    ) as stream:
        async for text in stream.text_stream:
            full_text += text
            yield events.agent_thinking(AGENT_ID, text)

    recommendation = _extract_recommendation(full_text)
    yield events.agent_completed(AGENT_ID, {"raw_analysis": full_text, "recommendation": recommendation})


def _extract_recommendation(text: str) -> dict:
    match = re.search(r"<recommendation>(.*?)</recommendation>", text, re.DOTALL)
    if not match:
        return {"error": "Could not parse structured recommendation", "raw": text[:200]}
    try:
        return json.loads(match.group(1).strip())
    except json.JSONDecodeError:
        return {"error": "Invalid JSON in recommendation", "raw": match.group(1)[:200]}
