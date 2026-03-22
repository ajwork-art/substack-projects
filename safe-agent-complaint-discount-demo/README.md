# Safe Agent Complaint Discount Demo

A minimal, runnable example of safer agent design for customer complaint handling.
Built as a companion to the **Safe Agents** article on Substack.

**Author:** Anitha Jagadeesh
**Follow for more:** [Enterprise Data AI Realities on Substack](https://enterprisedataairealities.substack.com/)

---

## What This Demonstrates

A customer reports a damaged product. An AI agent pipeline processes the complaint and proposes a discount — but never takes final action on its own.

This is the core idea: **the AI recommends, humans (or explicit config) approve, deterministic code enforces.**

---

## Setup & Running

### Prerequisites

- Python 3.10+
- An [Anthropic API key](https://console.anthropic.com/)

### Step 1 — Clone and create a virtual environment

```bash
git clone <repo-url>
cd safe-agent-complaint-discount-demo

python -m venv .venv
source .venv/bin/activate      # macOS/Linux
# .venv\Scripts\activate       # Windows
```

### Step 2 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 3 — Configure your environment

```bash
cp .env.example .env
```

Open `.env` and set your API key:

```
ANTHROPIC_API_KEY=sk-ant-...
MODEL_NAME=claude-sonnet-4-6
MAX_TOKENS=800
TEMPERATURE=0

APPROVAL_MODE=manual
MAX_DISCOUNT_PCT=20
MAX_ORDER_AGE_DAYS=30
ALLOW_DELETE=false
ALLOW_UPDATE_DISCOUNT_DRAFT=true
ALLOW_FINALIZE_DISCOUNT=false
```

### Step 4a — Run the CLI demo

```bash
python main.py
```

You'll see the full pipeline output: triage → discount decision → draft creation, all printed as JSON.

### Step 4b — Run the Streamlit UI

```bash
streamlit run streamlit_app.py   # minimal UI (original)
streamlit run app.py             # richer UI with metrics and approval flow
```

Enter an order ID (`ORD-1001`) and a customer message, then click **Run agent flow** to watch the pipeline execute live.

---

## Project Structure

```
safe-agent-complaint-discount-demo/
│
├── main.py               # CLI entry point — runs the full pipeline end-to-end
├── app.py                # Streamlit UI with metrics, approval flow, and draft display
├── streamlit_app.py      # Minimal Streamlit UI (original)
│
├── orchestrator.py       # The 3-step agent pipeline: triage → decision → draft
├── models.py             # Pydantic schemas: ComplaintInput, TriageOutput, DiscountDecision
├── prompts.py            # System prompts for the triage and discount agents
├── tools.py              # All data access and write functions (orders, products, discounts)
├── config.py             # Loads environment variables from .env
│
├── data/
│   ├── orders.json       # Sample order: ORD-1001 (KitchenPro Blender, $120)
│   ├── products.json     # Sample product: PRD-200 (discount-eligible)
│   └── discounts.json    # Written to by the agent when a draft is created
│
├── docs/
│   └── WHAT_THIS_DOES_NOT_SHOW.md   # Honest list of what's missing for production
│
├── requirements.txt
├── .env.example
└── README.md
```

---

## How the Pipeline Works

### Step 1 — Triage Agent (`orchestrator.py → triage()`)

The model reads the complaint and order data, then returns structured JSON:

| Field | Values |
|---|---|
| `issue_type` | `damaged`, `late_delivery`, `wrong_item`, `other` |
| `severity` | `low`, `medium`, `high` |
| `customer_sentiment` | `calm`, `frustrated`, `angry` |
| `recommended_action` | `apology_only`, `discount`, `escalate` |
| `summary` | Short factual description |

The triage agent is **explicitly prohibited** from approving refunds or inventing facts about the order.

### Step 2 — Discount Decision Agent (`orchestrator.py → decide_discount()`)

The model reviews the triage output and proposes a discount. Its output is then run through **deterministic policy checks in code** — the model's recommendation can be overridden:

| Policy Check | What happens if violated |
|---|---|
| Discount > `MAX_DISCOUNT_PCT` | Blocked, discount set to 0 |
| Issue type not in eligible list | Blocked |
| Order older than `MAX_ORDER_AGE_DAYS` | Blocked |
| Product not discount-eligible | Blocked |

Any block sets `requires_human_approval = True`.

### Step 3 — Draft Creation (`tools.py → create_discount_draft()`)

If the decision allows a discount, a record is written to `data/discounts.json` with `status: "draft"` — never `"final"`. Finalizing requires `ALLOW_FINALIZE_DISCOUNT=true` in `.env` (off by default).

---

## Key Safety Patterns to Study

| Pattern | Where to look |
|---|---|
| Draft-only writes | `tools.py → create_discount_draft()` |
| Finalization gated by config | `tools.py → finalize_discount()` + `.env` |
| Scoped permission flags | `config.py` — `ALLOW_DELETE`, `ALLOW_UPDATE_DISCOUNT_DRAFT`, `ALLOW_FINALIZE_DISCOUNT` |
| Policy enforcement outside the model | `orchestrator.py → decide_discount()` — the if/elif blocks after `json.loads()` |
| Deterministic outputs | `TEMPERATURE=0` in `.env` |
| Structured outputs | `models.py` — Pydantic enforces schema on every LLM response |
| Constrained prompts | `prompts.py` — explicit prohibitions in both system prompts |

---

## Sample Data

**Order `ORD-1001`**
- Customer: `CUST-901`
- Product: KitchenPro Blender (`PRD-200`) — $120, discount-eligible
- Purchase date: `2026-03-01`
- Status: `delivered`

Try changing the `purchase_date` in `data/orders.json` to a date older than 30 days to see the policy guard block the discount.

Try setting `"discount_eligible": false` in `data/products.json` to see that block fire.

---

## Explore and Learn: Suggested Experiments

1. **Change the complaint message** in `main.py` or the UI — try `"wrong item delivered"` vs `"arrived damaged"` and compare triage output.

2. **Trigger a policy block** — set `MAX_DISCOUNT_PCT=5` in `.env` and watch the code override the model's higher recommendation.

3. **Change a prompt** — open `prompts.py` and relax or tighten a constraint. Observe how the model's behavior shifts.

4. **Enable finalization** — set `ALLOW_FINALIZE_DISCOUNT=true` in `.env`, run the Streamlit app, and approve a discount through the UI.

5. **Add a new order** — add a second entry to `data/orders.json` and `data/products.json`, then test it with a different order ID.

6. **Read the policy guard** — find the `if/elif` block in `orchestrator.py → decide_discount()`. This is the heart of the safety pattern: business rules as code, not instructions.

---

## What This Demo Does Not Show

This repo is deliberately small. It is good for workshops and learning — not production.

Missing on purpose:
- Real IAM and workload identity
- Secret manager or vault integration
- Approval UI
- Production-grade transaction handling
- Idempotency controls across distributed systems
- Observability and SIEM export
- Policy-as-code
- Red-team harnesses
- Multi-agent governance at scale

These are not edge concerns. They are the controls that turn a safe demo into a production-safe system.

See `docs/WHAT_THIS_DOES_NOT_SHOW.md` for more detail.

---

## License and Terms

Copyright (c) 2026 Anitha Jagadeesh. All rights reserved.

This project and all associated code, documentation, and materials are the intellectual property of the author.

- **Personal and educational use:** You may clone, run, and study this code for personal learning and non-commercial purposes.
- **Attribution required:** Any reuse, adaptation, or reference to this work — in articles, talks, courses, or other projects — must credit the original author: Anitha Jagadeesh, [Enterprise Data AI Realities](https://enterprisedataairealities.substack.com/).
- **No commercial use without permission:** You may not use this code or its structure as the basis for a commercial product or service without explicit written permission from the author.
- **No redistribution without attribution:** You may not republish or redistribute this code, in whole or in part, without clearly crediting the original source.

For permissions beyond the scope above, contact the author via [Substack](https://enterprisedataairealities.substack.com/).

> This code is provided as-is for educational purposes. The author makes no warranties regarding fitness for production use.
