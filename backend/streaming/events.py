import json
from datetime import datetime, timezone
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_event(event_type: str, agent_id: str, data: dict[str, Any]) -> dict:
    return {
        "event_type": event_type,
        "agent_id": agent_id,
        "timestamp": _now(),
        "data": data,
    }


def agent_started(agent_id: str, name: str) -> str:
    return _sse(make_event("agent_started", agent_id, {"name": name}))


def agent_thinking(agent_id: str, token: str) -> str:
    return _sse(make_event("agent_thinking", agent_id, {"token": token}))


def agent_tool_call(agent_id: str, tool: str, args: dict) -> str:
    return _sse(make_event("agent_tool_call", agent_id, {"tool": tool, "args": args}))


def agent_tool_result(agent_id: str, tool: str, result: Any) -> str:
    return _sse(make_event("agent_tool_result", agent_id, {"tool": tool, "result": result}))


def agent_completed(agent_id: str, output: dict) -> str:
    return _sse(make_event("agent_completed", agent_id, {"output": output}))


def orchestrator_routing(agent_id: str, decision: str, specialists: list[str]) -> str:
    return _sse(make_event("orchestrator_routing", agent_id, {"decision": decision, "specialists": specialists}))


def final_recommendation(agent_id: str, recommendation: dict) -> str:
    return _sse(make_event("final_recommendation", agent_id, {"recommendation": recommendation}))


def stream_done() -> str:
    return _sse({"event_type": "stream_done"})


# ── Telegram delivery confirmation ─────────────────────────────────────────────
def alert_sent(agent_id: str, data: dict) -> str:
    return _sse(make_event("alert_sent", agent_id, data))


# ── Webcam / label-scan events ─────────────────────────────────────────────────
def label_scan_started(agent_id: str, data: dict) -> str:
    return _sse(make_event("label_scan_started", agent_id, data))


def label_scan_result(agent_id: str, data: dict) -> str:
    return _sse(make_event("label_scan_result", agent_id, data))


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"
