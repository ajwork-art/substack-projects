import test from 'node:test';
import assert from 'node:assert/strict';

import { segmentMemory } from '../src/memory/memory-segmentation.js';
import { expireScratchpad } from '../src/memory/memory-expiry.js';

test('memory segmentation keeps scratchpad separate from evidence', () => {
  const segmented = segmentMemory({
    workingState: { accountId: 'A100' },
    scratchpad: { draftReasoning: 'temporary' },
    evidence: { event: 'handoff_created' }
  });
  assert.equal(segmented.workingState.accountId, 'A100');
  assert.equal(segmented.scratchpad.draftReasoning, 'temporary');
  assert.equal(segmented.evidence.event, 'handoff_created');

  const expired = expireScratchpad(segmented);
  assert.deepEqual(expired.scratchpad, {});
});
