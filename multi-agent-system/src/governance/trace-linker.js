/**
 * Trace Linker
 * 
 * Links parent and child agent runs together
 * 
 * One logical request spans multiple agent executions
 * All executions share one correlation ID
 */

class TraceLinker {
  constructor() {
    this.traces = new Map();
  }

  /**
   * Create parent trace for initial customer request
   */
  createParentTrace(initiatingUser, originalRequest) {
    const parentRunId = `run-parent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const correlationId = `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const trace = {
      parentRunId,
      correlationId,
      initiatingUser,
      originalRequest,
      requestReceivedAt: new Date().toISOString(),
      agents: [], // child traces
    };

    this.traces.set(parentRunId, trace);
    return trace;
  }

  /**
   * Create child trace when agent hands off to another
   */
  createChildTrace(parentRunId, sourceAgent, destinationAgent, stateTransferred, scopeTransferred) {
    const childRunId = `run-child-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const parent = this.traces.get(parentRunId);

    if (!parent) {
      throw new Error(`Parent trace not found: ${parentRunId}`);
    }

    const child = {
      parentRunId,
      childRunId,
      correlationId: parent.correlationId, // Same correlation ID across chain
      sourceAgent,
      destinationAgent,
      handoffAt: new Date().toISOString(),
      stateTransferred,
      scopeTransferred,
      actions: [],
      result: null,
    };

    parent.agents.push(child);
    return child;
  }

  /**
   * Log an action within agent execution
   */
  logAgentAction(parentRunId, childRunId, action, result) {
    const parent = this.traces.get(parentRunId);
    if (!parent) {
      throw new Error(`Parent trace not found: ${parentRunId}`);
    }

    const child = parent.agents.find(a => a.childRunId === childRunId);
    if (!child) {
      throw new Error(`Child trace not found: ${childRunId}`);
    }

    child.actions.push({
      action,
      result,
      timestamp: new Date().toISOString(),
    });

    return child;
  }

  /**
   * Complete child agent execution
   */
  completeChildTrace(parentRunId, childRunId, result) {
    const parent = this.traces.get(parentRunId);
    const child = parent.agents.find(a => a.childRunId === childRunId);

    child.result = {
      outcome: result.success ? 'success' : 'failure',
      reason: result.reason || '',
      output: result.output || {},
      completedAt: new Date().toISOString(),
    };

    return child;
  }

  /**
   * Complete entire parent trace
   */
  completeParentTrace(parentRunId, finalResult) {
    const parent = this.traces.get(parentRunId);
    parent.finalResult = finalResult;
    parent.completedAt = new Date().toISOString();
    return parent;
  }

  /**
   * Export trace as evidence
   */
  exportAsEvidence(parentRunId) {
    const trace = this.traces.get(parentRunId);
    if (!trace) return null;

    return {
      correlationId: trace.correlationId,
      initiatingUser: trace.initiatingUser,
      originalRequest: trace.originalRequest,
      requestReceivedAt: trace.requestReceivedAt,
      agentChain: trace.agents.map(a => ({
        agent: a.destinationAgent,
        runId: a.childRunId,
        stateReceived: a.stateTransferred,
        scopeReceived: a.scopeTransferred,
        handoffAt: a.handoffAt,
        actionsCount: a.actions.length,
        result: a.result,
      })),
      finalResult: trace.finalResult,
      completedAt: trace.completedAt,
    };
  }

  /**
   * Get trace
   */
  getTrace(parentRunId) {
    return this.traces.get(parentRunId);
  }
}

module.exports = TraceLinker;