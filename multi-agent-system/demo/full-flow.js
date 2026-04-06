/**
 * FULL FLOW DEMO
 * Success path: Triage → Policy → Action
 *
 * Demonstrates:
 * - Handoff contract validation
 * - Scope reduction
 * - Identity reissue
 * - Trace continuity
 * - Idempotency
 * - LLM-powered agent decisions (Claude)
 */

require('dotenv').config();

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

const fs = require('fs');

async function runFullFlow(caseFile = 'demo/customer-case-123.json') {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  FULL FLOW DEMO: Triage → Policy → Action                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // ========================================================================
  // SETUP GOVERNANCE
  // ========================================================================

  const handoffContract = new HandoffContract();
  const scopeReducer = new ScopeReducer();
  const identityManager = new IdentityManager();
  const traceLinker = new TraceLinker();
  const idempotencyManager = new IdempotencyManager();
  const loopGuard = new LoopGuard();
  const memory = new MemorySegmentation();
  const jsonStore = new JSONStore('data');

  // Define handoff contracts
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

  // ========================================================================
  // LOAD REQUEST
  // ========================================================================

  const requestPayload = JSON.parse(
    fs.readFileSync(caseFile, 'utf8')
  );

  const initiatingUser = requestPayload.initiatingUser || requestPayload.userId || 'unknown-user';
  const originalRequest = requestPayload.caseId || `req-${Date.now()}`;

  // Create parent trace
  const parentTrace = traceLinker.createParentTrace(initiatingUser, originalRequest);
  const parentRunId = parentTrace.parentRunId;

  console.log(`Initiating User: ${initiatingUser}`);
  console.log(`Parent Run ID: ${parentRunId}`);
  console.log(`Correlation ID: ${parentTrace.correlationId}\n`);

  loopGuard.initializeRequest(parentRunId);

  // ========================================================================
  // STAGE 1: TRIAGE
  // ========================================================================

  const triage = new TriageAgent({
    handoffContract,
    traceLinker,
    idempotencyManager,
    loopGuard,
    jsonStore,
  });

  const triageHandoff = await triage.triage(parentRunId, requestPayload);

  // ========================================================================
  // STAGE 2: POLICY
  // ========================================================================

  const policy = new PolicySpecialist({
    handoffContract,
    scopeReducer,
    traceLinker,
    loopGuard,
  });

  const policyHandoff = await policy.evaluate(parentRunId, triageHandoff);

  // ========================================================================
  // STAGE 3: ACTION
  // ========================================================================

  const action = new ActionAgent({
    handoffContract,
    identityManager,
    traceLinker,
    idempotencyManager,
    jsonStore,
  });

  const approvalRequest = await action.execute(parentRunId, policyHandoff, initiatingUser);

  // ========================================================================
  // FINALIZE
  // ========================================================================

  console.log('\n=== FINALIZING TRACE ===\n');

  traceLinker.completeParentTrace(parentRunId, {
    success: true,
    finalStatus: 'approval_pending',
    approvalRequestId: approvalRequest.approvalRequestId,
  });

  const evidence = traceLinker.exportAsEvidence(parentRunId);
  console.log('Evidence trail:');
  console.log(JSON.stringify(evidence, null, 2));

  // Write evidence to store
  jsonStore.append('evidence.json', {
    correlationId: evidence.correlationId,
    parentRunId,
    evidence,
    exportedAt: new Date().toISOString(),
  });

  // ========================================================================
  // SUMMARY
  // ========================================================================

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SUCCESS: FULL MULTI-AGENT WORKFLOW COMPLETED          ║');
  console.log('║                                                           ║');
  console.log('║  ✅ Handoff contracts validated                           ║');
  console.log('║  ✅ Scope reduced downstream                              ║');
  console.log('║  ✅ Identity reissued per agent                           ║');
  console.log('║  ✅ Trace continuous (correlation ID linked)              ║');
  console.log('║  ✅ Idempotency key prevents duplicates                   ║');
  console.log('║  ✅ Loop guards prevent infinite chains                   ║');
  console.log('║                                                           ║');
  console.log('║  See data/evidence.json for complete audit trail          ║');
  console.log('║  See data/approvals.json for pending approval             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

module.exports = { runFullFlow };

// Run directly when invoked as the main script
if (require.main === module) {
  runFullFlow().catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
}