"""
Open Food Facts MCP Server
==========================
Exposes the public Open Food Facts API (https://world.openfoodfacts.org) as a
Model Context Protocol (MCP) tool. The BakeOps Recipe Chemist calls the
`lookup_food_product` tool through an MCP client session.

Run standalone (stdio transport):
    python backend/mcp_servers/open_food_facts_server.py

Inspect interactively:
    mcp dev backend/mcp_servers/open_food_facts_server.py
"""
from __future__ import annotations

import json
from typing import Annotated

import httpx
from pydantic import Field
from mcp.server.fastmcp import FastMCP

# ── Constants ──────────────────────────────────────────────────────────────
OFF_BARCODE_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
HTTP_TIMEOUT = 8.0

# ── Server ─────────────────────────────────────────────────────────────────
mcp = FastMCP("open_food_facts_mcp")


# ── Internal helpers (one source of truth, no duplication) ────────────────
async def _fetch_by_barcode(client: httpx.AsyncClient, barcode: str) -> dict:
    """Exact product lookup by barcode."""
    r = await client.get(OFF_BARCODE_URL.format(barcode=barcode))
    r.raise_for_status()
    data = r.json()
    if data.get("status") == 1:
        prod = data["product"]
        return {
            "found": True,
            "query_type": "barcode",
            "product_name": prod.get("product_name", "Unknown"),
            "ingredients_text": prod.get("ingredients_text", ""),
            "additives_tags": prod.get("additives_tags", []),
            "nova_group": prod.get("nova_group"),
            "nutriscore_grade": prod.get("nutriscore_grade"),
        }
    return {"found": False, "query_type": "barcode",
            "error": f"No product found for barcode {barcode}"}


async def _fetch_by_name(client: httpx.AsyncClient, name: str) -> dict:
    """Best-match product search by free-text name."""
    r = await client.get(
        OFF_SEARCH_URL,
        params={"search_terms": name, "json": "1", "page_size": "1"},
    )
    r.raise_for_status()
    data = r.json()
    products = data.get("products") or []
    if products:
        prod = products[0]
        return {
            "found": True,
            "query_type": "search",
            "product_name": prod.get("product_name", "Unknown"),
            "ingredients_text": prod.get("ingredients_text", ""),
            "additives_tags": prod.get("additives_tags", []),
            "nova_group": prod.get("nova_group"),
            "nutriscore_grade": prod.get("nutriscore_grade"),
        }
    return {"found": False, "query_type": "search",
            "error": f"No product found for '{name}'"}


def _format_error(e: Exception) -> dict:
    """Turn any failure into a clear, actionable payload."""
    if isinstance(e, httpx.TimeoutException):
        return {"found": False, "error": "Open Food Facts request timed out. Try again."}
    if isinstance(e, httpx.HTTPStatusError):
        return {"found": False,
                "error": f"Open Food Facts returned HTTP {e.response.status_code}."}
    return {"found": False, "error": f"Unexpected error: {type(e).__name__}: {e}"}


# ── The tool ───────────────────────────────────────────────────────────────
@mcp.tool(
    name="lookup_food_product",
    annotations={
        "title": "Look up a food product on Open Food Facts",
        "readOnlyHint": True,      # never changes anything
        "destructiveHint": False,
        "idempotentHint": True,    # same query → same result
        "openWorldHint": True,     # talks to an external API
    },
)
async def lookup_food_product(
    query: Annotated[
        str,
        Field(
            description=(
                "Either a product barcode (8-13 digits, e.g. '3017620422003') "
                "or a free-text product name (e.g. 'calcium propionate bread')."
            ),
            min_length=1,
            max_length=200,
        ),
    ]
) -> str:
    """Look up a food product's ingredients and additives from Open Food Facts.

    If `query` is all digits it is treated as a barcode (exact lookup); otherwise
    it is treated as a search term (returns the single best match).

    Returns:
        str: a JSON string with this shape:
            {
              "found": bool,
              "query_type": "barcode" | "search",
              "product_name": str,            # when found
              "ingredients_text": str,        # full printed ingredient list
              "additives_tags": list[str],    # e.g. ["en:e282", "en:e471"]
              "nova_group": int | null,       # 1-4 processing level
              "nutriscore_grade": str | null, # "a"-"e"
              "error": str                    # when found is false
            }
    """
    q = query.strip()
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            result = await (_fetch_by_barcode(client, q) if q.isdigit()
                            else _fetch_by_name(client, q))
    except Exception as e:  # noqa: BLE001 — all errors become a tool payload
        result = _format_error(e)
    return json.dumps(result, indent=2)


if __name__ == "__main__":
    mcp.run()   # stdio transport (default)
