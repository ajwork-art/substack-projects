import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME", "claude-3-5-sonnet-latest")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "800"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0"))

APPROVAL_MODE = os.getenv("APPROVAL_MODE", "manual").lower()
MAX_DISCOUNT_PCT = int(os.getenv("MAX_DISCOUNT_PCT", "20"))
MAX_ORDER_AGE_DAYS = int(os.getenv("MAX_ORDER_AGE_DAYS", "30"))

ALLOW_DELETE = os.getenv("ALLOW_DELETE", "false").lower() == "true"
ALLOW_UPDATE_DISCOUNT_DRAFT = os.getenv("ALLOW_UPDATE_DISCOUNT_DRAFT", "true").lower() == "true"
ALLOW_FINALIZE_DISCOUNT = os.getenv("ALLOW_FINALIZE_DISCOUNT", "false").lower() == "true"
REQUEST_TIMEOUT_SECONDS = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
