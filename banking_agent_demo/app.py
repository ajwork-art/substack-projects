from __future__ import annotations

import logging
import streamlit as st

from src.engine import approve_action, run_request
from src.models import UserRequest
from src.storage import ensure_data_files, read_json, reset_data

ensure_data_files()

st.set_page_config(page_title="Banking Agent Demo", layout="wide")
st.title("Banking Agent Demo")
st.caption("Model proposes. Policy decides. Typed tools execute.")

with st.sidebar:
    st.subheader("Demo controls")
    if st.button("Reset demo data"):
        reset_data()
        st.success("Demo data reset.")
    st.markdown("**Mode**")
    st.write("Anthropic if API key is set. Mock mode otherwise.")

tab1, tab2, tab3, tab4 = st.tabs(["Run request", "Approvals", "Evidence", "Data"])

with tab1:
    st.subheader("Run request")
    user_id = st.text_input("User ID", value="maya01")
    prompt = st.text_area(
        "Request",
        value="Why do I have two grocery charges on account A100, and can you reverse the overdraft fee?",
        height=120,
    )
    if st.button("Run", type="primary"):
        try:
            result = run_request(UserRequest(user_id=user_id, text=prompt))
            st.session_state["last_result"] = result
        except ValueError as e:
            st.error(str(e))
        except Exception:
            logging.exception("run_request failed")
            st.error("An unexpected error occurred. Check the application logs.")

    if "last_result" in st.session_state:
        result = st.session_state["last_result"]
        st.write("### Status")
        st.json(
            {
                "status": result["status"],
                "message": result["message"],
                "evidence_id": result["evidence_id"],
                "approval_id": result["approval_id"],
            }
        )
        c1, c2, c3 = st.columns(3)
        with c1:
            st.write("### Plan")
            st.json(result["plan"])
        with c2:
            st.write("### Policy")
            st.json(result["policy"])
        with c3:
            st.write("### Result")
            st.json(result["result"])

with tab2:
    st.subheader("Pending approvals")
    approvals = read_json("approvals.json")
    if not approvals:
        st.info("No pending approvals.")
    else:
        for item in approvals:
            with st.expander(f"{item['approval_id']} — {item['tool_name']}"):
                st.json(item)
                approver = st.text_input(
                    f"Approver for {item['approval_id']}",
                    value="ops_manager_1",
                    key=item["approval_id"],
                )
                if st.button(f"Approve {item['approval_id']}"):
                    try:
                        result = approve_action(item["approval_id"], approver)
                        st.success("Approved.")
                        st.json(result)
                        st.rerun()
                    except ValueError as e:
                        st.error(str(e))
                    except Exception:
                        logging.exception("approve_action failed")
                        st.error("Approval failed. Check the application logs.")

with tab3:
    st.subheader("Evidence")
    evidence = read_json("evidence.json")
    if evidence:
        st.json(evidence)
    else:
        st.info("No evidence yet.")

with tab4:
    st.subheader("Local JSON records")
    c1, c2 = st.columns(2)
    with c1:
        st.write("### Accounts")
        st.json(read_json("accounts.json"))
        st.write("### Cases")
        st.json(read_json("cases.json"))
    with c2:
        st.write("### Transactions")
        st.json(read_json("transactions.json"))
        st.write("### Approvals")
        st.json(read_json("approvals.json"))
