from __future__ import annotations

from typing import Any, Dict
from src.storage import read_json, write_json


def get_account_balance(account_id: str) -> Dict[str, Any]:
    accounts = read_json("accounts.json")
    account = next((a for a in accounts if a["account_id"] == account_id), None)
    if account is None:
        raise ValueError(f"Account not found: {account_id}")
    return {
        "account_id": account["account_id"],
        "customer_id": account["customer_id"],
        "name": account["name"],
        "balance": account["balance"],
        "fee_status": account["fee_status"],
    }


def summarize_transactions(account_id: str) -> Dict[str, Any]:
    transactions = read_json("transactions.json")
    rows = transactions.get(account_id, [])
    return {
        "account_id": account_id,
        "transaction_count": len(rows),
        "transactions": rows,
    }


def summarize_case(case_id: str) -> Dict[str, Any]:
    cases = read_json("cases.json")
    case = next((c for c in cases if c["case_id"] == case_id), None)
    if case is None:
        raise ValueError(f"Case not found: {case_id}")
    return {
        "case_id": case["case_id"],
        "account_id": case["account_id"],
        "summary": f"{case['subject']}. {case['body']}",
    }


def update_mailing_address(account_id: str, new_address: str, requested_by: str, approved_by: str) -> Dict[str, Any]:
    accounts = read_json("accounts.json")
    for account in accounts:
        if account["account_id"] == account_id:
            old = account["mailing_address"]
            account["mailing_address"] = new_address
            write_json("accounts.json", accounts)
            return {
                "account_id": account_id,
                "old_address": old,
                "new_address": new_address,
                "requested_by": requested_by,
                "approved_by": approved_by,
            }
    raise ValueError("Unknown account_id")


def request_fee_reversal(account_id: str, requested_by: str, approved_by: str) -> Dict[str, Any]:
    accounts = read_json("accounts.json")
    for account in accounts:
        if account["account_id"] == account_id:
            account["fee_status"] = "overdraft_fee_reversed"
            write_json("accounts.json", accounts)
            return {
                "account_id": account_id,
                "fee_status": account["fee_status"],
                "requested_by": requested_by,
                "approved_by": approved_by,
            }
    raise ValueError("Unknown account_id")
