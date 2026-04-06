/**
 * RETRY FAILURE DEMO
 * Shows what breaks without idempotency guards
 * 
 * Scenario:
 * 1. Triage → Policy → Action completes
 * 2. Triage retries after timeout
 * 3. Second approval request created for same case
 * 4. Duplicate action!
 */

const IdempotencyManager = require('../src/safety/idempotency-keys');
const JSONStore = require('../src/storage/json-store');

async function runRetryFailure() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  RETRY FAILURE DEMO: Without Idempotency Guards          ║');
  console.log('║  Shows duplicate approval requests                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const jsonStore = new JSONStore('data');

  // ATTEMPT 1: Normal flow
  console.log('=== ATTEMPT 1: Normal Flow ===\n');

  const approvalRequest1 = {
    approvalRequestId: 'appr-001',
    targetAccount: 'A100',
    targetCase: 'case-456',
    action: 'fee-reversal',
    amount: 45,
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
  };

  console.log('Approval request created:', JSON.stringify(approvalRequest1, null, 2));
  jsonStore.append('approvals.json', approvalRequest1);

  // ATTEMPT 2: Triage retries (no idempotency key protection)
  console.log('\n=== ATTEMPT 2: Triage Retries (No Guards) ===\n');
  console.log('⚠️  Triage timeout, request replayed');
  console.log('⚠️  No idempotency key → Second approval request created\n');

  const approvalRequest2 = {
    approvalRequestId: 'appr-002',
    targetAccount: 'A100',
    targetCase: 'case-456',
    action: 'fee-reversal',
    amount: 45,
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
  };

  console.log('Second approval request created:', JSON.stringify(approvalRequest2, null, 2));
  jsonStore.append('approvals.json', approvalRequest2);

  // Check result
  const allApprovals = jsonStore.read('approvals.json');
  console.log('\n=== RESULT ===\n');
  console.log(`Total approval requests: ${allApprovals.length}`);
  console.log('❌ DUPLICATE ACTION: Same case now has 2 pending approvals');
  console.log('This could result in 2 fee reversals!\n');

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ❌ FAILURE: Duplicate action not prevented              ║');
  console.log('║  This is why idempotency keys are critical               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

runRetryFailure().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});