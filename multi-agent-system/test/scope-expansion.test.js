/**
 * TEST: Scope Expansion Prevention
 * 
 * Verifies downstream agents cannot expand scope
 */

const ScopeReducer = require('../src/governance/scope-reducer');

function testScopeExpansion() {
  console.log('\n╔═════════════════════════════════════════════╗');
  console.log('║  TEST: Scope Expansion Prevention           ║');
  console.log('╚═════════════════════════════════════════════╝\n');

  const reducer = new ScopeReducer();

  const contractScope = {
    read: ['policy-articles', 'historical-fee-reversals'],
    write: [],
  };

  const proposedScope = {
    read: ['policy-articles', 'historical-fee-reversals', 'account-profile', 'customer-ssn'],
    write: [],
  };

  console.log('Contract allows:', JSON.stringify(contractScope.read));
  console.log('Policy specialist proposes:', JSON.stringify(proposedScope.read));

  const validation = reducer.validateScopeReduction(proposedScope, contractScope);

  console.log('\nValidation:', JSON.stringify(validation, null, 2));

  const passed = !validation.valid && validation.violations.length > 0;
  console.log(`\nTest: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  return passed;
}

testScopeExpansion();