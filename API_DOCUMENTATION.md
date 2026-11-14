# NEXORA Code — API Documentation

**Project:** NEXORA Code  
**Tagline:** *Code Smarter. Spend Fewer Tokens.*  
**Team:** TEAM ARISE  
**Hackathon:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — *Build a Coding Agent That Gets the Job Done on the Fewest Tokens*  
**Technology Partner:** Bifrost by Maxim AI  
**AI Provider:** Google Gemini API (`gemini-3.5-flash`) through Bifrost by Maxim AI  

---

## 1. Overview & Architecture

The NEXORA Code FastAPI backend exposes exactly **20 RESTful endpoints** under the `/api` namespace. All endpoints return JSON responses. Errors follow standard HTTP status conventions with structured error details.

* **Base URL:** `http://127.0.0.1:8000/api`
* **Interactive OpenAPI Swagger Docs:** `http://127.0.0.1:8000/docs`
* **Raw OpenAPI Specification:** `http://127.0.0.1:8000/openapi.json`

---

## 2. Complete Endpoint Directory

| # | HTTP Method | Endpoint Path | Description | Access Policy |
|---|---|---|---|---|
| 1 | `GET` | `/api/repositories` | List all tracked repositories with privacy metadata | Standard |
| 2 | `GET` | `/api/repositories/{repo_id}` | Retrieve single repository metadata & privacy config | Standard |
| 3 | `POST` | `/api/repositories` | Register new repository with privacy mode | Standard |
| 4 | `POST` | `/api/tasks/analyze` | AST context analysis & pre-flight token estimation | Non-mutating |
| 5 | `POST` | `/api/tasks/execute` | Main PS 01 coding task execution with cascade router | Safe Mode Guard |
| 6 | `GET` | `/api/tasks/history` | List all past agent execution runs | Read-only |
| 7 | `GET` | `/api/tasks/{task_id}` | Retrieve detailed task trace, diffs, and audit | Read-only |
| 8 | `GET` | `/api/providers` | List all configured AI providers and health status | Read-only |
| 9 | `PUT` | `/api/providers/{provider_id}` | Update provider status or reset circuit breaker | Admin |
| 10 | `POST` | `/api/router/failover-test` | Simulate provider failure to verify circuit breaker | Diagnostic |
| 11 | `POST` | `/api/router/check-connectivity` | Actively probe Bifrost, Gemini, and Ollama status | Diagnostic |
| 12 | `GET` | `/api/approvals/pending` | List pending human approval requests | Safe Mode |
| 13 | `POST` | `/api/approvals/{approval_id}/resolve` | Approve, reject, or request revision for staged action | Human Gate |
| 14 | `GET` | `/api/security/status` | Retrieve system security, air-gap, and kill switch status | Security |
| 15 | `POST` | `/api/security/kill-switch` | Engage or disengage persistent Emergency Kill Switch | Security |
| 16 | `GET` | `/api/budget` | Get current user budget policy and monthly spend | Financial Guard |
| 17 | `PUT` | `/api/budget` | Update monthly budget cap, token cap, or throttle policy | Financial Guard |
| 18 | `GET` | `/api/analytics/tokens` | Get real-time token savings and cost efficiency summary | Telemetry |
| 19 | `GET` | `/api/analytics/activities` | Get recent audit log activities and cryptographic receipts | Audit |
| 20 | `GET` | `/api/health` | System health and service readiness check | Public |

---

## 3. Detailed Endpoint Specifications

### 3.1 Repository Management

#### `GET /api/repositories`
Lists all repositories tracked in NEXORA Code.
* **Response (200 OK):**
```json
[
  {
    "id": "repo-core",
    "name": "prod-core-monorepo",
    "branch": "feat/distributed-cache",
    "language": "Go / Rust / TS",
    "is_confidential": false,
    "ast_indexed": true,
    "contributors_count": 42,
    "total_loc": 142500,
    "privacy_mode": "internal",
    "local_path": null
  },
  {
    "id": "repo-auth",
    "name": "auth-service",
    "branch": "main",
    "language": "Go",
    "is_confidential": true,
    "ast_indexed": true,
    "contributors_count": 14,
    "total_loc": 28400,
    "privacy_mode": "confidential",
    "local_path": null
  }
]
```

#### `GET /api/repositories/{repo_id}`
Retrieves single repository by ID.
* **Parameters:** `repo_id` (string, path) — e.g. `repo-core`
* **Response (200 OK):** Returns matching `Repository` object.
* **Error (404 Not Found):** `{"detail": "Repository repo-xyz not found"}`

