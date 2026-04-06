import test from 'node:test';
import assert from 'node:assert/strict';

import { reduceScope } from '../src/governance/scope-reducer.js';

test('policy-specialist scope excludes fields not in allow list', () => {
  const reduced = reduceScope('policy-specialist', {
    accountId: 'A100',
    caseId: 'CS4001',
    issueType: 'overdraft_fee',
    churnRisk: true,
    summary: 'Customer has duplicate charge and overdraft fee.',
    rawComplaint: 'should not pass',
    internalNotes: 'should not pass'
  });
  assert.ok(!('rawComplaint' in reduced), 'rawComplaint should be excluded');
  assert.ok(!('internalNotes' in reduced), 'internalNotes should be excluded');
  assert.equal(reduced.accountId, 'A100');
  assert.equal(reduced.churnRisk, true);
});

test('action-agent scope excludes fields not in allow list', () => {
  const reduced = reduceScope('action-agent', {
    accountId: 'A100',
    caseId: 'CS4001',
    proposedAction: 'fee_reversal',
    reason: 'Eligible under policy.',
    issueType: 'overdraft_fee',
    churnRisk: true
  });
  assert.ok(!('issueType' in reduced), 'issueType should be excluded at action boundary');
  assert.ok(!('churnRisk' in reduced), 'churnRisk should be excluded at action boundary');
  assert.equal(reduced.proposedAction, 'fee_reversal');
  assert.equal(reduced.reason, 'Eligible under policy.');
});

test('unknown agent returns full context unchanged', () => {
  const context = { accountId: 'A100', extra: 'data' };
  const reduced = reduceScope('unknown-agent', context);
  assert.deepEqual(reduced, context);
});
