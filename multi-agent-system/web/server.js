/**
 * Web server for the multi-agent banking demo.
 * Wraps the agent pipeline and serves a single-page UI.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const path = require('path');

const HandoffContract = require('../src/governance/handoff-contract');
const ScopeReducer = require('../src/governance/scope-reducer');
const IdentityManager = require('../src/governance/identity-manager');
const TraceLinker = require('../src/governance/trace-linker');
const IdempotencyManager = require('../src/safety/idempotency-keys');
const LoopGuard = require('../src/safety/loop-guards');
const MemorySegmentation = require('../src/memory/memory-segmentation');
const JSONStore = require('../src/storage/json-store');

const TriageAgent = require('../src/agents/triage-agent');
const PolicySpecialist = require('../src/agents/policy-specialist');
const ActionAgent = require('../src/agents/action-agent');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Run the full pipeline for a given complaint and return each stage's result.
 */
async function runPipeline(complaint, accountId, userId) {
  const handoffContract = new HandoffContract();
  const scopeReducer = new ScopeReducer();
  const identityManager = new IdentityManager();
  const traceLinker = new TraceLinker();
  const idempotencyManager = new IdempotencyManager();
  const loopGuard = new LoopGuard();
  new MemorySegmentation();
  const jsonStore = new JSONStore('data');

  handoffContract.defineHandoff('triage-agent', 'policy-specialist', {
    allowedFields: ['caseId', 'accountId', 'issueType', 'churnRisk'],
    scopeTransferred: {
      read: ['policy-articles', 'historical-fee-reversals'],
      write: [],
    },
    reissueIdentity: true,
    description: 'Triage hands constrained state to policy specialist',
  });

  handoffContract.defineHandoff('policy-specialist', 'action-agent', {
    allowedFields: ['caseId', 'accountId', 'policyDecision', 'approvalRequired'],
    scopeTransferred: {
      read: ['approval-status'],
      write: [],
    },
    reissueIdentity: true,
    description: 'Policy specialist hands reduced state to action agent',
  });

  const requestPayload = {
    caseId: `case-${Date.now()}`,
    accountId: accountId || 'A100',
    initiatingUser: userId || 'web-user',
    description: complaint,
    requestType: 'complaint',
    createdAt: new Date().toISOString(),
  };

  const parentTrace = traceLinker.createParentTrace(requestPayload.initiatingUser, requestPayload.caseId);
  const parentRunId = parentTrace.parentRunId;
  loopGuard.initializeRequest(parentRunId);

  const stages = [];

  // --- Stage 1: Triage ---
  const triage = new TriageAgent({ handoffContract, traceLinker, idempotencyManager, loopGuard, jsonStore });
  const triageHandoff = await triage.triage(parentRunId, requestPayload);

  stages.push({
    name: 'Triage Agent',
    agent: 'triage-agent',
    state: triageHandoff.stateTransferred,
    scope: triageHandoff.scopeTransferred,
    handoffContract: {
      from: triageHandoff.sourceAgent,
      to: triageHandoff.destinationAgent,
      allowedFields: ['caseId', 'accountId', 'issueType', 'churnRisk'],
      scopeTransferred: triageHandoff.scopeTransferred,
    },
    status: 'done',
  });

  // --- Stage 2: Policy ---
  const policy = new PolicySpecialist({ handoffContract, scopeReducer, traceLinker, loopGuard });
  const policyHandoff = await policy.evaluate(parentRunId, triageHandoff);

  stages.push({
    name: 'Policy Specialist',
    agent: 'policy-specialist',
    state: policyHandoff.stateTransferred,
    scope: policyHandoff.scopeTransferred,
    policyMeta: policyHandoff.policyMeta,
    handoffContract: {
      from: policyHandoff.sourceAgent,
      to: policyHandoff.destinationAgent,
      allowedFields: ['caseId', 'accountId', 'policyDecision', 'approvalRequired'],
      scopeTransferred: policyHandoff.scopeTransferred,
    },
    status: 'done',
  });

  // --- Stage 3: Action ---
  const action = new ActionAgent({ handoffContract, identityManager, traceLinker, idempotencyManager, jsonStore });
  const approvalRequest = await action.execute(parentRunId, policyHandoff, requestPayload.initiatingUser);

  stages.push({
    name: 'Action Agent',
    agent: 'action-agent',
    approvalRequest,
    status: 'done',
  });

  // Finalize trace
  traceLinker.completeParentTrace(parentRunId, {
    success: true,
    finalStatus: 'approval_pending',
    approvalRequestId: approvalRequest.approvalRequestId,
  });

  jsonStore.append('evidence.json', {
    correlationId: parentTrace.correlationId,
    parentRunId,
    exportedAt: new Date().toISOString(),
  });

  return {
    correlationId: parentTrace.correlationId,
    parentRunId,
    stages,
    approvalRequest,
  };
}

// POST /api/run — run the full pipeline
app.post('/api/run', async (req, res) => {
  const { complaint, accountId, userId } = req.body;

  if (!complaint || !complaint.trim()) {
    return res.status(400).json({ error: 'complaint is required' });
  }

  try {
    const result = await runPipeline(complaint.trim(), accountId, userId);
    res.json(result);
  } catch (err) {
    console.error('Pipeline error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nMulti-Agent Banking Demo running at http://localhost:${PORT}\n`);
});
