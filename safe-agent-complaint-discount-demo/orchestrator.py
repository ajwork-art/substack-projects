import json
from anthropic import Anthropic

from config import ANTHROPIC_API_KEY, MODEL_NAME, MAX_TOKENS, TEMPERATURE
from models import ComplaintInput, TriageOutput, DiscountDecision
from prompts import TRIAGE_SYSTEM_PROMPT, DISCOUNT_SYSTEM_PROMPT
from tools import get_order, get_product, get_discount_policy, order_is_within_policy_window, create_discount_draft

class SafeComplaintAgentFramework:
    def __init__(self) -> None:
        self.client = Anthropic(api_key=ANTHROPIC_API_KEY)

    def _call_model(self, system_prompt: str, user_payload: dict) -> str:
        response = self.client.messages.create(
            model=MODEL_NAME,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            system=system_prompt,
            messages=[{"role": "user", "content": json.dumps(user_payload)}],
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0].strip()
        return text

    def triage(self, complaint: ComplaintInput) -> TriageOutput:
        order = get_order(complaint.order_id)
        if not order:
            raise ValueError("Order not found.")
        product = get_product(order["product_id"])
        raw = self._call_model(TRIAGE_SYSTEM_PROMPT, {"complaint": complaint.model_dump(), "order": order, "product": product})
        return TriageOutput(**json.loads(raw))

    def decide_discount(self, triage: TriageOutput) -> DiscountDecision:
        order = get_order(triage.order_id)
        if not order:
            raise ValueError("Order not found.")
        product = get_product(order["product_id"])
        policy = get_discount_policy()
        raw = self._call_model(DISCOUNT_SYSTEM_PROMPT, {"triage": triage.model_dump(), "order": order, "product": product, "policy": policy})
        decision = DiscountDecision(**json.loads(raw))

        if decision.discount_pct > policy["max_discount_pct"]:
            decision.allow_discount = False
            decision.discount_pct = 0
            decision.reason = "Blocked: proposed discount exceeded policy limit."
            decision.requires_human_approval = True
        if triage.issue_type not in policy["eligible_issue_types"]:
            decision.allow_discount = False
            decision.discount_pct = 0
            decision.reason = "Blocked: complaint type is not discount eligible."
            decision.requires_human_approval = True
        if not order_is_within_policy_window(order["purchase_date"]):
            decision.allow_discount = False
            decision.discount_pct = 0
            decision.reason = "Blocked: order is outside allowed policy window."
            decision.requires_human_approval = True
        if not product["discount_eligible"]:
            decision.allow_discount = False
            decision.discount_pct = 0
            decision.reason = "Blocked: product is not discount eligible."
            decision.requires_human_approval = True
        return decision

    def execute_discount_draft(self, decision: DiscountDecision):
        if not decision.allow_discount or decision.discount_pct == 0:
            return None
        return create_discount_draft(decision.order_id, decision.discount_pct, decision.reason)