#### `POST /api/repositories`
Registers a new repository.
* **Request Body:**
```json
{
  "name": "payment-microservice",
  "branch": "main",
  "language": "Go",
  "is_confidential": true,
  "privacy_mode": "confidential"
}
```

---

### 3.2 Agent Coding Tasks & Token Optimization (PS 01)

#### `POST /api/tasks/analyze`
Non-mutating pre-flight task analysis. Runs AST context extraction, computes token savings against raw baseline, checks semantic cache, and selects the optimal provider tier.
* **Request Body:**
```json
{
  "prompt": "Add sync.Pool buffer allocation reuse to CacheManager in cache_manager.go",
  "repo_id": "repo-core",
  "is_confidential": false
}
```
* **Response (200 OK):**
```json
{
  "understood_task": "Isolate unbounded buffer allocation in CacheManager eviction loop, apply sync.Pool buffer reuse, and verify throughput under concurrency.",
  "relevant_files": [
    {"name": "pkg/cache/cache_manager.go", "role": "Target Implementation", "loc": 420, "ast_sliced": true},
    {"name": "pkg/cache/cache_test.go", "role": "Benchmark & Verification", "loc": 180, "ast_sliced": true}
  ],
  "estimated_tokens_raw": 589,
  "estimated_tokens_compact": 162,
  "token_savings_pct": 72.5,
  "selected_provider": "Google Gemini (via Bifrost)",
  "is_confidential": false,
  "execution_plan": [
    {"step": 1, "title": "Parse AST & Slice Syntax Symbols", "detail": "Extract required function definitions and prune unreferenced dependencies."},
    {"step": 2, "title": "Synthesize Token-Optimized Solution", "detail": "Route sliced context to Google Gemini (via Bifrost) to generate minimal patch."},
    {"step": 3, "title": "Run Sandbox Verification Tests", "detail": "Execute unit tests in container sandbox to verify zero regressions."},
    {"step": 4, "title": "Stage Mutation for Human Approval", "detail": "Generate unified diff. Never apply file writes or Git commits without explicit developer approval."}
  ],
  "requires_approval": true,
  "cache_hit": false
}
```

#### `POST /api/tasks/execute`
Main PS 01 Agent Workflow.
1. Checks Emergency Kill Switch (returns 423 if engaged).
2. Enforces repository privacy (routes confidential repositories to local Ollama with zero cloud egress).
3. Executes AST context compression.
4. Validates pre-flight budget limits (returns 403 if over cap).
5. Dispatches inference via Provider Cascade Router with automatic circuit breaker failover.
6. Stages file modification for human approval (Safe Mode).
7. Calculates exact tokens billed, tokens saved, and cost saved.

* **Request Body:**
```json
{
  "prompt": "Add sync.Pool buffer allocation reuse to CacheManager in cache_manager.go",
  "repo_id": "repo-core",
  "strategy": "balanced",
  "safe_mode": true,
  "is_confidential": false
}
```
* **Response (200 OK):**
```json
{
  "id": "task-1794587862928",
  "title": "Add sync.Pool buffer allocation reuse to CacheManager...",
  "repo_id": "repo-core",
  "branch": "feat/distributed-cache",
  "prompt": "Add sync.Pool buffer allocation reuse...",
  "solution_summary": "Live solution generated via Google Gemini (gemini-3.5-flash) through Bifrost by Maxim AI.",
  "model_used": "gemini-3.5-flash",
  "cascade_chain": ["Google Gemini (via Bifrost)"],
  "is_confidential_routed": false,
  "tokens_uncompressed": 589,
  "tokens_compressed": 162,
  "tokens_saved": 427,
  "compression_ratio": 72.5,
  "cost_billed_usd": 0.000045,
  "cost_saved_usd": 0.0028,
  "latency_ms": 12248,
  "status": "pending_approval",
  "execution_mode": "LIVE PROVIDER EXECUTION",
  "provider_input_tokens": 372,
  "provider_output_tokens": 80,
  "cache_hit": false,
  "actual_tokens_billed": 452,
  "approval_id": "appr-1794587862929",
  "reasoning_steps": [
    {"step_number": 1, "title": "Parse AST & Slice Syntax Symbols", "duration_s": 0.04, "tokens_saved": 427, "status": "completed"},
    {"step_number": 2, "title": "Model Cascade Synthesis (Google Gemini via Bifrost)", "duration_s": 1.2, "tokens_saved": 0, "status": "completed"},
    {"step_number": 3, "title": "Sandbox Path Confinement & Isolation", "duration_s": 0.1, "tokens_saved": 0, "status": "completed"},
    {"step_number": 4, "title": "Staged for Human Approval Gate", "duration_s": 0.01, "tokens_saved": 0, "status": "completed"}
  ],
  "diffs": [
    {
      "filename": "pkg/cache/cache_manager.go",
      "lines_added": 8,
      "lines_deleted": 2,
      "diff_text": "@@ -138,8 +138,9 @@\n-	rawBuffer := make([]byte, 0, 65536)\n-	buf := bytes.NewBuffer(rawBuffer)\n+	bufPtr := bufferPool.Get().(*bytes.Buffer)\n+	bufPtr.Reset()\n+	defer bufferPool.Put(bufPtr)"
    }
  ]
}
```

