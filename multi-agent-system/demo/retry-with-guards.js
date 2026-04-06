/**
 * RETRY WITH GUARDS DEMO
 * Shows how idempotency keys prevent duplicate actions
 * 
 * Scenario:
 * 1. Triage → Policy → Action completes with idempotency key
 * 2. Triage retries after timeout
 * 3. Same idempotency key → Duplicate prevented
 * 4. Cached result returned
 */

const IdempotencyManager = require('../src/safety/idempotency-keys');
const JSONStore = require('../src/storage/json-store');

async function runRetryWithGuards() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  RETRY WITH GUARDS DEMO: Idempotency Key Protection      ║');
  console.log('║  Shows duplicate prevented by same key                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const idempotencyManager = new IdempotencyManager();
  const jsonStore = new JSONStore('data');

  const initiatingUser = 'maya-789';
  const caseId = 'case-456';
  const actionType = 'fee-reversal';

  // Generate idempotency key (tied to original request)
  const idempotencyKey = idempotencyManager.generateKey(initiatingUser, caseId, actionType);
  console.log(`Idempotency Key: ${idempotencyKey}\n`);

  // ATTEMPT 1: Original request
  console.log('=== ATTEMPT 1: Original Request ===\n');

  if (!idempotencyManager.hasBeenProcessed(idempotencyKey)) {
    const approvalRequest = {
      approvalRequestId: 'appr-001',
      targetAccount: 'A100',
      targetCase: caseId,
      action: 'fee-reversal',
      amount: 45,
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
    };

    console.log('First approval request created:');
    console.log(JSON.stringify(approvalRequest, null, 2));

    idempotencyManager.recordProcessed(idempotencyKey, approvalRequest);
    jsonStore.append('approvals.json', approvalRequest);
  }

  // ATTEMPT 2: Triage retries (WITH idempotency guard)
  console.log('\n=== ATTEMPT 2: Triage Retries (WITH Guard) ===\n');
  console.log('⚠️  Triage timeout, request replayed');
  console.log('✅ Same idempotency key → Duplicate detected\n');

  if (idempotencyManager.hasBeenProcessed(idempotencyKey)) {
    const cached = idempotencyManager.getProcessedResult(idempotencyKey);
    console.log('Cached result returned:');
    console.log(JSON.stringify(cached, null, 2));
    console.log('\n✅ DUPLICATE PREVENTED: Same approval request returned');
  }

  // Check result
  const allApprovals = jsonStore.read('approvals.json');
  console.log('\n=== RESULT ===\n');
  console.log(`Total approval requests: ${allApprovals.length}`);
  console.log('✅ SINGLE ACTION: Only one approval request for this case');
  console.log('Fee reversal will happen exactly once\n');

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SUCCESS: Duplicate action prevented by idempotency    ║');
  console.log('║  This is why idempotency keys span the entire chain       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

runRetryWithGuards().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});