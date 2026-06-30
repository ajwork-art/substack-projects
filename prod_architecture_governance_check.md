# Architecture Governance Guide

**For production agents, architecture is not separate from governance. Architecture is the governance model.**

The contract defines what must be true. The architecture defines how the system makes it true.

An agent is not governed because the organization has a policy. It is governed because the architecture enforces authority boundaries, data boundaries, approval paths, override mechanisms, and evidence generation in production.

If those controls do not exist in the architecture, they do not exist in production.

---

## What This Guide Covers

This guide explains how governance commitments for a production agent should be expressed in the system architecture. It is meant to be used alongside:

- The agent contract
- Ownership and accountability definitions
- Human involvement patterns
- Approval threshold rules
- Release and review processes

It walks through eight architecture requirements that translate governance commitments into production controls:

1. Authority boundaries
2. Data boundaries
3. Tool boundaries
4. Human involvement insertion points
5. Approval gates
6. Override paths
7. Evidence and logging
8. Handoff control points

---

## 1. Authority Boundaries

**Definition:** Authority boundary defines what the agent is allowed to do, under what conditions, and at what level of consequence.

**Why it matters:** Many enterprise failures happen because systems are deployed with more practical authority than the organization intended. The interface may look like advice. The architecture may allow execution.

**Architecture requirements:** The architecture should explicitly separate read, recommend, approve, and execute. These are different powers and should not collapse into one action path.

**Design questions:**
- Can the agent only retrieve and summarize, or can it trigger downstream actions?
- Can it recommend an action without executing it?
- What actions require human approval before execution?
- What actions are never allowed under any condition?
- Are authority levels represented clearly in the workflow and service design?

**Minimum control expectation:** The architecture should make unauthorized execution impossible, not merely discouraged.

---

## 2. Data Boundaries

**Definition:** Data boundary defines what information the agent can access, retain, transform, and pass forward.

**Why it matters:** If the system can reach the wrong data, governance is already weak. An agent with ambient access to broad data domains is not governable simply because downstream policies exist.

**Architecture requirements:**
- Approved and prohibited data sources
- Scope of retrieval
- Session memory limits
- Retention behavior
- Masking and redaction controls
- Inter-agent data transfer restrictions

**Design questions:**
- Can the agent access only task-relevant records or broad account history?
- Can it retrieve data across domains or tenants?
- Is sensitive data minimized before retrieval or after?
- Can session memory retain sensitive information beyond the task?
- Are inter-agent handoffs constrained to the minimum necessary context?

**Minimum control expectation:** Data access should be scoped by design, not controlled only by human intent.

---

## 3. Tool Boundaries

**Definition:** Tool boundary defines which tools the agent can call, for what purpose, with what limits, and with what parameter constraints.

**Why it matters:** The tool layer is where consequence becomes operational. A model suggests. A tool acts.

**Architecture requirements:**
- Use narrow tools instead of broad connectors
- Restrict tool parameters
- Separate read tools from write tools
- Prevent unapproved tool combinations
- Make execution paths visible and reviewable

**Design questions:**
- Does the agent have one broad connector or multiple narrow tools?
- Are tool arguments constrained or model-generated freely?
- Can the same agent both read and execute against the same system?
- Are write operations separated from analysis operations?
- Can the tool layer be updated without review?

**Minimum control expectation:** A production agent should only have access to the smallest useful action surface.

---

## 4. Human Involvement Insertion Points

**Definition:** Human involvement insertion points define where human judgment enters the workflow.

**Why it matters:** Human oversight is not meaningful unless it is tied to a specific point in the architecture. The human role must be designed into the flow, not assumed to happen outside it.

**Architecture requirements:** The system should clearly support one of four patterns: Observe, Approve, Collaborate, or Take Over. These should not be policy concepts only — they should be visible in system behavior.

**Design questions:**
- Where does the human see the case, recommendation, or action proposal?
- At what point is execution blocked pending approval?
- Can a human modify the outcome before it is sent or executed?
- Can the workflow transfer cleanly into full human ownership?
- Is the insertion point tied to risk, threshold, or action type?

**Minimum control expectation:** Human involvement must be designed into the workflow, not assumed to happen outside it.

---

## 5. Approval Gates

**Definition:** Approval gate is the architectural point at which an action is paused until an authorized human approves it.

**Why it matters:** Approval is only real if the workflow cannot bypass it.

**Architecture requirements:**
- Which actions require approval
- Which role can approve
- What information is presented for approval
- How approval is recorded
- What happens if approval is delayed or unavailable
- When dual control is required

