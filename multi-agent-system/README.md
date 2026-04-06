# Multi-Agent Banking Demo

Reference implementation of governed multi-agent workflows for enterprise banking systems.

## Core Concepts

### The Problem
Multi-agent systems fail at handoffs, not at models. When one agent hands off to another:
- State can expand in scope
- Identity can blur across agents
- Duplicate writes can happen through retries
- Governance can break at boundaries

### The Solution
This demo implements explicit handoff governance:
- **Handoff contracts** define what state, scope, and identity survive boundaries
- **Scope reduction** ensures downstream agents get equal or reduced access
- **Identity reissue** gives each agent its own workload identity
- **Idempotency keys** prevent duplicate writes across retries
- **Loop guards** limit handoff chains
- **Trace continuity** links all agents through one correlation ID

## Project Structure

```
multi-agent-banking-demo/
│
├── .env.example                          # API key and model config template
├── .gitignore
├── package.json
├── README.md
├── ARCHITECTURE.md                       # Design patterns, data flow, agent roles
│
├── src/
│   ├── agents/
│   │   ├── triage-agent.js              # Claude: classifies complaint, sets churn risk
│   │   ├── policy-specialist.js         # Claude: evaluates fee reversal eligibility
│   │   └── action-agent.js             # Claude: plans action, creates approval request
│   │
│   ├── governance/
│   │   ├── handoff-contract.js          # Defines and validates agent boundaries
│   │   ├── scope-reducer.js             # Enforces least-privilege at each handoff
│   │   ├── identity-manager.js          # Issues scoped identity per agent (1hr TTL)
│   │   └── trace-linker.js             # Links parent/child runs via correlation ID
│   │
│   ├── memory/
│   │   ├── memory-segmentation.js       # Separates working / scratchpad / policy / evidence
│   │   ├── state-model.js               # State category helper
│   │   └── memory-expiry.js            # Expires scratchpad after TTL
│   │
│   ├── safety/
│   │   ├── idempotency-keys.js          # Prevents duplicate writes across retries
│   │   ├── loop-guards.js               # Limits handoff depth, tokens, and time
│   │   └── scope-validator.js           # Revalidates scope at each boundary
│   │
│   ├── storage/
│   │   ├── json-store.js                # Local JSON read/write/append
│   │   └── evidence-store.js            # Appends to evidence and handoff logs
│   │
│   └── utils/
│       ├── correlation-id.js            # Generates trace IDs
│       └── logger.js                    # Structured logging with timestamps
│
├── demo/
│   ├── customer-case-123.json           # Sample: maya01 overdraft + duplicate charge
│   ├── customer-case-789.json           # Sample: jordan789 eight-year customer dispute
│   ├── full-flow.js                     # Core orchestrator: Triage → Policy → Action
│   ├── success-flow.js                  # Runs full LLM chain with customer-case-789
│   ├── retry-failure.js                 # Shows duplicate approval without idempotency
│   ├── retry-with-guards.js             # Shows idempotency blocking the duplicate
│   ├── retry-protected.js               # Runs LLM chain twice, shows guard in action
│   └── duplicate-action-test.js         # Explicit idempotency pass/fail test
│
├── data/                                # Runtime output (gitignored)
│   ├── approvals.json                   # Pending approval records
│   ├── evidence.json                    # Full audit trail per request
│   ├── handoffs.json                    # Handoff contract records
│   ├── cases.json
│   ├── accounts.json
│   └── transactions.json
│
├── test/
│   ├── run-all-tests.js                 # Test runner entry point
│   ├── handoff-contract.test.js         # Boundary validation tests
│   ├── scope-expansion.test.js          # Scope reduction enforcement tests
│   ├── scope-reduction.test.js          # Scope reduction allow-list tests
│   ├── duplicate-action.test.js         # Idempotency key tests
│   ├── trace-continuity.test.js         # Parent/child run linking tests
│   ├── identity-revalidation.test.js    # Identity reissue tests
│   ├── memory-segmentation.test.js      # Memory isolation tests
│   └── loop-guard.test.js               # Retry limit tests
│
├── scripts/
│   └── init-data.js                     # Initializes empty data/*.json files
│
└── workflows/
    ├── issue4-orchestration.json        # n8n workflow export
    └── approval-path.json               # n8n approval path export
```

