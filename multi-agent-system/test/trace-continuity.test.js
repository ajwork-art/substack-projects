/**
 * TEST: Trace Continuity
 * 
 * Verifies parent and child runs are linked
 */

const TraceLinker = require('../src/governance/trace-linker');

function testTraceContinuity() {
  console.log('\n╔═════════════════════════════════════════════╗');
  console.log('║  TEST: Trace Continuity                     ║');
  console.log('╚═════════════════════════════════════════════╝\n');

  const linker = new TraceLinker();

  // Create parent
  const parent = linker.createParentTrace('maya-789', 'case-456');
  const parentRunId = parent.parentRunId;

  console.log(`Parent Run ID: ${parentRunId}`);
  console.log(`Correlation ID: ${parent.correlationId}\n`);

  // Create children
  const child1 = linker.createChildTrace(
    parentRunId,
    'triage-agent',
    'policy-specialist',
    { caseId: 'case-456' },
    { read: ['policy-articles'], write: [] }
  );

  const child2 = linker.createChildTrace(
    parentRunId,
    'policy-specialist',
    'action-agent',
    { caseId: 'case-456', policyDecision: '...' },
    { read: ['approval-status'], write: [] }
  );

  console.log(`Child 1: ${child1.childRunId} (triage → policy)`);
  console.log(`Child 2: ${child2.childRunId} (policy → action)`);

  // Complete
  linker.completeChildTrace(parentRunId, child1.childRunId, { success: true });
  linker.completeChildTrace(parentRunId, child2.childRunId, { success: true });
  linker.completeParentTrace(parentRunId, { success: true });

  const evidence = linker.exportAsEvidence(parentRunId);
  console.log('\nExported evidence:');
  console.log(JSON.stringify(evidence, null, 2));

  const passed = evidence.agentChain.length === 2 &&
                 evidence.agentChain[0].agent === 'policy-specialist' &&
                 evidence.agentChain[1].agent === 'action-agent';

  console.log(`\nTest: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  return passed;
}

testTraceContinuity();