/**
 * Handoff Contract
 * 
 * A handoff is a control boundary where:
 * - State is transferred (constrained)
 * - Scope is revalidated (reduced)
 * - Identity is reissued (not inherited)
 * - Evidence is recorded (for audit)
 * 
 * Core principle: Define handoff boundaries explicitly
 */

class HandoffContract {
  constructor() {
    this.contracts = new Map();
  }

  /**
   * Define what can be handed off from source to destination
   */
  defineHandoff(sourceAgent, destinationAgent, spec) {
    const key = `${sourceAgent}→${destinationAgent}`;

    if (this.contracts.has(key)) {
      throw new Error(`Handoff already defined: ${key}`);
    }

    this.contracts.set(key, {
      sourceAgent,
      destinationAgent,
      // What fields can be transferred in handoff payload?
      allowedFields: spec.allowedFields || [],
      // What scope does destination agent get?
      scopeTransferred: {
        read: spec.scopeTransferred?.read || [],
        write: spec.scopeTransferred?.write || [],
      },
      // Must scope be revalidated?
      requiresScopeRevalidation: spec.requiresScopeRevalidation !== false,
      // Must identity be reissued?
      reissueIdentity: spec.reissueIdentity !== false,
      // Is approval required to proceed?
      approvalRequired: spec.approvalRequired || false,
      // What policy checks happen?
      policyChecks: spec.policyChecks || [],
      // Description for logs
      description: spec.description || `Handoff from ${sourceAgent} to ${destinationAgent}`,
    });

    return this;
  }

  /**
   * Validate a proposed handoff against the contract
   */
  validateHandoff(sourceAgent, destinationAgent, proposedHandoff) {
    const key = `${sourceAgent}→${destinationAgent}`;
    const contract = this.contracts.get(key);

    if (!contract) {
      return {
        valid: false,
        violations: [`No contract defined: ${key}`],
        contract: null,
      };
    }

    const violations = [];

    // CHECK 1: Source agent matches
    if (proposedHandoff.sourceAgent !== sourceAgent) {
      violations.push(`Source mismatch: expected ${sourceAgent}, got ${proposedHandoff.sourceAgent}`);
    }

    // CHECK 2: Only allowed fields transferred
    const transferredFields = Object.keys(proposedHandoff.stateTransferred || {});
    const allowedFields = contract.allowedFields;
    const unauthorized = transferredFields.filter(f => !allowedFields.includes(f));
    if (unauthorized.length > 0) {
      violations.push(`Unauthorized fields: ${unauthorized.join(', ')}`);
    }

    // CHECK 3: Destination doesn't expand read scope
    const destRead = proposedHandoff.scopeTransferred?.read || [];
    const contractRead = contract.scopeTransferred.read;
    const expandedRead = destRead.filter(r => !contractRead.includes(r));
    if (expandedRead.length > 0) {
      violations.push(`Read scope expansion not allowed: ${expandedRead.join(', ')}`);
    }

    // CHECK 4: Write scope is limited
    const destWrite = proposedHandoff.scopeTransferred?.write || [];
    if (destWrite.length > 0 && !contract.scopeTransferred.write.length) {
      violations.push(`Write scope not permitted`);
    }

    return {
      valid: violations.length === 0,
      violations,
      contract,
    };
  }

  /**
   * Get contract for a handoff pair
   */
  getContract(sourceAgent, destinationAgent) {
    return this.contracts.get(`${sourceAgent}→${destinationAgent}`);
  }

  /**
   * List all defined handoffs
   */
  listHandoffs() {
    return Array.from(this.contracts.keys());
  }
}

module.exports = HandoffContract;