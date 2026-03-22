import streamlit as st
from models import ComplaintInput
from orchestrator import SafeComplaintAgentFramework

st.set_page_config(page_title="Safe Agent Demo", layout="centered")
st.title("Safe Agent Complaint Discount Demo")

order_id = st.text_input("Order ID", value="ORD-1001")
message = st.text_area("Customer complaint", value="The blender arrived with a cracked jar and I am very frustrated. I needed it this week.", height=150)

if st.button("Run agent flow"):
    framework = SafeComplaintAgentFramework()
    complaint = ComplaintInput(order_id=order_id, customer_message=message)
    triage = framework.triage(complaint)
    decision = framework.decide_discount(triage)
    draft = framework.execute_discount_draft(decision)
    st.subheader("Triage")
    st.json(triage.model_dump())
    st.subheader("Decision")
    st.json(decision.model_dump())
    st.subheader("Draft created")
    st.json(draft)
