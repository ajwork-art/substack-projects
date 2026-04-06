import { runChain } from './full-flow.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const request = JSON.parse(fs.readFileSync(path.join(__dirname, 'customer-case-789.json'), 'utf8'));

console.log('Idempotency test: submitting the same action twice\n');

console.log('Attempt 1 (guardDuplicates: true):');
const first = await runChain(request, { guardDuplicates: true, approve: false, stepCount: 1 });
const firstStatus = first.action.status;
console.log('  status:', firstStatus);

console.log('\nAttempt 2 (same key, guardDuplicates: true):');
const second = await runChain(request, { guardDuplicates: true, approve: false, stepCount: 2 });
const secondStatus = second.action.status;
console.log('  status:', secondStatus);

const isDuplicate = secondStatus === 'duplicate';
console.log('\n--- Result ---');
console.log('Duplicate blocked:', isDuplicate);

if (!isDuplicate) {
  console.error('FAIL: Expected duplicate to be blocked but it was not.');
  process.exit(1);
} else {
  console.log('PASS: Idempotency key correctly blocked the duplicate action.');
}
