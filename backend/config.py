import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

ORCHESTRATOR_MODEL = "claude-opus-4-7-20251101"
SPECIALIST_MODEL = "claude-sonnet-4-6"

FACTORY_STATE_PATH = Path(__file__).parent / "data" / "factory_state.json"
