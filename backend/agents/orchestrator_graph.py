"""
LangGraph orchestrator — a drop-in replacement for agents/orchestrator.run().

Models the BakeOps flow as a supervisor StateGraph:
    START → router → (parallel subset of specialists) → synthesis → END

Exposes the SAME interface as the original orchestrator:
    async def run(scenario, factory_state, image_b64="", image_media_type=...) -> AsyncGenerator[str, None]

so main.py only needs to change which module it imports. The SSE event stream
emitted is byte-for-byte the same as the original, so the frontend is unchanged.
Specialist agents are reused as-is — nodes just call their run() generators.
"""
from __future__ import annotations

import asyncio
import json
import operator
import time
from datetime import datetime, timezone
from typing import Annotated, Any, AsyncGenerator, Dict, List, TypedDict

import anthropic
from langgraph.graph import StateGraph, START, END

from config import ANTHROPIC_API_KEY, ORCHESTRATOR_MODEL
from streaming import events
from agents.prompts import ORCHESTRATOR_SYSTEM
from agents import maintenance_prophet, supply_sentinel, recipe_chemist
# Reuse the original routing + title logic (one source of truth)
from agents.orchestrator import _parse_route, _infer_title

AGENT_ID = "orchestrator"
AGENT_NAME = "Orchestrator"

# Map an agent id → its graph node name
_AGENT_TO_NODE = {
    "maintenance_prophet": "maintenance_node",
    "supply_sentinel": "supply_node",
    "recipe_chemist": "recipe_node",
}


# ── Graph state ────────────────────────────────────────────────────────────
class BakeState(TypedDict):
    scenario: str
    factory_state: dict
    image_b64: str
    image_media_type: str
    routing_text: str
    chosen_agents: List[str]
    # parallel specialists all append here → merge with operator.add
    specialist_outputs: Annotated[List[dict], operator.add]
    synthesis_text: str
    t0: float


def _queue(config) -> asyncio.Queue:
    """Pull the per-request SSE queue out of the LangGraph config."""
    return config["configurable"]["queue"]


# ── Node 1: router ─────────────────────────────────────────────────────────
async def router_node(state: BakeState, config) -> dict:
    q = _queue(config)
    scenario = state["scenario"]
    factory_state = state["factory_state"]

    await q.put(events.agent_started(AGENT_ID, AGENT_NAME))

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
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
            await q.put(events.agent_thinking(AGENT_ID, text))

    chosen = _parse_route(routing_text, scenario)
    await q.put(events.orchestrator_routing(AGENT_ID, routing_text, chosen))

    # No route → emit a clean "no_route" result and finish (synthesis is skipped)
    if not chosen:
        await q.put(events.final_recommendation(AGENT_ID, {
            "summary": routing_text.strip(),
            "specialist_recommendation": {},
            "all_specialist_outputs": [],
            "scenario": scenario,
            "no_route": True,
        }))
        await q.put(events.agent_completed(AGENT_ID, {}))
        await q.put(events.stream_done())

    return {"routing_text": routing_text, "chosen_agents": chosen}


# ── Conditional edge: which specialist nodes run (in parallel) ─────────────
def route_decider(state: BakeState):
    chosen = state["chosen_agents"]
    if not chosen:
        return END
    nodes = [_AGENT_TO_NODE[a] for a in chosen if a in _AGENT_TO_NODE]
    return nodes or END   # returning a LIST → LangGraph runs them in parallel


# ── Nodes 2-4: specialists (reuse existing agents, capture their output) ──
def _make_specialist_node(agent_id: str, runner):
    async def node(state: BakeState, config) -> dict:
        q = _queue(config)
        scenario = state["scenario"]
        factory_state = state["factory_state"]

        if agent_id == "recipe_chemist" and state.get("image_b64"):
            gen = runner(scenario, factory_state,
                         state["image_b64"], state["image_media_type"])
        else:
            gen = runner(scenario, factory_state)

        captured: dict = {}
        async for chunk in gen:
            await q.put(chunk)                      # forward SSE to the client
            try:
                payload = json.loads(chunk.removeprefix("data: ").strip())
                if (payload.get("event_type") == "agent_completed"
                        and payload.get("agent_id") != AGENT_ID):
                    captured = payload.get("data", {})
            except Exception:
                pass

        # IMPORTANT: only return the reduced key (parallel-safe)
        return {"specialist_outputs": [captured] if captured else []}
    return node


