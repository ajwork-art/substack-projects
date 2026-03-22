from models import ComplaintInput
from orchestrator import SafeComplaintAgentFramework

framework = SafeComplaintAgentFramework()

complaint = ComplaintInput(
    order_id="ORD-1001",
    customer_message="The blender arrived with a cracked jar and I am very frustrated. I needed it this week. This is disappointing and I may not order again."
)

triage = framework.triage(complaint)
decision = framework.decide_discount(triage)
draft = framework.execute_discount_draft(decision)

print("\n--- TRIAGE ---")
print(triage.model_dump_json(indent=2))
print("\n--- DECISION ---")
print(decision.model_dump_json(indent=2))
print("\n--- DRAFT CREATED ---")
print(draft)
