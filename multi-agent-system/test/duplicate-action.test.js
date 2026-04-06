/**
 * TEST: Duplicate Action Prevention
 * 
 * Verifies idempotency keys prevent duplicate writes
 */

const IdempotencyManager = require('../src/safety/idempotency-keys');

function testDuplicateActionPrevention() {
  console.log('\n╔═════════════════════════════════════════════╗');
  console.log('║  TEST: Duplicate Action Prevention          ║');
  console.log('╚═════════════════════════════════════════════╝\n');

  const manager = new IdempotencyManager();

  const initiatingUser = 'maya-789';
  const originalRequest = 'case-456';
  const actionType = 'fee-reversal';

  const idempotencyKey = manager.generateKey(initiatingUser, originalRequest, actionType);

  // ATTEMPT 1
  console.log('Attempt 1: Original request');
  let hasBeenProcessed = manager.hasBeenProcessed(idempotencyKey);
  console.log(`Already processed? ${hasBeenProcessed}`);

  if (!hasBeenProcessed) {
    const result = {
      approvalId: 'appr-001',
      caseId: originalRequest,
      amount: 45,
      status: 'pending',
    };
    manager.recordProcessed(idempotencyKey, result);
    console.log('✅ Action recorded\n');
  }

  // ATTEMPT 2 (Duplicate)
  console.log('Attempt 2: Retry (same key)');
  hasBeenProcessed = manager.hasBeenProcessed(idempotencyKey);
  console.log(`Already processed? ${hasBeenProcessed}`);

  if (hasBeenProcessed) {
    const cached = manager.getProcessedResult(idempotencyKey);
    console.log('✅ DUPLICATE PREVENTED');
    console.log('Cached result returned:', JSON.stringify(cached, null, 2));
  }

  const passed = hasBeenProcessed === true;
  console.log(`\nTest: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  return passed;
}

testDuplicateActionPrevention();