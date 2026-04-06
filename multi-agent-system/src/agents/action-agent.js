/**
 * Action Agent
 *
 * Uses Claude to determine the appropriate action plan, then creates
 * a pending approval record. Never executes writes directly.
 *
 * Jobs:
 * - Use Claude to determine action type and amount from the policy decision
 * - Check idempotency before creating any record
 * - Create a pending approval request for human review
 * - Record the result for audit
 *
 * Does NOT:
 * - Invent policy decisions
 * - Inherit upstream authority without validation
 * - Write or execute any financial action without approval
 */

const Anthropic = require('@anthropic-ai/sdk');

class ActionAgent {
  constructor(dependencies) {
    this.handoffContract = dependencies.handoffContract;
    this.identityManager = dependencies.identityManager;
    this.traceLinker = dependencies.traceLinker;
    this.idempotencyManager = dependencies.idempotencyManager;
    this.jsonStore = dependencies.jsonStore;
    this.anthropic = new Anthropic();
  }

  /**
   * Build action plan using Claude, then create approval request
   */
  async execute(parentRunId, policyHandoff, initiatingUser) {
    console.log('\n=== ACTION AGENT (LLM) ===\n');

    const { caseId, accountId, policyDecision, approvalRequired } = policyHandoff.stateTransferred;
    const policyMeta = policyHandoff.policyMeta || {};

    // Check idempotency before doing anything
    const idempotencyKey = this.idempotencyManager.generateKey(
      initiatingUser,
      caseId,
      'fee-reversal'
    );

    console.log(`Idempotency key: ${idempotencyKey}`);

    if (this.idempotencyManager.hasBeenProcessed(idempotencyKey)) {
      console.log('⚠️  DUPLICATE ACTION DETECTED — returning cached result');
      return this.idempotencyManager.getProcessedResult(idempotencyKey);
    }

    // Only proceed if policy says eligible
    if (policyDecision === 'not-eligible' || policyDecision === 'requires-investigation') {
      const result = {
        approvalRequestId: null,
        status: policyDecision,
        message: policyMeta.reason || 'Case requires investigation or is not eligible for reversal.',
        caseId,
        accountId,
      };
      this.idempotencyManager.recordProcessed(idempotencyKey, result);
      console.log('Case outcome:', result.status);
      return result;
    }

    // Call Claude to determine the precise action plan
    const { plan } = await this.planWithLLM({ caseId, accountId, policyDecision, policyMeta });
    console.log('Action plan:', JSON.stringify(plan, null, 2));

    // Create the pending approval record
    const approvalRequest = {
      approvalRequestId: `appr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      targetAccount: accountId,
      targetCase: caseId,
      action: plan.actionType,
      amount: plan.recommendedAmount,
      urgency: plan.urgency,
      notes: plan.notes,
      proposedBy: 'action-agent',
      status: approvalRequired ? 'pending_approval' : 'auto_approved',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };

    console.log('Approval request created:');
    console.log(JSON.stringify(approvalRequest, null, 2));

    // Record idempotency so retries return this same result
    this.idempotencyManager.recordProcessed(idempotencyKey, approvalRequest);

    // Write to the approvals store
    this.jsonStore.append('approvals.json', approvalRequest);

    return approvalRequest;
  }

  /**
   * Use Claude to determine the precise action type and recommended amount
   */
  async planWithLLM({ caseId, accountId, policyDecision, policyMeta }) {
    const response = await this.anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a banking action planning agent. You receive a policy decision and must determine the precise action to take.

Your job is to translate the policy decision into a concrete, bounded action plan.

Rules:
- For fee-reversal-eligible: set actionType to "fee_reversal". Amount must not exceed the policy maxAmount.
- For retention-credit-eligible: set actionType to "retention_credit". Use a modest amount (typically $25–$50).
- Amount must never exceed $150.
- Urgency should reflect the policy urgency.
- Notes should be a brief plain-language explanation suitable for a human approver to read.
- Do not invent actions beyond what the policy decision supports.`,
      messages: [{
        role: 'user',
        content: `Policy decision received:\n${JSON.stringify({ caseId, accountId, policyDecision, ...policyMeta }, null, 2)}\n\nCreate the action plan.`
      }],
      tools: [{
        name: 'create_action_plan',
        description: 'Define the concrete action to submit for approval',
        input_schema: {
          type: 'object',
          properties: {
            actionType: {
              type: 'string',
              description: 'Type of action: fee_reversal or retention_credit'
            },
            recommendedAmount: {
              type: 'number',
              description: 'Dollar amount to reverse or credit. Must not exceed 150.'
            },
            urgency: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Urgency level for the approver'
            },
            notes: {
              type: 'string',
              description: 'Brief explanation for the human approver (1–2 sentences)'
            }
          },
          required: ['actionType', 'recommendedAmount', 'urgency', 'notes']
        }
      }],
      tool_choice: { type: 'tool', name: 'create_action_plan' }
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) {
      throw new Error('Action agent: Claude did not return a tool use block');
    }

    // Enforce hard cap regardless of what Claude returns
    if (toolUse.input.recommendedAmount > 150) {
      toolUse.input.recommendedAmount = 150;
    }

    return { plan: toolUse.input };
  }
}

module.exports = ActionAgent;