## Does This Use an LLM?

**Yes.** All three agents use Claude via the Anthropic API with **tool use (function calling)** for reliable structured output.

| Agent | What Claude Does |
|---|---|
| TriageAgent | Reads the customer complaint, classifies the issue type, assesses churn risk, generates a case ID and summary |
| PolicySpecialist | Evaluates whether the case qualifies for fee reversal under bank policy, sets urgency, determines the proposed action |
| ActionAgent | Determines the precise action type and recommended amount, writes the approval request |

Each agent calls Claude with a system prompt that defines its role and constraints, and a tool schema that enforces structured output. The governance layer — handoff contracts, scope reduction, identity reissue, idempotency keys — wraps every LLM call and is not affected by what the model returns.

**Model:** `claude-haiku-4-5-20251001` by default (fast, low cost). Set `ANTHROPIC_MODEL=claude-sonnet-4-6` in `.env` for higher quality responses.

## Setup

### Requirements
- Node.js 14+
- npm or yarn

### Installation
```bash
git clone https://github.com/[org]/multi-agent-banking-demo.git
cd multi-agent-banking-demo
npm install
```

### Configure API Key
```bash
cp .env.example .env
```

Edit `.env` and set your Anthropic API key:
```
ANTHROPIC_API_KEY=your_key_here
```

