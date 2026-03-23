from __future__ import annotations

from src.models import Plan, PolicyDecision
from src.storage import read_json

INTENT_TO_TOOL = {
    "get_account_balance": "get_account_balance",
    "summarize_transactions": "summarize_transactions",
    "summarize_case": "summarize_case",
    "update_mailing_address": "update_mailing_address",
    "request_fee_reversal": "request_fee_reversal",
}


def _account_exists(account_id: str) -> bool:
    accounts = read_json("accounts.json")
    return any(a["account_id"] == account_id for a in accounts)


def _case_exists(case_id: str) -> bool:
    cases = read_json("cases.json")
    return any(c["case_id"] == case_id for c in cases)


def evaluate_plan(plan: Plan) -> PolicyDecision:
    if plan.intent == "unsupported":
        return PolicyDecision(
            allowed=False,
            approval_required=False,
            reason="The request is outside the approved tool set.",
            tool_name=None,
        )

    tool_name = INTENT_TO_TOOL.get(plan.intent)
    if not tool_name:
        return PolicyDecision(
            allowed=False,
            approval_required=False,
            reason="No mapped tool exists for this intent.",
            tool_name=None,
        )

    if plan.intent in {"get_account_balance", "summarize_transactions"}:
        if not plan.account_id or not _account_exists(plan.account_id):
            return PolicyDecision(
                allowed=False,
                approval_required=False,
                reason="Unknown account ID.",
                tool_name=tool_name,
            )
        return PolicyDecision(
            allowed=True,
            approval_required=False,
            reason="Read-only action allowed.",
            tool_name=tool_name,
        )

    if plan.intent == "summarize_case":
        if not plan.case_id or not _case_exists(plan.case_id):
            return PolicyDecision(
                allowed=False,
                approval_required=False,
                reason="Unknown case ID.",
                tool_name=tool_name,
            )
        return PolicyDecision(
            allowed=True,
            approval_required=False,
            reason="Read-only action allowed.",
            tool_name=tool_name,
        )

    if plan.intent == "update_mailing_address":
        if not plan.account_id or not _account_exists(plan.account_id):
            return PolicyDecision(
                allowed=False,
                approval_required=False,
                reason="Unknown account ID.",
                tool_name=tool_name,
            )
        if not plan.arguments.get("new_address"):
            return PolicyDecision(
                allowed=False,
                approval_required=False,
                reason="Missing new_address.",
                tool_name=tool_name,
            )
        return PolicyDecision(
            allowed=True,
            approval_required=True,
            reason="Address changes require human approval.",
            tool_name=tool_name,
        )

    if plan.intent == "request_fee_reversal":
        if not plan.account_id or not _account_exists(plan.account_id):
            return PolicyDecision(
                allowed=False,
                approval_required=False,
                reason="Unknown account ID.",
                tool_name=tool_name,
            )
        return PolicyDecision(
            allowed=True,
            approval_required=True,
            reason="Fee reversals require human approval.",
            tool_name=tool_name,
        )

    return PolicyDecision(
        allowed=False,
        approval_required=False,
        reason="Unhandled policy branch.",
        tool_name=tool_name,
    )
