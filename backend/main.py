import json
from pathlib import Path

from fastapi import FastAPI
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

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
