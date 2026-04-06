/**
 * Idempotency Keys
 * 
 * Prevents duplicate writes across multi-agent workflows
 * 
 * Key insight: Idempotency key tied to ORIGINAL REQUEST, not agent retries
 * All retries use same key → Write happens exactly once
 */

class IdempotencyManager {
  constructor() {
    this.processedActions = new Map(); // key → { result, processedAt }
  }

  /**
   * Generate idempotency key from original customer request
   * Key must survive all retries across all agents
   */
  generateKey(initiatingUser, originalRequest, actionType) {
    const keyData = `${initiatingUser}:${originalRequest}:${actionType}:v1`;
    const hash = this.simpleHash(keyData);
    return `idem-${hash}`;
  }

  /**
   * Check if action has been processed
   */
  hasBeenProcessed(idempotencyKey) {
    return this.processedActions.has(idempotencyKey);
  }

  /**
   * Get result of previously processed action
   */
  getProcessedResult(idempotencyKey) {
    const entry = this.processedActions.get(idempotencyKey);
    return entry ? entry.result : null;
  }

  /**
   * Record that action has been processed
   */
  recordProcessed(idempotencyKey, result) {
    this.processedActions.set(idempotencyKey, {
      result,
      processedAt: new Date().toISOString(),
    });
    return result;
  }

  /**
   * Simple hash (use crypto in production)
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

module.exports = IdempotencyManager;