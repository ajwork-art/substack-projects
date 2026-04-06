/**
 * Memory Segmentation
 * 
 * Separates:
 * - Working state (current task, short-lived)
 * - Scratchpad (draft reasoning, agent-specific)
 * - Policy state (policy decisions, survives handoff)
 * - Durable evidence (immutable audit trail)
 * 
 * Prevents scratchpad from becoming policy
 */

class MemorySegmentation {
  constructor() {
    this.workingState = new Map();
    this.scratchpad = new Map();
    this.policyState = new Map();
    this.durableEvidence = new Map();
  }

  /**
   * Working state (scoped to current agent, short-lived)
   */
  storeWorkingState(agentId, runId, key, value) {
    const stateKey = `${agentId}:${runId}:${key}`;
    this.workingState.set(stateKey, {
      value,
      agent: agentId,
      runId,
      storedAt: new Date().toISOString(),
      ttlSeconds: 300, // 5 minutes
    });
  }

  getWorkingState(agentId, runId, key) {
    const stateKey = `${agentId}:${runId}:${key}`;
    const state = this.workingState.get(stateKey);
    if (!state) return null;

    const age = (Date.now() - new Date(state.storedAt).getTime()) / 1000;
    if (age > state.ttlSeconds) {
      this.workingState.delete(stateKey);
      return null;
    }

    return state.value;
  }

  /**
   * Scratchpad (draft reasoning, not for downstream)
   */
  storeScratchpad(agentId, runId, key, value) {
    const scratchKey = `${agentId}:${runId}:${key}`;
    this.scratchpad.set(scratchKey, {
      value,
      agent: agentId,
      runId,
      storedAt: new Date().toISOString(),
      ttlSeconds: 300,
    });
  }

  /**
   * Policy state (survives handoffs)
   */
  storePolicyState(policyKey, policyData) {
    this.policyState.set(policyKey, {
      policy: policyData,
      storedAt: new Date().toISOString(),
      version: 1,
    });
  }

  getPolicyState(policyKey) {
    const state = this.policyState.get(policyKey);
    return state ? state.policy : null;
  }

  /**
   * Durable evidence (immutable, never deleted)
   */
  storeEvidence(correlationId, evidence) {
    const evidenceKey = `evidence:${correlationId}`;
    this.durableEvidence.set(evidenceKey, {
      evidence,
      storedAt: new Date().toISOString(),
      immutable: true,
    });
  }

  getEvidence(correlationId) {
    const evidenceKey = `evidence:${correlationId}`;
    const entry = this.durableEvidence.get(evidenceKey);
    return entry ? entry.evidence : null;
  }

  /**
   * Check for prohibited data
   */
  checkProhibitedData(data) {
    const patterns = {
      ssn: /\b\d{3}-\d{2}-\d{4}\b/,
      cardNumber: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      password: /password\s*[:=]\s*['"][^'"]{3,}['"]/i,
    };

    const violations = [];
    const dataStr = JSON.stringify(data);

    for (const [name, pattern] of Object.entries(patterns)) {
      if (pattern.test(dataStr)) {
        violations.push(`Prohibited data: ${name}`);
      }
    }

    return {
      safe: violations.length === 0,
      violations,
    };
  }
}

module.exports = MemorySegmentation;