**Design questions:**
- Is approval tied to authority level, amount, or action type?
- Is the approval gate pre-execution or post-execution?
- Can an approval request expire, escalate, or reroute?
- Is a second approval required above a certain threshold?
- Does the architecture prevent execution until approval is complete?

**Minimum control expectation:** A high-consequence action should not rely on informal review behavior. It should have a real gate.

---

## 6. Override Paths

**Definition:** Override path is the mechanism through which a human can pause, interrupt, reroute, or stop the agent.

**Why it matters:** A governed system must be interruptible. If nobody can stop it quickly, the organization does not really control it.

**Architecture requirements:**
- Pause
- Suspend
- Reroute to human
- Revoke access
- Disable execution paths
- Emergency halt for active incidents

**Design questions:**
- Who can pause the agent?
- How quickly can the system be stopped?
- Does pause stop execution only, or also tool access and downstream actions?
- Is override available during partial failure or only in normal operation?
- Is override tested and not just documented?

**Minimum control expectation:** Override must be fast, real, and executable under pressure.

---

## 7. Evidence and Logging

**Definition:** Evidence and logging define what records the system produces so actions, approvals, handoffs, and failures can be reconstructed.

**Why it matters:** A system is not governed if nobody can prove what happened.

**Architecture requirements — log every:**
- Input and context reference
- Tool call
- Approval event
- Human intervention
- Handoff point
- Execution outcome
- Configuration version
- Boundary violation
- Override event

**Design questions:**
- What evidence is emitted for every consequential action?
- Can the organization reconstruct what the agent saw and did?
- Are approval and override events logged with role and timestamp?
- Is the evidence durable and reviewable?
- Are log and evidence expectations aligned with the contract?

**Minimum control expectation:** Evidence must be generated by the system, not reconstructed from memory after an incident.

---

## 8. Handoff Control Points

**Definition:** Handoff control points define how work, context, and authority move between humans, services, and agents.

**Why it matters:** Every handoff is a governance point. Handoffs decide what gets passed forward, what gets filtered out, and who is allowed to act next.

**Architecture requirements:**
- What context is transferred
- Whether authority changes at the handoff
- Whether the next actor can recommend or execute
- Whether evidence links the decision chain
- Whether a human can interrupt at the handoff

**Design questions:**
- What information moves from one agent or service to another?
- Does the receiving component inherit more authority than the previous one?
- Are handoffs explicit or hidden in orchestration logic?
- Can a multi-step chain create an action no single step was meant to authorize?
- Are inter-agent communications logged and bounded?

**Minimum control expectation:** Handoffs should narrow and clarify control, not silently expand it.

---

## How This Maps to the Agent Contract

The agent contract defines the governance commitments. Architecture makes those commitments operational.

| Contract element | Architecture requirement |
|---|---|
| Purpose | Limit the system to the minimum required action path |
| Ownership | Define where owners intervene, approve, override, and review |
| Authority boundary | Enforce limits in workflow, tool access, and execution logic |
| Data boundary | Scope retrieval, memory, storage, and cross-system transfer |
| Tool boundary | Narrow tools and constrain parameters |
| Human involvement | Implement Observe, Approve, Collaborate, or Take Over at the correct flow point |
| Evidence | Emit logs, records, and event traces that make review possible |
| Override | Provide a real interruption path and evidence for post-incident analysis |

---

## Minimum Architecture Review Questions

Before an agent goes live, these ten questions should have clear answers:

1. What authority does the agent actually have in production?
2. What data can it access by design?
3. What tools can it call, and how narrow are those tools?
4. Where does human judgment enter the workflow?
5. What actions require approval before execution?
6. Who can override the agent, and how quickly?
7. What evidence will exist after a consequential action?
8. Where are the handoff control points?
9. What prevents the system from doing more than intended?
10. Does the architecture reflect the contract, or contradict it?

If those answers are unclear, the system is not yet governed in production terms.

---

## What Good Looks Like

A governed production agent has architecture that is:

- **Narrow in authority** — the system executes only what the business intentionally delegated
- **Scoped in data access** — retrieval is bounded by task, not by what happens to be reachable
- **Explicit in tool usage** — every callable action is known, constrained, and reviewable
- **Clear about human intervention** — insertion points are designed in, not assumed
- **Differentiated by risk** — low-risk triage does not share an execution model with high-consequence transactions
- **Interruptible under pressure** — override paths are tested, not just documented
- **Evidence-producing by design** — the audit trail exists because the system generates it
- **Aligned with the contract** — architecture reflects the governance commitments, not just the technical requirements

---

## Bottom Line

The contract defines what must be true. The architecture decides whether it is true in production.

That is why architecture is not separate from governance. It is where governance either becomes operational or fails.
