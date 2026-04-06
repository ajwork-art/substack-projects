# Architecture

Design patterns used in this reference implementation.

## Project Structure

```
multi-agent-banking-demo/
│
├── .env.example                          # API key and model config template
├── .gitignore
├── package.json
├── README.md
├── ARCHITECTURE.md                       # This file
│
├── src/
│   ├── agents/
│   │   ├── triage-agent.js              # Claude tool: classify_complaint
│   │   ├── policy-specialist.js         # Claude tool: evaluate_policy
│   │   └── action-agent.js             # Claude tool: create_action_plan
│   │
│   ├── governance/                       # Wraps every LLM call — unchanged by model
│   │   ├── handoff-contract.js          # Validates what crosses each boundary
│   │   ├── scope-reducer.js             # Enforces least-privilege
│   │   ├── identity-manager.js          # Issues scoped identity per agent
│   │   └── trace-linker.js             # Links runs via correlation ID
│   │
│   ├── memory/
│   │   ├── memory-segmentation.js       # Separates working / scratchpad / policy / evidence
│   │   ├── state-model.js
│   │   └── memory-expiry.js
│   │
│   ├── safety/
│   │   ├── idempotency-keys.js          # Prevents duplicate writes
│   │   ├── loop-guards.js               # Caps handoffs, tokens, and elapsed time
│   │   └── scope-validator.js
│   │
│   ├── storage/
│   │   ├── json-store.js
│   │   └── evidence-store.js
│   │
│   └── utils/
│       ├── correlation-id.js
│       └── logger.js
│
├── demo/
│   ├── customer-case-123.json           # maya01 — overdraft + duplicate charge
│   ├── customer-case-789.json           # jordan789 — eight-year customer dispute
│   ├── full-flow.js                     # Core orchestrator, exports runFullFlow()
│   ├── success-flow.js                  # npm run demo:success
│   ├── retry-failure.js                 # npm run demo:retry-fail (no guards)
│   ├── retry-with-guards.js             # npm run demo:retry-guard (isolated guard demo)
│   ├── retry-protected.js               # npm run demo:retry-protected (LLM chain + guards)
│   └── duplicate-action-test.js         # Explicit idempotency pass/fail
│
├── data/                                # Runtime output — gitignored, reset via npm run clean
│   ├── approvals.json
│   ├── evidence.json
│   ├── handoffs.json
│   ├── cases.json
│   ├── accounts.json
│   └── transactions.json
│
├── test/
│   ├── run-all-tests.js
│   ├── handoff-contract.test.js
│   ├── scope-expansion.test.js
│   ├── scope-reduction.test.js
│   ├── duplicate-action.test.js
│   ├── trace-continuity.test.js
│   ├── identity-revalidation.test.js
│   ├── memory-segmentation.test.js
│   └── loop-guard.test.js
│
├── scripts/
│   └── init-data.js                     # Creates empty data/*.json on clean
│
└── workflows/
    ├── issue4-orchestration.json        # n8n export
    └── approval-path.json
```

---

## Pattern 1: Handoff Contracts

Every agent boundary is an explicit contract, not an implicit pass-through.

**Problem:** Agents passing state to each other without validation allow scope creep. A downstream agent receives more context than it needs and may act on it.

**Solution:** `HandoffContract` defines source agent, destination agent, parent/child run IDs, allowed scope, and the actual context payload. Validated at the boundary before the downstream agent runs.

**File:** `src/governance/handoff-contract.js`

---

## Pattern 2: Scope Reduction

Each handoff reduces scope — downstream agents receive equal or less access than upstream agents.

**Problem:** Agents accumulate context across a chain. By the time an action agent runs, it may hold raw complaint text, internal notes, and churn scores that have no place in an approval request.

**Solution:** `ScopeReducer` applies an explicit allow list per destination agent. Only the fields on the list survive the boundary.

**File:** `src/governance/scope-reducer.js`

---

## Pattern 3: Identity Reissue

