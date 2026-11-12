from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import time

class PrivacyMode(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"

class ActionType(str, Enum):
    SHELL_EXECUTION = "shell_execution"
    FILE_WRITE = "file_write"
    GIT_OPERATION = "git_operation"

class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"

class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ProviderStatus(str, Enum):
    ONLINE = "online"
    STANDBY = "standby"
    DEGRADED = "degraded"
    OFFLINE = "offline"

# Repository Schema
class Repository(BaseModel):
    id: str
    name: str
    branch: str = "main"
    language: str
    is_confidential: bool = False
    ast_indexed: bool = True
    contributors_count: int = 1
    total_loc: int = 0
    privacy_mode: PrivacyMode = PrivacyMode.INTERNAL
    local_path: Optional[str] = None

class RepositoryCreate(BaseModel):
    name: str
    branch: str = "main"
    language: str
    is_confidential: bool = False
    privacy_mode: PrivacyMode = PrivacyMode.INTERNAL

# Provider Schema
class Provider(BaseModel):
    id: str
    name: str
    tier: str # "P0 Privacy (Local)", "P1 Primary", "P2 Fast-Path", "P3 Fallback", "Bifrost Gateway"
    model_name: str
    status: ProviderStatus = ProviderStatus.ONLINE
    latency_ms: int = 120
    p95_latency_ms: int = 142
    uptime_pct: float = 99.98
    cost_per_m_in: float
    cost_per_m_out: float
    is_local: bool = False
    circuit_breaker_tripped: bool = False
    failure_count: int = 0
    endpoint_url: Optional[str] = None
    has_api_key: bool = True

class ProviderUpdate(BaseModel):
    status: Optional[ProviderStatus] = None
    circuit_breaker_tripped: Optional[bool] = None
    latency_ms: Optional[int] = None

# Action Approval Schema
class ActionApproval(BaseModel):
    id: str
    task_id: str
    action_type: ActionType
    title: str
    description: str
    command_or_diff: str
    target_resource: str # e.g. "prod-core-monorepo:services/jwt_validator.go"
    severity: SeverityLevel = SeverityLevel.MEDIUM
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: float = Field(default_factory=time.time)
    resolved_at: Optional[float] = None
    resolved_by: Optional[str] = None
    risk_analysis: str = ""
    sandbox_id: Optional[str] = "nx-sandbox-849"

class ApprovalDecision(BaseModel):
    decision: ApprovalStatus # APPROVED or REJECTED or REVISION_REQUESTED
    notes: Optional[str] = None
    reviewer: str = "Elena Rostova"

# Budget Schema
class BudgetPolicy(BaseModel):
    id: str
    user_id: str = "usr_elena_01"
    monthly_budget_usd: float = 1200.0
    current_spend_usd: float = 482.40
    monthly_token_cap: int = 45_000_000
    current_tokens_used: int = 14_820_000
    hard_limit_enforced: bool = True
    auto_throttle_active: bool = True
    alert_threshold_pct: float = 80.0
    runway_days: int = 18

class BudgetUpdate(BaseModel):
    monthly_budget_usd: Optional[float] = None
    monthly_token_cap: Optional[int] = None
    hard_limit_enforced: Optional[bool] = None
    auto_throttle_active: Optional[bool] = None
    alert_threshold_pct: Optional[float] = None

# Coding Agent Task Execution Schemas
class TaskAnalyzeRequest(BaseModel):
    prompt: str
    repo_id: str
    is_confidential: Optional[bool] = None

class TaskAnalyzeResponse(BaseModel):
    understood_task: str
    relevant_files: List[Dict[str, Any]]
    estimated_tokens_raw: int
    estimated_tokens_compact: int
    token_savings_pct: float
    selected_provider: str
    is_confidential: bool
    execution_plan: List[Dict[str, Any]]
    requires_approval: bool

class AgentTaskRequest(BaseModel):
    prompt: str
    repo_id: str
    target_files: Optional[List[str]] = None
    strategy: str = "balanced" # "balanced", "max_thrift", "fast_path", "frontier"
    safe_mode: bool = True # When true, requires approval for writes, shell, git

class ReasoningStep(BaseModel):
    step_number: int
    title: str
    description: str
    duration_s: float
    tokens_saved: int = 0
    status: str = "completed"

class FileDiff(BaseModel):
    filename: str
    lines_added: int
    lines_deleted: int
    diff_text: str

class AgentTaskResponse(BaseModel):
    id: str
    title: str
    repo_id: str
    branch: str
    prompt: str
    solution_summary: str
    model_used: str
    cascade_chain: List[str]
    is_confidential_routed: bool
    tokens_uncompressed: int
    tokens_compressed: int
    tokens_saved: int
    compression_ratio: float
    cost_billed_usd: float
    cost_saved_usd: float
    latency_ms: int
    status: str # "completed", "pending_approval", "rejected", "failed"
    reasoning_steps: List[ReasoningStep]
    diffs: List[FileDiff]
    approval_id: Optional[str] = None
    pending_approval: Optional[ActionApproval] = None
    created_at: float = Field(default_factory=time.time)

# Analytics Summary Schema
class TokenAnalyticsSummary(BaseModel):
    total_tokens_consumed: int
    input_tokens: int
    output_tokens: int
    total_tokens_saved: int
    compression_efficiency_pct: float
    net_spend_usd: float
    budget_cap_usd: float
    total_cost_saved_usd: float
    model_shares: Dict[str, float]
    history_trajectory: List[Dict[str, Any]]