* **Error Codes:**
  - `403 Forbidden`: `BUDGET_CAP_EXCEEDED` — Projected spend exceeds monthly budget limit.
  - `423 Locked`: Emergency Kill Switch is engaged. All agent tasks frozen.
  - `503 Service Unavailable`: Local Ollama model is offline for confidential repository. Cloud fallback strictly blocked by Zero-Egress Air-Gap policy.

#### `GET /api/tasks/history`
Returns list of past agent tasks.

#### `GET /api/tasks/{task_id}`
Returns details for a single task including reasoning steps, diffs, and approval state.

---

### 3.3 Provider Routing & Gateway Telemetry

#### `GET /api/providers`
Returns all registered providers, their latency, tier, and status.

#### `PUT /api/providers/{provider_id}`
Updates provider status or resets tripped circuit breaker.
* **Request Body:**
```json
{
  "circuit_breaker_tripped": false,
  "status": "online"
}
```

#### `POST /api/router/failover-test`
Simulates provider timeout/504 gateway error to test automatic failover and circuit breaker tripping.

#### `POST /api/router/check-connectivity`
Actively probes provider endpoints without leaking credentials. Returns updated provider list.

---

### 3.4 Approvals & Security Governance

#### `GET /api/approvals/pending`
Lists all actions awaiting human review (file writes, shell execution, Git commits).

#### `POST /api/approvals/{approval_id}/resolve`
Approve or reject a staged action. When approved:
1. Validates file path containment (`validate_safe_path`).
2. Applies diff to physical sandbox (`backend/sandboxes/nx-sandbox-849`).
3. Runs sandbox unit tests.
4. Creates genuine Git commit on disposable test branch.
5. Emits SHA-256 cryptographic audit receipt.

* **Request Body:**
```json
{
  "decision": "approved",
  "reviewer": "TEAM ARISE",
  "notes": "Verified minimal buffer reuse patch."
}
```
* **Response (200 OK):**
```json
{
  "id": "appr-1794587862929",
  "decision": "approved",
  "resolved_by": "TEAM ARISE",
  "applied_sandbox": "nx-sandbox-849",
  "test_summary": "5/5 verification tests passed in sandbox (0 regressions, 0.136s runtime)",
  "git_commit": "702cf288 (SHA: 702cf28889d2...)",
  "audit_receipt": "sha256:65bbb178fd14e300"
}
```

#### `GET /api/security/status`
Returns system security posture, Zero-Egress Air-Gap invariant, active sandbox status, and Kill Switch state.

#### `POST /api/security/kill-switch`
Engages or disengages persistent Emergency Kill Switch (stored in SQLite `system_settings`).
* **Request Body:**
```json
{
  "engaged": true
}
```

---

### 3.5 Budget & Financial Controls

#### `GET /api/budget`
Returns monthly budget policy, spend, token cap, and runway.

#### `PUT /api/budget`
Updates budget limits.
* **Request Body:**
```json
{
  "monthly_budget_usd": 1500.0,
  "monthly_token_cap": 50000000,
  "hard_limit_enforced": true
}
```

---

### 3.6 Analytics & System Health

#### `GET /api/analytics/tokens`
Returns token efficiency summary: total consumed, tokens saved, compression efficiency %, and model share distribution.

#### `GET /api/analytics/activities`
Returns recent audit log records with SHA-256 cryptographic signatures.

#### `GET /api/health`
System health status:
```json
{
  "status": "healthy",
  "version": "3.4.0",
  "database": "connected",
  "kill_switch": false,
  "providers_online": 2
}
```

