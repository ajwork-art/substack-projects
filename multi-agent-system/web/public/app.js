const runBtn = document.getElementById('run-btn');
const complaintEl = document.getElementById('complaint');
const accountIdEl = document.getElementById('account-id');
const userIdEl = document.getElementById('user-id');
const pipelineEl = document.getElementById('pipeline');
const errorBanner = document.getElementById('error-banner');
const summaryEl = document.getElementById('summary');

runBtn.addEventListener('click', run);
complaintEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run();
});

async function run() {
  const complaint = complaintEl.value.trim();
  if (!complaint) {
    complaintEl.focus();
    return;
  }

  errorBanner.style.display = 'none';
  summaryEl.innerHTML = '';
  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="spinner"></span> Running pipeline...';

  renderInitialStages();

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaint,
        accountId: accountIdEl.value.trim() || undefined,
        userId: userIdEl.value.trim() || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Pipeline failed');
      resetStages();
      return;
    }

    renderResults(data);
  } catch (err) {
    showError(err.message);
    resetStages();
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = 'Run Pipeline';
  }
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.style.display = 'block';
}

const STAGE_DEFS = [
  { key: 'triage',  name: 'Triage Agent',      num: '1' },
  { key: 'policy',  name: 'Policy Specialist',  num: '2' },
  { key: 'action',  name: 'Action Agent',       num: '3' },
];

function renderInitialStages() {
  pipelineEl.innerHTML = '';
  STAGE_DEFS.forEach((def, i) => {
    if (i > 0) pipelineEl.insertAdjacentHTML('beforeend', '<div class="connector"></div>');
    pipelineEl.insertAdjacentHTML('beforeend', stageShell(def.num, def.name, 'loading', 'Running...'));
  });
}

function resetStages() {
  pipelineEl.innerHTML = '';
  STAGE_DEFS.forEach((def, i) => {
    if (i > 0) pipelineEl.insertAdjacentHTML('beforeend', '<div class="connector"></div>');
    pipelineEl.insertAdjacentHTML('beforeend', stageShell(def.num, def.name, '', 'Pending'));
  });
}

function stageShell(num, name, cls, badge) {
  return `
    <div class="stage-card ${cls}" id="stage-${num}">
      <div class="stage-header" onclick="toggleStage('stage-${num}')">
        <div class="stage-title">
          <div class="stage-icon">${num}</div>
          <span class="stage-name">${name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="stage-badge">${badge}</span>
          <span class="chevron">▼</span>
        </div>
      </div>
      <div class="stage-body"></div>
    </div>`;
}

function renderResults(data) {
  pipelineEl.innerHTML = '';

  data.stages.forEach((stage, i) => {
    if (i > 0) pipelineEl.insertAdjacentHTML('beforeend', '<div class="connector"></div>');

    const num = String(i + 1);
    const card = document.createElement('div');
    card.className = 'stage-card done' + (i === 0 ? ' open' : '');
    card.id = `stage-${num}`;

    card.innerHTML = `
      <div class="stage-header" onclick="toggleStage('stage-${num}')">
        <div class="stage-title">
          <div class="stage-icon">✓</div>
          <span class="stage-name">${stage.name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="stage-badge">Done</span>
          <span class="chevron">▼</span>
        </div>
      </div>
      <div class="stage-body">${renderStageBody(stage)}</div>`;

    pipelineEl.appendChild(card);
  });

  renderSummary(data);
}

function renderStageBody(stage) {
  if (stage.agent === 'triage-agent') {
    return renderTriage(stage);
  } else if (stage.agent === 'policy-specialist') {
    return renderPolicy(stage);
  } else if (stage.agent === 'action-agent') {
    return renderAction(stage);
  }
  return '';
}

function renderTriage(stage) {
  const s = stage.state;
  return `
    <div class="kv-grid">
      <span class="kv-label">Case ID</span>
      <span class="kv-value mono">${s.caseId}</span>
      <span class="kv-label">Account ID</span>
      <span class="kv-value mono">${s.accountId}</span>
      <span class="kv-label">Issue Type</span>
      <span class="kv-value"><span class="badge blue">${s.issueType}</span></span>
      <span class="kv-label">Churn Risk</span>
      <span class="kv-value"><span class="badge ${s.churnRisk}">${s.churnRisk}</span></span>
      <span class="kv-label">Scope transferred</span>
      <span class="kv-value mono">${stage.scope.read.join(', ')}</span>
      <span class="kv-label">Write scope</span>
      <span class="kv-value"><span class="badge gray">none</span></span>
    </div>
    <button class="detail-toggle" onclick="toggleJson(this)">Show handoff contract</button>
    <pre class="json-block">${escJson(stage.handoffContract)}</pre>`;
}

