/**
 * Identity Manager
 * 
 * Reissues identity at handoff boundaries
 * 
 * Core principle: Each agent gets its own workload identity
 * No inherited tokens. No shared credentials.
 */

class IdentityManager {
  constructor() {
    this.issuedIdentities = new Map();
    this.auditLog = [];
  }

  /**
   * Issue a new identity for an agent at a handoff
   */
  issueIdentity(parentRunId, childRunId, sourceAgent, destinationAgent, scope) {
    const agentId = `${destinationAgent}-${childRunId.split('-').pop()}`;

    const identity = {
      agentId,
      agentName: destinationAgent,
      parentRunId,
      childRunId,
      sourcedFrom: sourceAgent,
      scope,
      issuedAt: new Date().toISOString(),
      ttlSeconds: 3600, // 1 hour
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };

    this.issuedIdentities.set(agentId, identity);

    // Audit log
    this.auditLog.push({
      event: 'identity_issued',
      agentId,
      parentRunId,
      childRunId,
      sourceAgent,
      destinationAgent,
      scope,
      issuedAt: identity.issuedAt,
    });

    return identity;
  }

  /**
   * Validate that identity is valid and in scope
   */
  validateIdentity(agentId, requestedAction) {
    const identity = this.issuedIdentities.get(agentId);

    if (!identity) {
      return {
        valid: false,
        reason: 'Identity not found',
      };
    }

    const now = new Date();
    const expiresAt = new Date(identity.expiresAt);

    // Check expiry
    if (now > expiresAt) {
      return {
        valid: false,
        reason: 'Identity expired',
      };
    }

    // Check scope
    const actionScope = requestedAction.scope || requestedAction.tool;
    const hasScope = identity.scope.read?.includes(actionScope) ||
                     identity.scope.write?.includes(actionScope);

    if (!hasScope && requestedAction.action !== 'introspect') {
      return {
        valid: false,
        reason: `Action ${actionScope} not in scope`,
      };
    }

    return {
      valid: true,
      agentId,
      scope: identity.scope,
    };
  }

  /**
   * Get audit log
   */
  getAuditLog() {
    return this.auditLog;
  }
}

module.exports = IdentityManager;