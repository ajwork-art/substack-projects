from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

DEFAULTS = {
    "accounts.json": [
        {
            "account_id": "A100",
            "customer_id": "U100",
            "name": "Maya Patel",
            "balance": 142.18,
            "mailing_address": "48 Camelback Road, Phoenix, AZ",
            "fee_status": "overdraft_fee_open",
        },
        {
            "account_id": "A200",
            "customer_id": "U200",
            "name": "Jordan Lee",
            "balance": 892.44,
            "mailing_address": "212 River Street, Tempe, AZ",
            "fee_status": "none",
        },
    ],
    "transactions.json": {
        "A100": [
            {"transaction_id": "TX9001", "merchant": "Valley Grocer", "amount": -54.22, "status": "posted"},
            {"transaction_id": "TX9002", "merchant": "Valley Grocer", "amount": -54.22, "status": "pending"},
            {"transaction_id": "TX9003", "merchant": "Monthly Salary", "amount": 1200.00, "status": "posted"},
        ],
        "A200": [
            {"transaction_id": "TX9101", "merchant": "City Transit", "amount": -24.10, "status": "posted"},
            {"transaction_id": "TX9102", "merchant": "North Market", "amount": -88.75, "status": "posted"},
        ],
    },
    "cases.json": [
        {
            "case_id": "CS3001",
            "account_id": "A100",
            "subject": "Duplicate card transaction and overdraft fee",
            "body": "Customer saw one posted grocery charge and one pending grocery charge and asked whether the overdraft fee can be reversed.",
        }
    ],
    "approvals.json": [],
    "evidence.json": [],
}


def ensure_data_files() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for filename, default_value in DEFAULTS.items():
        path = DATA_DIR / filename
        if not path.exists():
            write_json(filename, deepcopy(default_value))


def read_json(filename: str) -> Any:
    path = DATA_DIR / filename
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(filename: str, data: Any) -> None:
    path = DATA_DIR / filename
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def reset_data() -> None:
    for filename, default_value in DEFAULTS.items():
        write_json(filename, deepcopy(default_value))
