/**
 * RETRY PROTECTED DEMO
 * Runs the full LLM chain twice with the same case to show
 * idempotency preventing a duplicate approval request.
 */

require('dotenv').config();

const { runFullFlow } = require('./full-flow');

async function runRetryProtected() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  RETRY PROTECTED DEMO: Idempotency Guard with LLM Chain  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('=== ATTEMPT 1: Original LLM chain run ===\n');
  await runFullFlow('demo/customer-case-789.json');

  console.log('\n=== ATTEMPT 2: Same case replayed (simulating retry) ===\n');
  console.log('Expected: idempotency key blocks the duplicate approval request\n');
  await runFullFlow('demo/customer-case-789.json');

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Check data/approvals.json — only one record per case     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

runRetryProtected().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
