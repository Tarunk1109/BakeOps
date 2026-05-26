from __future__ import annotations

import asyncio
import base64
import json
import random
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import FACTORY_STATE_PATH
from agents import orchestrator

app = FastAPI(title="BakeOps Command Center")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_factory_state() -> dict:
    return json.loads(FACTORY_STATE_PATH.read_text())


class TriggerRequest(BaseModel):
    scenario: str


_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "BakeOps Command Center"}


@app.get("/api/factory_state")
async def get_factory_state():
    return load_factory_state()


@app.post("/api/trigger")
async def trigger(req: TriggerRequest):
    factory_state = load_factory_state()

    async def stream():
        async for chunk in orchestrator.run(req.scenario, factory_state):
            yield chunk

    return StreamingResponse(stream(), media_type="text/event-stream", headers=_SSE_HEADERS)


@app.post("/api/upload_label")
async def upload_label(
    file: UploadFile = File(...),
    scenario: str = Form(default="Analyze this product label and reformulate all synthetic ingredients for clean-label CFIA compliance."),
):
    image_bytes = await file.read()
    image_b64 = base64.b64encode(image_bytes).decode()
    media_type = file.content_type or "image/jpeg"
    factory_state = load_factory_state()

    async def stream():
        async for chunk in orchestrator.run(scenario, factory_state, image_b64, media_type):
            yield chunk

    return StreamingResponse(stream(), media_type="text/event-stream", headers=_SSE_HEADERS)


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
        base_oee = 83.4
        base_waste = 3.1
        base_energy = 348.0
        tick = 0

        while True:
            tick += 1
            lines_data = {}
            total_output = 0
            for lid, vals in base_lines.items():
                jitter = random.uniform(0.97, 1.03)
                tp = int(vals["throughput"] * jitter)
                total_output += tp
                lines_data[lid] = {"throughput_per_hour": tp, "status": "running"}

            oee = round(base_oee + random.uniform(-1.5, 1.5), 1)
            waste = round(base_waste + random.uniform(-0.3, 0.3), 2)
            energy = round(base_energy + random.uniform(-15, 15), 0)

            payload = {
                "event_type": "telemetry_update",
                "agent_id": "telemetry",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "lines": lines_data,
                    "metrics": {
                        "oee_pct": oee,
                        "waste_pct": waste,
                        "energy_kwh": energy,
                        "total_output_per_hour": total_output,
                    },
                },
            }
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(stream(), media_type="text/event-stream", headers=_SSE_HEADERS)
