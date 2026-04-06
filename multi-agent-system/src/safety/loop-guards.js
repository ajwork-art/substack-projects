/**
 * Loop Guards
 * 
 * Prevents infinite or excessive handoff chains
 * 
 * Limits:
 * - Max handoffs per request (default: 3)
 * - Max attempts per agent (default: 2)
 * - Max tokens per request (default: 50,000)
 * - Max execution time (default: 5 minutes)
 */

class LoopGuard {
  constructor(config = {}) {
    this.config = {
      maxHandoffsPerRequest: config.maxHandoffsPerRequest || 3,
      maxAttemptsPerAgent: config.maxAttemptsPerAgent || 2,
      maxTokensPerRequest: config.maxTokensPerRequest || 50000,
      maxTimePerRequest: config.maxTimePerRequest || 300000, // 5 minutes
      ...config,
    };

    this.requests = new Map();
  }

  /**
   * Initialize guards for a request
   */
  initializeRequest(parentRunId) {
    this.requests.set(parentRunId, {
      parentRunId,
      handoffCount: 0,
      attempts: {},
      tokensUsed: 0,
      startTime: Date.now(),
      violations: [],
    });
  }

  /**
   * Record a handoff and check guards
   */
  recordHandoff(parentRunId, sourceAgent, destinationAgent, tokensUsed = 0) {
    const req = this.requests.get(parentRunId);
    if (!req) {
      throw new Error(`Request not initialized: ${parentRunId}`);
    }

    req.handoffCount++;
    req.tokensUsed += tokensUsed;
    const agentKey = destinationAgent;
    req.attempts[agentKey] = (req.attempts[agentKey] || 0) + 1;

    const violations = [];

    if (req.handoffCount > this.config.maxHandoffsPerRequest) {
      violations.push(`Exceeded max handoffs: ${req.handoffCount}`);
    }

    if (req.attempts[agentKey] > this.config.maxAttemptsPerAgent) {
      violations.push(`Agent ${agentKey} exceeded max attempts: ${req.attempts[agentKey]}`);
    }

    if (req.tokensUsed > this.config.maxTokensPerRequest) {
      violations.push(`Exceeded token budget: ${req.tokensUsed}`);
    }

    const elapsed = Date.now() - req.startTime;
    if (elapsed > this.config.maxTimePerRequest) {
      violations.push(`Exceeded time limit: ${elapsed}ms`);
    }

    if (violations.length > 0) {
      req.violations.push(...violations);
    }

    return {
      allowed: violations.length === 0,
      violations,
      handoffCount: req.handoffCount,
      attemptCount: req.attempts[agentKey],
      tokensUsed: req.tokensUsed,
      elapsedMs: elapsed,
    };
  }

  /**
   * Get status
   */
  getStatus(parentRunId) {
    const req = this.requests.get(parentRunId);
    if (!req) return null;

    return {
      handoffCount: req.handoffCount,
      attempts: req.attempts,
      tokensUsed: req.tokensUsed,
      elapsedMs: Date.now() - req.startTime,
      violations: req.violations,
    };
  }
}

module.exports = LoopGuard;