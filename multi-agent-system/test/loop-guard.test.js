import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLoopSafe } from '../src/safety/loop-guards.js';

test('loop guard throws after max steps', () => {
  assert.equal(assertLoopSafe({ stepCount: 2, maxSteps: 5 }), true);
  assert.throws(() => assertLoopSafe({ stepCount: 6, maxSteps: 5 }), /Loop guard triggered/);
});
