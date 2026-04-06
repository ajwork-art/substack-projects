import test from 'node:test';
import assert from 'node:assert/strict';

import { createHandoff } from '../src/governance/handoff-contract.js';

test('createHandoff returns a valid handoff object', () => {
  const h = createHandoff({
    sourceAgent: 'triage-agent',
    destinationAgent: 'policy-specialist',
    parentRunId: 'run_parent',
    childRunId: 'run_child',
    scope: ['accountId', 'caseId'],
    context: { accountId: 'A100', caseId: 'CS4001' }
  });
  assert.ok(h.handoffId, 'handoffId should be set');
  assert.equal(h.sourceAgent, 'triage-agent');
  assert.equal(h.destinationAgent, 'policy-specialist');
  assert.equal(h.parentRunId, 'run_parent');
  assert.equal(h.childRunId, 'run_child');
  assert.deepEqual(h.scope, ['accountId', 'caseId']);
  assert.deepEqual(h.context, { accountId: 'A100', caseId: 'CS4001' });
});

test('createHandoff throws when required fields are missing', () => {
  assert.throws(() => {
    createHandoff({
      sourceAgent: 'triage-agent',
      destinationAgent: 'policy-specialist',
      parentRunId: null,
      childRunId: null,
      scope: [],
      context: {}
    });
  }, /Invalid handoff contract/);
});

test('createHandoff generates unique handoffIds', () => {
  const args = {
    sourceAgent: 'triage-agent',
    destinationAgent: 'policy-specialist',
    parentRunId: 'run_a',
    childRunId: 'run_b',
    scope: [],
    context: {}
  };
  const h1 = createHandoff(args);
  const h2 = createHandoff(args);
  assert.notEqual(h1.handoffId, h2.handoffId);
});
