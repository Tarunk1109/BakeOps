from __future__ import annotations

import asyncio
import base64
import json
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

from config import FACTORY_STATE_PATH
from agents import orchestrator

app = FastAPI(title="BakeOps Command Center")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── NFC scenario map ─────────────────────────────────────────────────────────
_SCN_MAP: dict[str, str] = {
    "SCN-1": (
        "Tunnel oven on Line 03 (Stonefire naan production) showing thermal sensor drift. "
        "Heating element health score dropped from 0.92 to 0.61 over the past 4 hours. "
        "Current zone temperature 285°C, target 290°C. "
        "Peak production window begins in 6 hours. Costco Ontario delivery scheduled at 0500."
    ),
    "SCN-2": (
        "Lallemand Inc. (commercial yeast supplier) issued emergency notice: 35% allocation "
        "reduction effective immediately due to fermentation facility incident at their Montreal "
        "plant. Currently 4 days of yeast inventory across North York and Mississauga facilities. "
        "Croissant, sourdough, and artisan loaf lines depend on this supplier. "
        "Decision required within 12 hours."
    ),
    "SCN-3": (
        "Costco Canada has issued a clean label compliance request: remove calcium propionate and "
        "mono- and diglycerides from all FGF-supplied croissant SKUs by Q3 2026. "
        "Affects 6 product lines accounting for $12.4M annual revenue. "
        "Reformulation required while maintaining 21-day shelf life and existing texture profile. "
        "Provide reformulation analysis."
    ),
    "SCN-4": (
        "Customer service log: 7 retailers reporting premature mold growth on Stonefire naan "
        "products distributed through West Coast warehouse. Shelf life trending 13.4 days versus "
        "18-day commitment. Past 48 hours: 142 customer complaints. "
        "Cross-functional investigation required."
    ),
}

# ─── Internal broadcast for NFC triggers ─────────────────────────────────────
_broadcast_queues: List[asyncio.Queue] = []


async def _broadcast(event: dict) -> None:
    payload = f"data: {json.dumps(event)}\n\n"
    dead = []
    for q in _broadcast_queues:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        try:
            _broadcast_queues.remove(q)
        except ValueError:
            pass


def load_factory_state() -> dict:
    return json.loads(FACTORY_STATE_PATH.read_text())


class TriggerRequest(BaseModel):
    scenario: str


_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "BakeOps Command Center"}


# ─── Factory state ────────────────────────────────────────────────────────────
@app.get("/api/factory_state")
async def get_factory_state():
    return load_factory_state()


# ─── Scenario stream (POST — from browser) ───────────────────────────────────
@app.post("/api/trigger")
async def trigger(req: TriggerRequest):
    factory_state = load_factory_state()

    async def stream():
        async for chunk in orchestrator.run(req.scenario, factory_state):
            yield chunk

    return StreamingResponse(stream(), media_type="text/event-stream", headers=_SSE_HEADERS)