function renderPolicy(stage) {
  const s = stage.state;
  const m = stage.policyMeta;
  return `
    <div class="kv-grid">
      <span class="kv-label">Case ID</span>
      <span class="kv-value mono">${s.caseId}</span>
      <span class="kv-label">Decision</span>
      <span class="kv-value"><span class="badge ${decisionColor(s.policyDecision)}">${s.policyDecision}</span></span>
      <span class="kv-label">Approval required</span>
      <span class="kv-value"><span class="badge ${s.approvalRequired ? 'high' : 'green'}">${s.approvalRequired ? 'yes' : 'no'}</span></span>
      <span class="kv-label">Proposed action</span>
      <span class="kv-value">${m.proposedAction}</span>
      <span class="kv-label">Max amount</span>
      <span class="kv-value">$${m.maxAmount}</span>
      <span class="kv-label">Urgency</span>
      <span class="kv-value"><span class="badge ${m.urgency}">${m.urgency}</span></span>
      <span class="kv-label">Reason</span>
      <span class="kv-value">${m.reason}</span>
      <span class="kv-label">Scope reduced to</span>
      <span class="kv-value mono">${stage.scope.read.join(', ')}</span>
    </div>
    <button class="detail-toggle" onclick="toggleJson(this)">Show handoff contract</button>
    <pre class="json-block">${escJson(stage.handoffContract)}</pre>`;
}

function renderAction(stage) {
  const a = stage.approvalRequest;
  return `
    <div class="kv-grid">
      <span class="kv-label">Approval ID</span>
      <span class="kv-value mono">${a.approvalRequestId}</span>
      <span class="kv-label">Action</span>
      <span class="kv-value"><span class="badge blue">${a.action}</span></span>
      <span class="kv-label">Amount</span>
      <span class="kv-value">$${a.amount}</span>
      <span class="kv-label">Urgency</span>
      <span class="kv-value"><span class="badge ${a.urgency}">${a.urgency}</span></span>
      <span class="kv-label">Status</span>
      <span class="kv-value"><span class="badge blue">${a.status}</span></span>
      <span class="kv-label">Notes</span>
      <span class="kv-value">${a.notes || '—'}</span>
      <span class="kv-label">Expires</span>
      <span class="kv-value">${new Date(a.expiresAt).toLocaleString()}</span>
    </div>
    <button class="detail-toggle" onclick="toggleJson(this)">Show full approval request</button>
    <pre class="json-block">${escJson(a)}</pre>`;
}

function renderSummary(data) {
  const a = data.approvalRequest;
  summaryEl.innerHTML = `
    <div class="summary-card">
      <h3>Pipeline complete</h3>
      <div class="kv-grid">
        <span class="kv-label">Approval request</span>
        <span class="kv-value mono">${a.approvalRequestId}</span>
        <span class="kv-label">Action</span>
        <span class="kv-value">${a.action} — $${a.amount}</span>
        <span class="kv-label">Status</span>
        <span class="kv-value"><span class="badge blue">${a.status}</span></span>
        <span class="kv-label">Correlation ID</span>
        <span class="kv-value mono">${data.correlationId}</span>
      </div>
    </div>`;
}

function toggleStage(id) {
  document.getElementById(id).classList.toggle('open');
}

function toggleJson(btn) {
  const block = btn.nextElementSibling;
  const visible = block.classList.toggle('visible');
  btn.textContent = visible ? 'Hide' : btn.textContent.replace('Hide', 'Show');
  if (!visible) {
    // restore label
    const label = btn.textContent.startsWith('Hide') ? btn.textContent.replace('Hide', 'Show') : btn.textContent;
    btn.textContent = label;
  }
}

function decisionColor(d) {
  if (d === 'fee-reversal-eligible' || d === 'retention-credit-eligible') return 'green';
  if (d === 'requires-investigation') return 'medium';
  return 'high';
}

function escJson(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Render empty stage placeholders on load
resetStages();
