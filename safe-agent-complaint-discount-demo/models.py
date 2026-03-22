from typing import Literal
from pydantic import BaseModel, Field

class ComplaintInput(BaseModel):
    order_id: str
    customer_message: str

class TriageOutput(BaseModel):
    order_id: str
    issue_type: Literal["damaged", "late_delivery", "wrong_item", "other"]
    severity: Literal["low", "medium", "high"]
    customer_sentiment: Literal["calm", "frustrated", "angry"]
    recommended_action: Literal["apology_only", "discount", "escalate"]
    summary: str

class DiscountDecision(BaseModel):
    order_id: str
    allow_discount: bool
    discount_pct: int = Field(ge=0, le=100)
    reason: str
    requires_human_approval: bool