Get a key at [console.anthropic.com](https://console.anthropic.com). The demo uses `claude-haiku-4-5-20251001` by default. Set `ANTHROPIC_MODEL=claude-sonnet-4-6` for richer reasoning output.

## Running the Demos

### Success Path
Shows the complete workflow: Triage → Policy → Action
```bash
npm run demo:success
```

Output: All handoffs validated, scope reduced, identities reissued, full trace recorded.

### Retry Failure (Before Safeguards)
Shows what breaks without idempotency keys and loop guards
```bash
npm run demo:retry-failure
```

Output: Duplicate fee reversal applied.

### Retry Protected (With Safeguards)
Shows the same scenario handled safely
```bash
npm run demo:retry-protected
```

Output: Retry prevented by idempotency key.

## Running Tests

### All Tests
```bash
npm test
```

### Individual Tests
```bash
npm run test:duplicate      # Idempotency key tests
npm run test:scope         # Scope reduction tests
npm run test:trace         # Trace continuity tests
npm run test:identity      # Identity reissue tests
npm run test:memory        # Memory segmentation tests
npm run test:loops         # Loop guard tests
npm run test:handoff       # Handoff contract tests
```

## Architecture

### Components

**Governance Layer**
- `HandoffContract`: Defines and validates handoff boundaries
- `ScopeReducer`: Enforces scope reduction across handoffs
- `IdentityManager`: Reissues identity per agent
- `TraceLinker`: Links parent and child runs

**Safety Layer**
- `IdempotencyManager`: Prevents duplicate writes
- `LoopGuard`: Limits handoff chains
- `ScopeValidator`: Revalidates scope at boundaries

**Memory Layer**
- `MemorySegmentation`: Separates working state, scratchpad, policy, and evidence
- `MemoryExpiry`: Expires stale state automatically

**Agents**
- `TriageAgent`: Classifies customer request, hands to specialist
- `PolicySpecialist`: Evaluates eligibility, hands to action agent
- `ActionAgent`: Creates approval request, does not execute writes

## Scenario: Customer Service Flow

Customer complaint: "I have duplicate charges and an overdraft fee. Can you reverse the fee?"

### Stage 1: Triage
- Agent: TriageAgent
- Action: Parse complaint, classify issue, assess churn risk
- Output: Typed handoff to policy specialist

### Stage 2: Policy
- Agent: PolicySpecialist
- Input: Constrained state from triage (case ID, issue type, churn risk)
- Action: Check fee policy, evaluate eligibility
- Output: Policy decision and typed handoff to action agent

### Stage 3: Action
- Agent: ActionAgent
- Input: Policy decision from specialist
- Action: Create approval request (no direct write)
- Output: Approval request ID pending human review

### Stage 4: Evidence
- Full trace recorded with correlation ID
- Evidence survives audit, incident, and architecture review

## Evaluation Checklist

After running the demo, verify:

- ✅ Handoff contracts validated at each boundary
- ✅ Scope reduced downstream (each agent gets what it needs, no more)
- ✅ Identity reissued per agent (no shared service accounts)
- ✅ Trace continuous (parent and child run IDs linked)
- ✅ Idempotency key prevents duplicate (same key across retries)
- ✅ Loop guards prevent infinite chains (max handoffs enforced)
- ✅ Memory segmented (working state ≠ evidence ≠ policy state)

## Web UI

A browser-based version of this demo is available alongside the terminal version. It lets you submit a customer complaint, watch the agent pipeline execute step by step, and inspect handoff contracts, scope reduction, and the final approval request — all in one view.

### Stack
- **Backend:** Express.js API server that wraps the existing agent chain
- **Frontend:** Single HTML page with vanilla JS — no build step, no framework
- **Transport:** REST endpoint that streams pipeline steps as JSON

### Running the Web Version

```bash
npm run web
```

Then open `http://localhost:3000` in your browser.

### What You See

```
┌─────────────────────────────────────────────────────┐
│  Customer Complaint                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │ I have duplicate charges and an overdraft   │    │
│  │ fee. I may switch banks.                    │    │
│  └─────────────────────────────────────────────┘    │
│  [ Run Pipeline ]                                    │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│  Stage 1: Triage Agent                    ✅ Done   │
│  Issue type:  duplicate-charge-overdraft             │
│  Churn risk:  high                                   │
│  Handoff scope: accountId, caseId,                  │
│                 issueType, churnRisk                 │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│  Stage 2: Policy Specialist               ✅ Done   │
│  Decision:  fee-reversal-eligible                    │
│  Approval required: yes                             │
│  Scope reduced: issueType, churnRisk dropped        │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│  Stage 3: Action Agent                    ✅ Done   │
│  Approval request ID: appr-1712345678               │
│  Status: pending_approval                           │
│  Idempotency key: A100::CS4001::fee-reversal        │
└─────────────────────────────────────────────────────┘
```

Each stage panel is expandable to show the full handoff contract JSON.

### Web UI Project Structure

```
web/
├── server.js          # Express server, wraps agent chain
├── public/
│   ├── index.html     # Single-page UI
│   ├── app.js         # Pipeline step rendering
│   └── styles.css     # Layout and stage styling
```

### To Add LLM-Powered Agents

The web version makes it straightforward to swap in real LLM agents. In `src/agents/`, replace the rule-based logic in any agent with a Claude API call. The governance layer — handoff contracts, scope reduction, idempotency keys — stays unchanged. The UI will reflect whatever the agent returns.

## Production Considerations

### NOT INCLUDED (by design)
- Real banking APIs or customer data
- Production IAM or secret manager
- Multi-region failover
- Full SIEM integration
- Policy-as-code engine

### To Deploy to Production
1. Replace JSON state with real databases
2. Integrate real banking APIs
3. Add authentication and encryption
4. Implement real policy engine
5. Connect to audit/compliance systems
6. Add monitoring and alerting

## Support

Questions or issues? This is a reference implementation.
Use it to understand the patterns, then adapt for your environment.

## License and Terms

Copyright (c) 2026 Anitha Jagadeesh. All rights reserved.

This project and all associated code, documentation, and materials are the intellectual property of the author.

**Personal and educational use:** You may clone, run, and study this code for personal learning and non-commercial purposes.

**Attribution required:** Any reuse, adaptation, or reference to this work — in articles, talks, courses, or other projects — must credit the original author: Anitha Jagadeesh, Enterprise Data AI Realities.

**No commercial use without permission:** You may not use this code or its structure as the basis for a commercial product or service without explicit written permission from the author.

**No redistribution without attribution:** You may not republish or redistribute this code, in whole or in part, without clearly crediting the original source.

For permissions beyond the scope above, contact the author via Substack.

This code is provided as-is for educational purposes. The author makes no warranties regarding fitness for production use.
