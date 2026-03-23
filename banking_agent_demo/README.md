# Banking Agent Demo

A simple Streamlit demo that shows the control pattern behind **From APIs to Agents: What We Can Reuse — and What We Can’t**.

This demo is intentionally small.

It uses:
- Python 3.10+
- Anthropic Python SDK
- python-dotenv
- pydantic
- streamlit
- local JSON files as the system of record

The point is not production polish. The point is control.

The model proposes a plan.  
Policy decides what is allowed.  
Typed tools execute narrow actions.  
Writes stop for approval.  
Evidence is written every time.

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
