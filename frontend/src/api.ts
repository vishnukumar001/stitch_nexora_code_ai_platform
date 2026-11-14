// Frontend API client communicating with NEXORA Code FastAPI backend

const API_BASE = '/api';

export interface KPIStats {
  has_live_data?: boolean;
  live_tasks_count?: number;
  tasks_completed: number;
  tasks_success_rate: number;
  tokens_consumed: string;
  tokens_budget_cap: string;
  tokens_consumed_pct: number;
  token_savings: string;
  token_savings_pct: number;
  cost_saved_usd: number;
  current_spend_usd: number;
  budget_cap_usd: number;
  spend_pct: number;
}

export interface Provider {
  id: string;
  name: string;
  tier: string;
  model_name: string;
  status: 'online' | 'standby' | 'degraded' | 'offline' | 'connected' | 'disconnected' | 'not_configured' | 'testing';
  latency_ms: number;
  p95_latency_ms: number;
  uptime_pct: number;
  cost_per_m_in: number;
  cost_per_m_out: number;
  is_local: boolean;
  circuit_breaker_tripped: boolean;
  failure_count: number;
  endpoint_url?: string;
  has_api_key: boolean;
}

export interface TaskRecord {
  id: string;
  title: string;
  repo_id: string;
  branch: string;
  prompt: string;
  solution_summary: string;
  model_used: string;
  cascade_chain: string[];
  is_confidential_routed: boolean;
  tokens_uncompressed: number;
  tokens_compressed: number;
  tokens_saved: number;
  compression_ratio: number;
  cost_billed_usd: number;
  cost_saved_usd: number;
  latency_ms: number;
  status: string;
  reasoning_steps: Array<{
    step_number: number;
    title: string;
    description: string;
    duration_s: number;
    tokens_saved?: number;
    status?: string;
  }>;
  diffs: Array<{
    filename: string;
    lines_added: number;
    lines_deleted: number;
    diff_text: string;
  }>;
  approval_id?: string;
  created_at: number;
  is_demo?: boolean;
  execution_mode?: string;
}

export interface Repository {
  id: string;
  name: string;
  branch: string;
  language: string;
  is_confidential: boolean;
  ast_indexed: boolean;
  contributors_count: number;
  total_loc: number;
  privacy_mode: string;
}

export interface ActionApproval {
  id: string;
  task_id: string;
  action_type: 'shell_execution' | 'file_write' | 'git_operation';
  title: string;
  description: string;
  command_or_diff: string;
  target_resource: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  created_at: number;
  risk_analysis?: string;
  sandbox_id?: string;
}

export interface BudgetPolicy {
  id: string;
  user_id: string;
  monthly_budget_usd: number;
  current_spend_usd: number;
  reserved_spend_usd?: number;
  monthly_token_cap: number;
  current_tokens_used: number;
  reserved_tokens?: number;
  hard_limit_enforced: boolean;
  auto_throttle_active: boolean;
  alert_threshold_pct: number;
  runway_days: number;
  budget_utilized_pct: number;
  tokens_utilized_pct: number;
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  return res.json();
}

export async function fetchRepositories(): Promise<Repository[]> {
  const res = await fetch(`${API_BASE}/repositories`);
  return res.json();
}

export async function updateRepoPrivacy(repoId: string, isConfidential: boolean) {
  const res = await fetch(`${API_BASE}/repositories/${repoId}/privacy?is_confidential=${isConfidential}`, {
    method: 'PATCH'
  });
  return res.json();
}

export interface TaskAnalyzeResponse {
  understood_task: string;
  relevant_files: Array<{
    name: string;
    role: string;
    loc: number;
    ast_sliced: boolean;
  }>;
  estimated_tokens_raw: number;
  estimated_tokens_compact: number;
  token_savings_pct: number;
  selected_provider: string;
  is_confidential: boolean;
  execution_plan: Array<{
    step: number;
    title: string;
    detail: string;
  }>;
  requires_approval: boolean;
}

export async function analyzeAgentTask(params: {
  prompt: string;
  repo_id: string;
  is_confidential?: boolean;
}): Promise<TaskAnalyzeResponse> {
  const res = await fetch(`${API_BASE}/tasks/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail?.message || err.detail || 'Analysis failed');
  }
  return res.json();
}

export async function executeAgentTask(params: {
  prompt: string;
  repo_id: string;
  strategy?: string;
  safe_mode?: boolean;
  is_confidential?: boolean;
}): Promise<TaskRecord> {
  const res = await fetch(`${API_BASE}/tasks/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail?.message || err.detail || 'Execution failed');
  }
  return res.json();
}

export async function fetchTasks(): Promise<TaskRecord[]> {
  const res = await fetch(`${API_BASE}/tasks`);
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  return res.json();
}

export async function fetchRouterTopology() {
  const res = await fetch(`${API_BASE}/router`);
  return res.json();
}

export async function triggerFailoverTest(providerId: string = 'prov-claude') {
  const res = await fetch(`${API_BASE}/router/failover-test?provider_id=${providerId}`, {
    method: 'POST'
  });
  return res.json();
}

export async function fetchBudget(): Promise<BudgetPolicy> {
  const res = await fetch(`${API_BASE}/budget`);
  return res.json();
}

export async function updateBudget(policy: Partial<BudgetPolicy>) {
  const res = await fetch(`${API_BASE}/budget`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(policy)
  });
  return res.json();
}

export async function fetchApprovals(): Promise<ActionApproval[]> {
  const res = await fetch(`${API_BASE}/approvals`);
  return res.json();
}

export async function resolveApproval(
  approvalId: string,
  decision: 'approved' | 'rejected' | 'revision_requested',
  notes?: string,
  expectedDiffHash?: string,
  approveGitCommit?: boolean
) {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision,
      reviewer: 'TEAM ARISE',
      notes,
      expected_diff_hash: expectedDiffHash,
      approve_git_commit: approveGitCommit ?? true
    })
  });
  return res.json();
}

export async function toggleKillSwitch(engaged: boolean) {
  const res = await fetch(`${API_BASE}/security/kill-switch?engaged=${engaged}`, {
    method: 'POST'
  });
  return res.json();
}

export async function fetchSecurityStatus() {
  const res = await fetch(`${API_BASE}/security/status`);
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  return res.json();
}

export async function addVaultSecret(providerId: string, apiKey: string) {
  const res = await fetch(`${API_BASE}/settings/vault?provider_id=${providerId}&api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST'
  });
  return res.json();
}