# ── Node 5: synthesis (+ Telegram) ─────────────────────────────────────────
async def synthesis_node(state: BakeState, config) -> dict:
    q = _queue(config)
    scenario = state["scenario"]
    specialist_outputs = state["specialist_outputs"]
    t0 = state["t0"]

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    synthesis_context = json.dumps(specialist_outputs, indent=2)
    synthesis_message = (
        f"ORIGINAL SCENARIO: {scenario}\n\n"
        f"SPECIALIST ANALYSES:\n{synthesis_context}\n\n"
        "Write a 2-3 sentence executive summary for plant management. "
        "Include the most important number (cost saved, failure window, or cost delta) "
        "and the action to take."
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
            await q.put(events.agent_thinking(AGENT_ID, text))

    raw_output = specialist_outputs[0] if specialist_outputs else {}
    inner = raw_output.get("output", raw_output)
    primary_rec = inner.get("recommendation", inner)

    final_rec = {
        "summary": synthesis_text,
        "specialist_recommendation": primary_rec,
        "all_specialist_outputs": specialist_outputs,
        "scenario": scenario,
    }
    await q.put(events.final_recommendation(AGENT_ID, final_rec))
    await q.put(events.agent_completed(AGENT_ID, {"final_recommendation": final_rec}))

    # ── Telegram (same logic as the original orchestrator) ────────────────
    elapsed = int(time.monotonic() - t0)
    try:
        from services.telegram import send_alert, _is_configured
        if _is_configured():
            sr = primary_rec
            cost_action_val = sr.get("cost_of_action_usd") or sr.get("estimated_cost_impact_usd")
            cost_inaction_val = sr.get("cost_of_inaction_usd") or sr.get("estimated_cost_of_inaction_usd")
            cost_action_str = f"${int(cost_action_val):,}" if isinstance(cost_action_val, (int, float)) else "N/A"
            cost_inaction_str = f"${int(cost_inaction_val):,}" if isinstance(cost_inaction_val, (int, float)) else "N/A"
            diagnosis_text = sr.get("diagnosis") or sr.get("disruption_summary") or synthesis_text.strip()
            action_text = sr.get("recommended_action") or synthesis_text.strip()
            delivered = await send_alert(
                scenario_title=_infer_title(scenario),
                diagnosis=str(diagnosis_text),
                recommended_action=str(action_text),
                cost_of_action=cost_action_str,
                cost_of_inaction=cost_inaction_str,
                confidence=float(sr.get("confidence", 0.85)),
                response_time_seconds=elapsed,
            )
            if delivered:
                await q.put(events.alert_sent(AGENT_ID, {
                    "channel": "telegram",
                    "status": "delivered",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }))
    except Exception as exc:
        print(f"[orchestrator_graph] Telegram step error (non-fatal): {exc}")

    await q.put(events.stream_done())
    return {"synthesis_text": synthesis_text}


# ── Build & compile the graph once ─────────────────────────────────────────
def _build_graph():
    g = StateGraph(BakeState)
    g.add_node("router", router_node)
    g.add_node("maintenance_node", _make_specialist_node("maintenance_prophet", maintenance_prophet.run))
    g.add_node("supply_node", _make_specialist_node("supply_sentinel", supply_sentinel.run))
    g.add_node("recipe_node", _make_specialist_node("recipe_chemist", recipe_chemist.run))
    g.add_node("synthesis", synthesis_node)

    g.add_edge(START, "router")
    g.add_conditional_edges(
        "router",
        route_decider,
        ["maintenance_node", "supply_node", "recipe_node", END],
    )
    g.add_edge("maintenance_node", "synthesis")
    g.add_edge("supply_node", "synthesis")
    g.add_edge("recipe_node", "synthesis")
    g.add_edge("synthesis", END)
    return g.compile()


_GRAPH = _build_graph()


# ── Public interface: identical signature to the original orchestrator.run ─
async def run(
    scenario: str,
    factory_state: dict,
    image_b64: str = "",
    image_media_type: str = "image/jpeg",
    _start_time: float | None = None,
) -> AsyncGenerator[str, None]:
    t0 = _start_time or time.monotonic()
    queue: asyncio.Queue = asyncio.Queue()

    initial_state: Dict[str, Any] = {
        "scenario": scenario,
        "factory_state": factory_state,
        "image_b64": image_b64,
        "image_media_type": image_media_type,
        "routing_text": "",
        "chosen_agents": [],
        "specialist_outputs": [],
        "synthesis_text": "",
        "t0": t0,
    }
    config = {"configurable": {"queue": queue}}

    async def _drive():
        try:
            await _GRAPH.ainvoke(initial_state, config=config)
        except Exception as e:  # surface, then unblock the drainer
            try:
                await queue.put(events.agent_thinking(AGENT_ID, f"[graph error] {e}"))
                await queue.put(events.stream_done())
            except Exception:
                pass
        finally:
            await queue.put(None)   # sentinel: tells the drainer we're done

    task = asyncio.create_task(_drive())
    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
    finally:
        await task
