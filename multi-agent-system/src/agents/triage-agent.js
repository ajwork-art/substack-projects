/**
 * Triage Agent
 *
 * Uses Claude to read an incoming customer complaint and classify it.
 *
 * Jobs:
 * - Summarize the issue
 * - Extract account or case IDs
 * - Classify the problem type
 * - Flag churn risk
 * - Create typed handoff for next agent
 *
 * Does NOT:
 * - Evaluate policy
 * - Approve anything
 * - Execute write actions
 */

const Anthropic = require('@anthropic-ai/sdk');

class TriageAgent {
  constructor(dependencies) {
    this.handoffContract = dependencies.handoffContract;
    this.traceLinker = dependencies.traceLinker;
    this.idempotencyManager = dependencies.idempotencyManager;
    this.loopGuard = dependencies.loopGuard;
    this.jsonStore = dependencies.jsonStore;
    this.anthropic = new Anthropic();
  }

  /**
   * Triage an incoming customer request using Claude
   */
  async triage(parentRunId, customerRequest) {
    console.log('\n=== TRIAGE AGENT (LLM) ===\n');

    const complaintText = customerRequest.text || customerRequest.description || '';
    console.log(`Complaint: ${complaintText}`);

    // Call Claude to classify the complaint
    const { classification, tokensUsed } = await this.classifyWithLLM(complaintText, customerRequest);
    console.log('Classification:', JSON.stringify(classification, null, 2));

    // Create typed handoff — only the fields the handoff contract allows
    const handoff = {
      sourceAgent: 'triage-agent',
      destinationAgent: 'policy-specialist',
      parentRunId,
      stateTransferred: {
        caseId: classification.caseId,
        accountId: classification.accountId,
        issueType: classification.issueType,
        churnRisk: classification.churnRisk,
      },
      scopeTransferred: {
        read: ['policy-articles', 'historical-fee-reversals'],
        write: [],
      },
    };

    // Validate handoff against contract
    const validation = this.handoffContract.validateHandoff(
      'triage-agent',
      'policy-specialist',
      handoff
    );

    if (!validation.valid) {
      console.error('❌ HANDOFF VALIDATION FAILED');
      console.error('Violations:', validation.violations);
      throw new Error('Handoff validation failed');
    }

    console.log('✅ Handoff contract validated');

    // Record in loop guard, passing actual token usage from the LLM call
    const guardCheck = this.loopGuard.recordHandoff(
      parentRunId,
      'triage-agent',
      'policy-specialist',
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
   * Use Claude with tool use to extract structured classification from the complaint
   */
  async classifyWithLLM(complaintText, requestContext) {
    const response = await this.anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a banking customer service triage agent. Your only job is to read a customer complaint and classify it accurately.

Issue types:
- overdraft_fee: customer was charged an overdraft fee
- duplicate_charge: customer was charged twice for the same transaction
- duplicate_charge_overdraft: both a duplicate charge AND an overdraft fee are present
- general_dispute: a billing or account dispute that does not fit the above
- other: anything else

Churn risk levels:
- high: customer explicitly mentions leaving, switching banks, or closing the account
- medium: customer is clearly frustrated or mentions a repeated problem
- low: factual complaint with no strong emotional signal

For accountId: extract from the complaint if mentioned. If not found, use the value from request context or default to "A100".
For caseId: generate a unique case ID in the format CS-XXXXXXX using random alphanumeric characters.
For summary: write one clear sentence describing what happened.`,
      messages: [{
        role: 'user',
        content: `Customer complaint: "${complaintText}"\n\nRequest context: ${JSON.stringify({ userId: requestContext.userId || requestContext.initiatingUser || 'unknown' })}`
      }],
      tools: [{
        name: 'classify_complaint',
        description: 'Classify the customer complaint into structured fields for downstream processing',
        input_schema: {
          type: 'object',
          properties: {
            issueType: {
              type: 'string',
              enum: ['overdraft_fee', 'duplicate_charge', 'duplicate_charge_overdraft', 'general_dispute', 'other'],
              description: 'The category of the customer issue'
            },
            churnRisk: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Risk that the customer will leave the bank'
            },
            summary: {
              type: 'string',
              description: 'One sentence summary of the issue'
            },
            accountId: {
              type: 'string',
              description: 'Account identifier extracted from the complaint or context'
            },
            caseId: {
              type: 'string',
              description: 'Unique case ID generated for this complaint, format: CS-XXXXXXX'
            }
          },
          required: ['issueType', 'churnRisk', 'summary', 'accountId', 'caseId']
        }
      }],
      tool_choice: { type: 'tool', name: 'classify_complaint' }
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) {
      throw new Error('Triage agent: Claude did not return a tool use block');
    }

    const tokensUsed = (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0);

    return { classification: toolUse.input, tokensUsed };
  }
}

module.exports = TriageAgent;
