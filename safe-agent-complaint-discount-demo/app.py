import streamlit as st
from models import ComplaintInput
from orchestrator import SafeComplaintAgentFramework
from tools import finalize_discount
from config import ALLOW_FINALIZE_DISCOUNT

st.set_page_config(page_title="Safe Agent: Complaint & Discount Demo", layout="centered")
st.title("Safe Agent: Complaint & Discount Demo")
st.caption("AI-powered complaint triage with human-in-the-loop discount approval.")

framework = SafeComplaintAgentFramework()

with st.form("complaint_form"):
    order_id = st.text_input("Order ID", value="ORD-1001")
    customer_message = st.text_area(
        "Customer Message",
        value="The blender arrived with a cracked jar and I am very frustrated. I needed it this week.",
        height=120,
    )
    submitted = st.form_submit_button("Run Agent")

if submitted:
    if not order_id.strip() or not customer_message.strip():
        st.error("Please provide both an Order ID and a customer message.")
    else:
        complaint = ComplaintInput(order_id=order_id.strip(), customer_message=customer_message.strip())

        with st.spinner("Triaging complaint..."):
            try:
                triage = framework.triage(complaint)
            except ValueError as e:
                st.error(str(e))
                st.stop()

        st.subheader("Triage Result")
        col1, col2, col3 = st.columns(3)
        col1.metric("Issue Type", triage.issue_type)
        col2.metric("Severity", triage.severity)
        col3.metric("Sentiment", triage.customer_sentiment)
        st.info(f"**Summary:** {triage.summary}")
        st.write(f"**Recommended Action:** `{triage.recommended_action}`")

        with st.spinner("Evaluating discount..."):
            decision = framework.decide_discount(triage)

        st.subheader("Discount Decision")
        if decision.allow_discount:
            st.success(f"Discount approved: **{decision.discount_pct}%**")
        else:
            st.warning("No discount approved.")
        st.write(f"**Reason:** {decision.reason}")

        if decision.requires_human_approval:
            st.warning("This decision requires human approval before finalizing.")

        if decision.allow_discount and decision.discount_pct > 0:
            with st.spinner("Creating discount draft..."):
                draft = framework.execute_discount_draft(decision)
            if draft:
                st.subheader("Discount Draft Created")
                st.json(draft)

                if ALLOW_FINALIZE_DISCOUNT:
                    if not decision.requires_human_approval or st.checkbox("I approve this discount"):
                        if st.button("Finalize Discount"):
                            try:
                                result = finalize_discount(decision.order_id)
                                st.success("Discount finalized!")
                                st.json(result)
                            except Exception as e:
                                st.error(str(e))
                else:
                    st.info("Finalization is disabled. Set `ALLOW_FINALIZE_DISCOUNT=true` in `.env` to enable.")
