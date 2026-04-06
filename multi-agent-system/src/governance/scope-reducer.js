/**
 * Scope Reducer
 * 
 * Ensures downstream agents never get expanded scope
 * 
 * Design principle: Start with NOTHING, add only what is explicitly needed
 */

class ScopeReducer {
  /**
   * Apply scope reduction from upstream to downstream
   */
  reduceScope(upstreamScope, downstreamContract) {
    // Start with NOTHING
    const reduced = {
      read: [],
      write: [],
    };

    // Add ONLY what the contract explicitly allows
    if (downstreamContract.scopeTransferred?.read) {
      reduced.read = [...downstreamContract.scopeTransferred.read];
    }

    if (downstreamContract.scopeTransferred?.write) {
      reduced.write = [...downstreamContract.scopeTransferred.write];
    }

    return reduced;
  }

  /**
   * Validate that downstream scope respects reduction
   */
  validateScopeReduction(proposedScope, contractScope) {
    const violations = [];

    // Proposed read cannot exceed contract
    const proposedRead = proposedScope.read || [];
    const contractRead = contractScope.read || [];
    const expandedRead = proposedRead.filter(r => !contractRead.includes(r));
    if (expandedRead.length > 0) {
      violations.push(`Read expansion: ${expandedRead.join(', ')}`);
    }

    // Proposed write cannot exceed contract
    const proposedWrite = proposedScope.write || [];
    const contractWrite = contractScope.write || [];
    const expandedWrite = proposedWrite.filter(w => !contractWrite.includes(w));
    if (expandedWrite.length > 0) {
      violations.push(`Write expansion: ${expandedWrite.join(', ')}`);
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Example: Triage to Policy scope reduction
   */
  static exampleTriageToPolicy() {
    const triageScope = {
      read: ['case-summary', 'account-profile', 'recent-transactions'],
      write: [],
    };

    const contract = {
      scopeTransferred: {
        read: ['policy-articles', 'historical-fee-reversals'],
        write: [],
      },
    };

    const reducer = new ScopeReducer();
    return reducer.reduceScope(triageScope, contract);
  }
}

module.exports = ScopeReducer;