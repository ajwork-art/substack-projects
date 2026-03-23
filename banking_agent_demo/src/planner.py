from __future__ import annotations

import json
import os
import re
from typing import Optional

from anthropic import Anthropic
from dotenv import load_dotenv

from src.models import Plan

load_dotenv()

SYSTEM_PROMPT = """You are a strict planner for a consumer banking assistant.
Return JSON only.
Use one of these intents exactly:
- get_account_balance
- summarize_transactions
- summarize_case
- update_mailing_address
- request_fee_reversal
- unsupported

Extract account_id and case_id when present.
Never invent IDs.
If the request asks for funds movement, broad system access, or ambiguous action, return "unsupported".

JSON shape:
{
  "intent": "get_account_balance",
  "account_id": null,
  "case_id": null,
  "arguments": {},
  "confidence": 0.0,
  "rationale": ""
}
"""


def _extract(text: str, pattern: str) -> Optional[str]:
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(1) if m else None


def mock_plan(text: str) -> Plan:
    lower = text.lower()
    account_id = _extract(text, r"(A\d+)")
    case_id = _extract(text, r"(CS\d+)")

    if ("balance" in lower or "available" in lower) and account_id:
        return Plan(intent="get_account_balance", account_id=account_id, confidence=0.93, rationale="Detected balance request.")
    if ("transaction" in lower or "charges" in lower or "activity" in lower) and account_id:
        return Plan(intent="summarize_transactions", account_id=account_id, confidence=0.92, rationale="Detected transaction summary request.")
    if ("case" in lower or "ticket" in lower) and case_id:
        return Plan(intent="summarize_case", case_id=case_id, confidence=0.91, rationale="Detected case summary request.")
    if "address" in lower and account_id:
        m = re.search(r"to\s+(.+)$", text, re.IGNORECASE)
        new_address = m.group(1).strip() if m else ""
        new_address = new_address[:200]  # Prevent oversized payloads
        return Plan(
            intent="update_mailing_address",
            account_id=account_id,
            arguments={"new_address": new_address},
            confidence=0.88,
            rationale="Detected mailing address change request.",
        )
    if ("reverse the overdraft fee" in lower or "overdraft fee" in lower or "fee reversal" in lower) and account_id:
        return Plan(intent="request_fee_reversal", account_id=account_id, confidence=0.87, rationale="Detected fee reversal request.")
    return Plan(intent="unsupported", confidence=0.35, rationale="Unsupported or ambiguous request.")


def generate_plan(text: str) -> tuple[Plan, str]:
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

    if not api_key:
        return mock_plan(text), "mock"

    client = Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=model,
        max_tokens=300,
        temperature=0,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": text}],
    )
    raw_text = msg.content[0].text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```", 2)[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()
    parsed = json.loads(raw_text)
    return Plan(**parsed), model