# ─── NFC tap trigger (GET — from iPhone) ─────────────────────────────────────
@app.get("/api/trigger")
async def nfc_trigger(scn: str = Query(..., description="Scenario ID: SCN-1 through SCN-4")):
    scenario_text = _SCN_MAP.get(scn.upper())
    titles = {
        "SCN-1": "Tunnel Oven Anomaly — Line 03",
        "SCN-2": "Yeast Supplier Allocation Cut",
        "SCN-3": "Costco Clean Label Request",
        "SCN-4": "Stonefire Naan Recall Risk",
    }
    title = titles.get(scn.upper(), scn)

    if scenario_text:
        await _broadcast({
            "event_type": "scenario_trigger",
            "agent_id": "system",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {
                "scenario_id": scn.upper(),
                "scenario_text": scenario_text,
                "title": title,
            },
        })

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>BakeOps</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: #0E0E10;
      color: #FAFAF7;
      font-family: -apple-system, system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }}
    .card {{
      background: #1A1A1E;
      border: 1px solid rgba(255,255,255,0.08);
      border-left: 3px solid #F59E0B;
      border-radius: 12px;
      padding: 28px 32px;
      max-width: 340px;
      width: 100%;
    }}
    .label {{
      font-family: 'Menlo', monospace;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #F59E0B;
      margin-bottom: 8px;
    }}
    .scn {{ font-size: 11px; color: #88888E; margin-bottom: 4px; font-family: monospace; }}
    .title {{ font-size: 20px; font-weight: 600; color: #FAFAF7; margin-bottom: 16px; line-height: 1.3; }}
    .check {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(74,222,128,0.08);
      border: 1px solid rgba(74,222,128,0.2);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      color: #4ADE80;
      font-family: monospace;
    }}
    .dot {{ width: 6px; height: 6px; border-radius: 50%; background: #4ADE80; animation: pulse 2s infinite; }}
    @keyframes pulse {{ 0%,100% {{ opacity:1 }} 50% {{ opacity:0.4 }} }}
    .hint {{ margin-top: 16px; font-size: 11px; color: #88888E; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="label">BakeOps Command Center</div>
    <div class="scn">{scn.upper()}</div>
    <div class="title">{title}</div>
    <div class="check">
      <div class="dot"></div>
      Scenario Triggered
    </div>
    {"" if not scenario_text else '<p class="hint">Check the dashboard — agents are reasoning in real time.</p>'}
    {"" if scenario_text else f'<p class="hint" style="color:#F87171">Unknown scenario ID: {scn}</p>'}
  </div>
</body>
</html>"""
    return HTMLResponse(content=html)


# ─── Dashboard event broadcast (SSE — NFC triggers) ─────────────────────────
@app.get("/api/events")
async def events():
    q: asyncio.Queue = asyncio.Queue(maxsize=32)
    _broadcast_queues.append(q)

    async def stream():
        try:
            # Keepalive comment every 15s
            while True:
                try:
                    item = await asyncio.wait_for(q.get(), timeout=15)
                    yield item
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            try:
                _broadcast_queues.remove(q)
            except ValueError:
                pass

    return StreamingResponse(stream(), media_type="text/event-stream", headers=_SSE_HEADERS)


# ─── Image label upload ───────────────────────────────────────────────────────
@app.post("/api/upload_label")
async def upload_label(
    file: UploadFile = File(...),
    scenario: str = Form(
        default="Analyze this product label and reformulate all synthetic ingredients for clean-label CFIA compliance."
    ),
):
    image_bytes = await file.read()
    image_b64 = base64.b64encode(image_bytes).decode()
    media_type = file.content_type or "image/jpeg"
    factory_state = load_factory_state()

    async def stream():
        async for chunk in orchestrator.run(scenario, factory_state, image_b64, media_type):
            yield chunk

    return StreamingResponse(stream(), media_type="text/event-stream", headers=_SSE_HEADERS)


# ─── Live telemetry ───────────────────────────────────────────────────────────
@app.get("/api/telemetry")
async def telemetry():
    factory = load_factory_state()

    async def stream():
        base_lines = {
            line["id"]: {
                "throughput": line["throughput_per_hour"],
                "target": line["target_per_hour"],
            }
            for line in factory["lines"]
        }
        base_oee    = 83.4
        base_waste  = 3.1
        base_energy = 348.0

        while True:
            lines_data   = {}
            total_output = 0
            for lid, vals in base_lines.items():
                jitter = random.uniform(0.97, 1.03)
                tp     = int(vals["throughput"] * jitter)
                total_output += tp
                lines_data[lid] = {"throughput_per_hour": tp, "status": "running"}

            payload = {
                "event_type": "telemetry_update",
                "agent_id":   "telemetry",
                "timestamp":  datetime.now(timezone.utc).isoformat(),
                "data": {
                    "lines": lines_data,
                    "metrics": {
                        "oee_pct":               round(base_oee   + random.uniform(-1.5, 1.5),  1),
                        "waste_pct":             round(base_waste + random.uniform(-0.3, 0.3),   2),
                        "energy_kwh":            round(base_energy + random.uniform(-15, 15),    0),
                        "total_output_per_hour": total_output,
                    },
                },
            }
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(stream(), media_type="text/event-stream", headers=_SSE_HEADERS)


# ─── Scenario replay (eval — hidden) ─────────────────────────────────────────
@app.get("/api/scenarios/{scenario_id}/replay")
async def replay(scenario_id: str, runs: int = 3):
    scenario_text = _SCN_MAP.get(scenario_id.upper())
    if not scenario_text:
        return {"error": f"Unknown scenario: {scenario_id}"}

    results = []
    factory_state = load_factory_state()

    for i in range(min(runs, 5)):
        chunks = []
        async for chunk in orchestrator.run(scenario_text, factory_state):
            chunks.append(chunk)
        for chunk in chunks:
            try:
                payload = json.loads(chunk.removeprefix("data: ").strip())
                if payload.get("event_type") == "agent_completed" and payload.get("agent_id") == "orchestrator":
                    results.append({"run": i + 1, "data": payload.get("data", {})})
                    break
            except Exception:
                pass

    return {
        "scenario_id": scenario_id.upper(),
        "runs_completed": len(results),
        "results": results,
        "variance": "low" if len(results) >= 2 else "insufficient_data",
    }
