import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import ALLOW_FINALIZE_DISCOUNT, ALLOW_UPDATE_DISCOUNT_DRAFT, MAX_DISCOUNT_PCT, MAX_ORDER_AGE_DAYS

DATA_DIR = Path("data")

def _load_json(filename: str) -> List[Dict[str, Any]]:
    with open(DATA_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_json(filename: str, data: List[Dict[str, Any]]) -> None:
    with open(DATA_DIR / filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def get_order(order_id: str) -> Optional[Dict[str, Any]]:
    return next((o for o in _load_json("orders.json") if o["order_id"] == order_id), None)

def get_product(product_id: str) -> Optional[Dict[str, Any]]:
    return next((p for p in _load_json("products.json") if p["product_id"] == product_id), None)

def get_discount_policy() -> Dict[str, Any]:
    return {
        "max_discount_pct": MAX_DISCOUNT_PCT,
        "max_order_age_days": MAX_ORDER_AGE_DAYS,
        "eligible_issue_types": ["damaged", "late_delivery", "wrong_item"],
        "draft_only_default": True,
    }

def order_is_within_policy_window(purchase_date: str) -> bool:
    purchased = datetime.strptime(purchase_date, "%Y-%m-%d")
    age_days = (datetime.now() - purchased).days
    return age_days <= MAX_ORDER_AGE_DAYS

def create_discount_draft(order_id: str, discount_pct: int, reason: str) -> Dict[str, Any]:
    if not ALLOW_UPDATE_DISCOUNT_DRAFT:
        raise PermissionError("Draft discount creation is disabled.")
    if discount_pct > MAX_DISCOUNT_PCT:
        raise ValueError(f"Discount exceeds max allowed percentage: {MAX_DISCOUNT_PCT}")
    discounts = _load_json("discounts.json")
    record = {"order_id": order_id, "discount_pct": discount_pct, "status": "draft", "reason": reason}
    discounts.append(record)
    _save_json("discounts.json", discounts)
    return record

def finalize_discount(order_id: str) -> Dict[str, Any]:
    if not ALLOW_FINALIZE_DISCOUNT:
        raise PermissionError("Finalizing discounts is disabled by configuration.")
    discounts = _load_json("discounts.json")
    for row in discounts:
        if row["order_id"] == order_id and row["status"] == "draft":
            row["status"] = "final"
            _save_json("discounts.json", discounts)
            return row
    raise ValueError("No draft discount found to finalize.")
