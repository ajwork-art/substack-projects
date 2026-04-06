/**
 * Policy Specialist Agent
 *
 * Uses Claude to evaluate whether a classified case qualifies for a fee reversal
 * under bank policy, and creates a reduced-scope handoff to the action agent.
 *
 * Jobs:
 * - Evaluate case eligibility against fee policy
 * - Decide whether approval is required
 * - Create reduced-scope handoff to action agent
 *
 * Does NOT:
 * - Inherit broad triage scope
 * - Execute the final write
 * - Bypass approval requirements
 */

const Anthropic = require('@anthropic-ai/sdk');

class PolicySpecialist {
  constructor(dependencies) {
    this.handoffContract = dependencies.handoffContract;
    this.scopeReducer = dependencies.scopeReducer;
    this.traceLinker = dependencies.traceLinker;
    this.loopGuard = dependencies.loopGuard;
    this.anthropic = new Anthropic();
  }

  /**
   * Evaluate policy eligibility using Claude
   */
  async evaluate(parentRunId, triageHandoff) {
    console.log('\n=== POLICY SPECIALIST (LLM) ===\n');

    // Validate scope reduction before proceeding
    const scopeCheck = this.scopeReducer.validateScopeReduction(
      triageHandoff.scopeTransferred,
      this.handoffContract.getContract('triage-agent', 'policy-specialist').scopeTransferred
    );

    if (!scopeCheck.valid) {
      console.error('❌ SCOPE REDUCTION FAILED');
      throw new Error('Scope validation failed');
    }

    console.log('✅ Scope reduction validated');
    console.log('Evaluating case:', JSON.stringify(triageHandoff.stateTransferred, null, 2));

    // Call Claude to evaluate the policy
    const { decision, tokensUsed } = await this.evaluateWithLLM(triageHandoff.stateTransferred);
    console.log('Policy decision:', JSON.stringify(decision, null, 2));

    // Build reduced-scope handoff — only what the action agent needs
    const handoff = {
      sourceAgent: 'policy-specialist',
      destinationAgent: 'action-agent',
      parentRunId,
      stateTransferred: {
        caseId: triageHandoff.stateTransferred.caseId,
        accountId: triageHandoff.stateTransferred.accountId,
        policyDecision: decision.decision,
        approvalRequired: decision.approvalRequired,
      },
      scopeTransferred: {
        read: ['approval-status'],
        write: [],
      },
      // Carry forward for action agent internal use (not in stateTransferred contract)
      policyMeta: {
        proposedAction: decision.proposedAction,
        maxAmount: decision.maxAmount,
        reason: decision.reason,
        urgency: decision.urgency,
      },
    };

    // Validate handoff against contract
    const validation = this.handoffContract.validateHandoff(
      'policy-specialist',
      'action-agent',
      handoff
    );

    if (!validation.valid) {
      console.error('❌ HANDOFF VALIDATION FAILED');
      console.error('Violations:', validation.violations);
      throw new Error('Handoff validation failed');
    }

    console.log('✅ Handoff contract validated');

    // Record in loop guard with actual token usage
    const guardCheck = this.loopGuard.recordHandoff(
      parentRunId,
      'policy-specialist',
      'action-agent',
      tokensUsed
    );

    if (!guardCheck.allowed) {
      console.error('❌ HANDOFF BLOCKED BY LOOP GUARD');
      console.error('Violations:', guardCheck.violations);
      throw new Error('Loop guard violation');
    }

    return handoff;
  }

  /**
   * Use Claude with tool use to evaluate policy eligibility
   */
  async evaluateWithLLM(caseState) {
    const response = await this.anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a banking policy specialist. Evaluate whether a customer case qualifies for a fee reversal or credit under bank policy.

Bank fee reversal policy:
- Overdraft fees: eligible for reversal once per 12-month period per account. Always requires manager approval.
- Duplicate charges: always eligible for full reversal. Always requires manager approval.
- Combined overdraft + duplicate charge: eligible for both reversals. High priority. Requires manager approval.
- General disputes: require investigation before a decision can be made.
- Maximum single reversal amount: $150.

Urgency rules:
- High churn risk cases must be marked high urgency.
- Duplicate charges are always at least medium urgency.
- All other cases default to low urgency.

Be conservative. If there is any doubt about eligibility, set decision to requires-investigation.
All write actions require approval — never set approvalRequired to false for fee reversals.`,
      messages: [{
        role: 'user',
        content: `Evaluate this case for policy eligibility:\n${JSON.stringify(caseState, null, 2)}`
      }],
      tools: [{
        name: 'evaluate_policy',
        description: 'Return a policy eligibility decision for the case',
        input_schema: {
          type: 'object',
          properties: {
            decision: {
              type: 'string',
              enum: ['fee-reversal-eligible', 'retention-credit-eligible', 'requires-investigation', 'not-eligible'],
              description: 'Policy eligibility outcome'
            },
            approvalRequired: {
              type: 'boolean',
              description: 'Whether manager approval is required before executing the action'
            },
            proposedAction: {
              type: 'string',
              description: 'Plain language description of the recommended action'
            },
            maxAmount: {
              type: 'number',
              description: 'Maximum dollar amount for the reversal or credit'
            },
            reason: {
              type: 'string',
              description: 'Brief explanation of why this decision was reached'
            },
            urgency: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'How urgently this case should be handled'
            }
          },
          required: ['decision', 'approvalRequired', 'proposedAction', 'maxAmount', 'reason', 'urgency']
        }
      }],
      tool_choice: { type: 'tool', name: 'evaluate_policy' }
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) {
      throw new Error('Policy specialist: Claude did not return a tool use block');
    }

    const tokensUsed = (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0);

    return { decision: toolUse.input, tokensUsed };
  }
}

module.exports = PolicySpecialist;
