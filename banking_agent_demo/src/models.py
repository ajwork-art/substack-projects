from __future__ import annotations

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


class UserRequest(BaseModel):
    user_id: str
    text: str


class Plan(BaseModel):
    intent: Literal[
        "get_account_balance",
        "summarize_transactions",
        "summarize_case",
        "update_mailing_address",
        "request_fee_reversal",
        "unsupported",
    ]
    account_id: Optional[str] = None
    case_id: Optional[str] = None
    arguments: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.0
    rationale: str = ""


class PolicyDecision(BaseModel):
    allowed: bool
    approval_required: bool
    reason: str
    tool_name: Optional[str] = None


class PendingApproval(BaseModel):
    approval_id: str
    requested_by: str
    intent: str
    tool_name: str
    payload: Dict[str, Any]
    reason: str
    evidence_id: str
