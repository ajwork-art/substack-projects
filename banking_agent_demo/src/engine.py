from __future__ import annotations

from typing import Dict
from uuid import uuid4

from src.models import UserRequest, PendingApproval
from src.planner import generate_plan
from src.policy import evaluate_plan
from src.storage import read_json, write_json
from src import tools


def append_evidence(event_type: str, payload: Dict, evidence_id: str) -> None:
    evidence = read_json("evidence.json")
    evidence.append(
        {
            "evidence_id": evidence_id,
            "event_type": event_type,
            "payload": payload,
        }
    )
    write_json("evidence.json", evidence)


def run_request(user_request: UserRequest) -> Dict:
    evidence_id = f"ev_{uuid4().hex[:10]}"
    append_evidence("request_received", user_request.model_dump(), evidence_id)

    plan, planner_name = generate_plan(user_request.text)
    append_evidence("plan_generated", {"planner": planner_name, **plan.model_dump()}, evidence_id)

    decision = evaluate_plan(plan)
    append_evidence("policy_evaluated", decision.model_dump(), evidence_id)

    if not decision.allowed:
        return {
            "status": "blocked",
            "message": decision.reason,
            "evidence_id": evidence_id,
            "plan": plan.model_dump(),
            "policy": decision.model_dump(),
            "result": None,
            "approval_id": None,
        }

    if decision.approval_required:
        approval_id = f"apr_{uuid4().hex[:8]}"
        pending = PendingApproval(
            approval_id=approval_id,
            requested_by=user_request.user_id,
            intent=plan.intent,
            tool_name=decision.tool_name or "",
            payload=_build_payload(plan, user_request.user_id, approved_by=""),
            reason=decision.reason,
            evidence_id=evidence_id,
        )
        approvals = read_json("approvals.json")
        approvals.append(pending.model_dump())
        write_json("approvals.json", approvals)
        append_evidence("approval_required", {"approval_id": approval_id, "tool_name": pending.tool_name}, evidence_id)
        return {
            "status": "approval_required",
            "message": decision.reason,
            "evidence_id": evidence_id,
            "plan": plan.model_dump(),
            "policy": decision.model_dump(),
            "result": None,
            "approval_id": approval_id,
        }

    result = _execute_tool(decision.tool_name or "", _build_payload(plan, user_request.user_id, approved_by="system"))
    append_evidence("tool_executed", {"tool_name": decision.tool_name, "result": result}, evidence_id)
    return {
        "status": "completed",
        "message": "Action completed.",
        "evidence_id": evidence_id,
        "plan": plan.model_dump(),
        "policy": decision.model_dump(),
        "result": result,
        "approval_id": None,
    }


def approve_action(approval_id: str, approver: str) -> Dict:
    approvals = read_json("approvals.json")
    pending = next((a for a in approvals if a["approval_id"] == approval_id), None)
    if not pending:
        raise ValueError("Unknown approval ID")

    payload = dict(pending["payload"])
    payload["approved_by"] = approver
    result = _execute_tool(pending["tool_name"], payload)
    append_evidence("tool_executed_after_approval", {"tool_name": pending["tool_name"], "result": result}, pending["evidence_id"])

    remaining = [a for a in approvals if a["approval_id"] != approval_id]
    write_json("approvals.json", remaining)

    return {
        "status": "completed",
        "message": "Approved action completed.",
        "evidence_id": pending["evidence_id"],
        "tool_name": pending["tool_name"],
        "result": result,
    }


def _build_payload(plan, requested_by: str, approved_by: str) -> Dict:
    if plan.intent == "get_account_balance":
        return {"account_id": plan.account_id}
    if plan.intent == "summarize_transactions":
        return {"account_id": plan.account_id}
    if plan.intent == "summarize_case":
        return {"case_id": plan.case_id}
    if plan.intent == "update_mailing_address":
        return {
            "account_id": plan.account_id,
            "new_address": plan.arguments.get("new_address", ""),
            "requested_by": requested_by,
            "approved_by": approved_by,
        }
    if plan.intent == "request_fee_reversal":
        return {
            "account_id": plan.account_id,
            "requested_by": requested_by,
            "approved_by": approved_by,
        }
    return {}


def _execute_tool(tool_name: str, payload: Dict) -> Dict:
    if tool_name == "get_account_balance":
        return tools.get_account_balance(**payload)
    if tool_name == "summarize_transactions":
        return tools.summarize_transactions(**payload)
    if tool_name == "summarize_case":
        return tools.summarize_case(**payload)
    if tool_name == "update_mailing_address":
        return tools.update_mailing_address(**payload)
    if tool_name == "request_fee_reversal":
        return tools.request_fee_reversal(**payload)
    raise ValueError(f"Unknown tool: {tool_name}")