Each agent runs with its own workload identity. No shared service accounts across agents.

**Problem:** A shared identity means a compromised downstream agent inherits the full permissions of the upstream agent. A policy specialist should not have the same identity as a triage agent.

**Solution:** `IdentityManager` generates and issues a new identity per agent invocation. The identity does not carry over. It is scoped to the agent's role.

**File:** `src/governance/identity-manager.js`

---

## Pattern 4: Trace Continuity

All agents in a chain share a single correlation ID. Parent and child run IDs are linked.

**Problem:** Without trace continuity, incidents cannot be reconstructed. If an action was taken, you need to know which triage decision triggered which policy evaluation triggered that action.

**Solution:** `TraceLinker` generates a parent correlation ID at chain start. Each agent receives the parent run ID and generates its own child run ID. Both are recorded in the handoff contract and the evidence store.

**File:** `src/governance/trace-linker.js`

---

## Pattern 5: Idempotency Keys

Each action is keyed on account ID, case ID, and action type. Retries with the same key are rejected as duplicates.

**Problem:** Network failures, retries, and user resubmissions can produce duplicate writes. Without idempotency protection, a fee reversal can be applied twice.

**Solution:** `IdempotencyManager` generates a stable key from action parameters. Before writing, it checks whether the key has already been used. If yes, the action is rejected with status `duplicate`.

**File:** `src/safety/idempotency-keys.js`

---

## Pattern 6: Loop Guards

Handoff chains are limited to a maximum depth. Any chain exceeding the limit throws before executing.

**Problem:** Agents that hand off to other agents can form cycles or unbounded chains. Without a limit, a misconfigured workflow can loop indefinitely.

**Solution:** `LoopGuard` accepts a step count at chain entry. If the step count exceeds `MAX_HANDOFFS` (default: 5), it throws before any agent runs.

**File:** `src/safety/loop-guards.js`

---

## Pattern 7: Memory Segmentation

Agent memory is separated into four categories: working state, scratchpad, policy state, and evidence.

**Problem:** Mixing working state with policy state blurs the line between what an agent computed and what it was told. Mixing evidence with scratchpad makes audit trails unreliable.

**Solution:** `MemorySegmentation` enforces strict category separation. Each write requires a category. Reads from evidence are append-only. Scratchpad expires. Policy state is read-only after load.

**File:** `src/memory/memory-segmentation.js`

---

## Agent Roles

| Agent | LLM Tool | Input | Output | Writes |
|---|---|---|---|---|
| TriageAgent | `classify_complaint` | Raw customer complaint | Issue type, churn risk, case ID, summary | Evidence only |
| PolicySpecialist | `evaluate_policy` | Constrained triage context | Eligibility decision, proposed action, urgency | Evidence only |
| ActionAgent | `create_action_plan` | Constrained policy context | Action type, amount, notes | Approval record (pending human review) |

Each agent calls Claude with `tool_choice: { type: "tool", name: "..." }` to guarantee structured output. The model cannot return free-form text — it must populate the tool schema or the agent throws.

The action agent does not execute writes directly. It creates an approval request that requires human review before any financial action is taken.

---

## Data Flow

```
Customer Complaint
       |
  [TriageAgent]
  - classify issue
  - assess churn risk
  - produce summary
       |
  [HandoffContract + ScopeReducer]  <- boundary 1
       |
  [PolicySpecialist]
  - check fee policy
  - evaluate eligibility
  - produce decision
       |
  [HandoffContract + ScopeReducer]  <- boundary 2
       |
  [ActionAgent]
  - create approval request
  - idempotency key checked
  - no direct execution
       |
  [Human Review]
  - approve or reject
```

---

## What This Is Not

This is a reference implementation for governance patterns. It is not:

- A production banking system
- A real approval workflow
- A compliance-certified implementation
- A replacement for real IAM, secret management, or audit infrastructure

The patterns are real. The infrastructure is simulated with local JSON files.
