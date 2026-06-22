"""
MCP client wrapper for the Open Food Facts MCP server.

The Recipe Chemist calls Open Food Facts through this wrapper, which launches
`mcp_servers/open_food_facts_server.py` over stdio, calls the
`lookup_food_product` tool, and returns the parsed result. On any failure it
returns an error dict so the agent continues gracefully (same behavior as the
old direct call when the API was unavailable).
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Absolute path to the server script (resolved relative to this file → backend/)
_SERVER_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),  # backend/
    "mcp_servers",
    "open_food_facts_server.py",
)


async def lookup_product_via_mcp(query: str) -> Dict[str, Any]:
    """Call the Open Food Facts MCP tool and return the parsed JSON result.

    Args:
        query: a barcode (8-13 digits) or a product name.

    Returns:
        dict: the tool's payload (see the server docstring), or
              {"found": False, "error": ...} if the MCP call fails.
    """
    server = StdioServerParameters(
        command=sys.executable,        # same interpreter running the backend
        args=[_SERVER_PATH],
        env=os.environ.copy(),
    )
    try:
        async with stdio_client(server) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(
                    "lookup_food_product",
                    arguments={"query": query},
                )
                text = ""
                for block in result.content:
                    if getattr(block, "type", None) == "text":
                        text += block.text
                if not text:
                    return {"found": False, "error": "Empty MCP tool response"}
                return json.loads(text)
    except Exception as e:  # noqa: BLE001
        return {"found": False, "error": f"MCP client error: {type(e).__name__}: {e}"}
