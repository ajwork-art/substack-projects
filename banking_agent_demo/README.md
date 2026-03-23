# Banking Agent Demo

A minimal Streamlit demo showing a **controlled agent pattern** for consumer banking service workflows.

Companion to: *From APIs to Agents: What We Can Reuse — and What We Can't*

**Author:** Anitha Jagadeesh
**Follow for more:** [Enterprise Data AI Realities on Substack](https://substack.com/@anithaenterpriseai)

---

## Runnable example

Clone and run in under five minutes:

```bash
git clone <repo-url>
cd banking_agent_demo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add your Anthropic API key, or skip for mock mode
streamlit run app.py
```

Open the URL printed in the terminal. Type a request like:

```
What is the balance for account A100?
```

The planner returns a structured plan, the policy layer approves it, and the tool executes — all visible in the UI side by side. Try a write action next:

```
Reverse the overdraft fee for account A100
```

This time the policy layer queues it for approval. Go to the **Approvals** tab, enter an approver name, and click Approve. Check the **Evidence** tab to see the full audit trail.

No API key? The demo falls back to mock mode automatically and the full control flow still works.

---

## What this demo shows

Most agent demos focus on capability. This one focuses on **control**.

The core idea is a separation of concerns across four layers:

| Layer | Role |
|-------|------|
| **Planner** | LLM interprets the customer's intent and returns a structured plan |
| **Policy** | A rule-based layer decides what is allowed, what needs approval, and what is blocked — no LLM involved |
| **Tools** | Narrow, typed functions that do exactly one thing each |
| **Evidence** | Every step is logged before any action executes |

The model never executes anything directly. It proposes. The control layer decides.

---

## Architecture

```
User request
    │
    ▼
Planner (LLM)         ← interprets intent, extracts IDs, returns JSON plan
    │
    ▼
Policy engine         ← allows / requires approval / blocks based on rules
    │
    ├── blocked        → return reason, log evidence
    ├── approval needed → queue PendingApproval, log evidence
    └── allowed        → execute typed tool, log evidence
                                │
                                ▼
                          Tool (narrow action)
```

**Key design choices:**
- Read actions (balance, transactions, case lookup) execute immediately
- Write actions (address change, fee reversal) are gated behind human approval
- Every transition writes an evidence record — request received, plan generated, policy evaluated, tool executed
- The LLM output is validated through a Pydantic model before anything else runs

---

## Project structure

```
banking_agent_demo/
├── app.py                  # Streamlit UI — four tabs: Run, Approvals, Evidence, Data
├── requirements.txt
├── .env.example            # Copy to .env and add your API key
├── data/                   # Runtime JSON files (auto-created on first run)
│   ├── accounts.json
│   ├── transactions.json
│   ├── cases.json
│   ├── approvals.json      # Pending approval queue
│   └── evidence.json       # Append-only audit log
└── src/
    ├── models.py           # Pydantic models: UserRequest, Plan, PolicyDecision, PendingApproval
    ├── planner.py          # Calls Claude to produce a Plan; falls back to mock mode if no API key
    ├── policy.py           # Rule-based policy evaluation — no LLM
    ├── tools.py            # Typed tool functions (one action each)
    ├── engine.py           # Orchestration: plan → policy → tool → evidence
    └── storage.py          # JSON read/write helpers and default seed data
```

---

## Setup

**1. Clone and create a virtual environment**

```bash
git clone <repo-url>
cd banking_agent_demo
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**2. Configure your API key**

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-6
```

> **No API key?** The demo runs in mock mode automatically — the planner uses regex pattern matching instead of the LLM. You can explore the full control flow without any API access.

**3. Run**

```bash
streamlit run app.py
```

Streamlit will print the local URL in the terminal (typically http://localhost:8501).

---

## What to try

The demo ships with two accounts (`A100`, `A200`) and one support case (`CS3001`).

**Read actions — execute immediately:**

| Request | What happens |
|---------|-------------|
| `What is the balance for account A100?` | Plan: `get_account_balance` → allowed → executes |
| `Show me the transactions for account A200` | Plan: `summarize_transactions` → allowed → executes |
| `Summarize case CS3001` | Plan: `summarize_case` → allowed → executes |

**Write actions — require approval:**

| Request | What happens |
|---------|-------------|
| `Reverse the overdraft fee for account A100` | Plan: `request_fee_reversal` → approval required → queued |
| `Update the mailing address for A100 to 99 Oak Street, Austin, TX` | Plan: `update_mailing_address` → approval required → queued |

After submitting a write request, go to the **Approvals** tab, enter an approver name, and click Approve. The action executes and evidence is written.

**Blocked actions:**

Try any request that doesn't match a supported intent — transfers, account closures, broad data access. The policy layer blocks it and returns a reason.

---

## Tabs

- **Run request** — submit a request and see the plan, policy decision, and result side by side
- **Approvals** — review and approve queued write actions
- **Evidence** — append-only log of every event in the pipeline
- **Data** — live view of all JSON records; use the sidebar to reset demo data

---

## Key concepts to notice

**The LLM output is constrained by schema.** The planner is instructed to return one of six known intents. The response is parsed into a `Plan` Pydantic model. Invalid output fails fast before reaching the policy layer.

**Policy is code, not a prompt.** The `evaluate_plan` function in `policy.py` is a plain Python function. It checks account existence, validates required fields, and applies rules. There is no prompt engineering in the policy layer.

**Evidence is written before execution.** The `append_evidence` call in `engine.py` logs each transition as it happens — not after. If a tool raises an exception, the evidence up to that point is preserved.

**Mock mode shows the control structure without the LLM.** Remove your API key and the flow still works end to end. This makes the architecture legible independent of any model.

---

## License and Terms

Copyright (c) 2026 Anitha Jagadeesh. All rights reserved.

This project and all associated code, documentation, and materials are the intellectual property of the author.

**Personal and educational use:** You may clone, run, and study this code for personal learning and non-commercial purposes.

**Attribution required:** Any reuse, adaptation, or reference to this work — in articles, talks, courses, or other projects — must credit the original author: Anitha Jagadeesh, Enterprise Data AI Realities.

**No commercial use without permission:** You may not use this code or its structure as the basis for a commercial product or service without explicit written permission from the author.

**No redistribution without attribution:** You may not republish or redistribute this code, in whole or in part, without clearly crediting the original source.

For permissions beyond the scope above, contact the author via [Substack](https://substack.com/@anithaenterpriseai).

This code is provided as-is for educational purposes. The author makes no warranties regarding fitness for production use.
