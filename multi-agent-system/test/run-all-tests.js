/**
 * Run All Tests
 */

const testDuplicate = require('./duplicate-action.test');
const testScope = require('./scope-expansion.test');
const testTrace = require('./trace-continuity.test');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  RUNNING ALL TESTS                                        ║');
console.log('╚════════════════════════════════════════════════════════════╝');

const results = [];

try {
  results.push({ name: 'Duplicate Action', passed: testDuplicate() });
} catch (err) {
  console.error('Test error:', err.message);
  results.push({ name: 'Duplicate Action', passed: false });
}

try {
  results.push({ name: 'Scope Expansion', passed: testScope() });
} catch (err) {
  console.error('Test error:', err.message);
  results.push({ name: 'Scope Expansion', passed: false });
}

try {
  results.push({ name: 'Trace Continuity', passed: testTrace() });
} catch (err) {
  console.error('Test error:', err.message);
  results.push({ name: 'Trace Continuity', passed: false });
}

// Summary
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  TEST SUMMARY                                             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

results.forEach(r => {
  console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
});

const allPassed = results.every(r => r.passed);
console.log(`\nTotal: ${results.filter(r => r.passed).length}/${results.length} passed\n`);

if (!allPassed) {
  process.exit(1);
}