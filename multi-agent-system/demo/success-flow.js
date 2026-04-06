/**
 * SUCCESS FLOW DEMO
 * Normal path: Triage → Policy → Action
 * Uses customer-case-789.json
 */

require('dotenv').config();

const { runFullFlow } = require('./full-flow');

console.log('Running success path: Triage -> Policy -> Action\n');

runFullFlow('demo/customer-case-789.json').catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
