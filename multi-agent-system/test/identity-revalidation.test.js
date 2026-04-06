import test from 'node:test';
import assert from 'node:assert/strict';

import { issueScopedIdentity, validateIdentityForAction } from '../src/governance/identity-manager.js';

test('action identity must be scoped to create approval', () => {
  const identity = issueScopedIdentity('action-agent');
  assert.equal(validateIdentityForAction(identity, 'create_approval'), true);
  assert.equal(validateIdentityForAction(identity, 'execute_transfer'), false);
});
