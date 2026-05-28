import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

ORCHESTRATOR_MODEL = "claude-opus-4-7"
SPECIALIST_MODEL = "claude-sonnet-4-6"

FACTORY_STATE_PATH = Path(__file__).parent / "data" / "factory_state.json"

# Telegram — optional; leave blank to disable alerts
TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID:   str = os.getenv("TELEGRAM_CHAT_ID",   "")
