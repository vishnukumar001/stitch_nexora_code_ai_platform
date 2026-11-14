# NEXORA Code — External AI Technical Advisor Briefing & Handoff
**Project:** NEXORA Code — *Code Smarter. Spend Fewer Tokens.*  
**Team:** TEAM ARISE  
**Hackathon:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — Build a Coding Agent That Gets the Job Done on the Fewest Tokens  
**Technology Partner:** Bifrost by Maxim AI  
**Document Target:** External AI Technical Advisor / Lead Systems Architect  
**Audit Date:** November 13, 2026  
**Document Classification:** Architecture Handoff & Technical Briefing  

---

## 1. Project Identity & Problem Statement

* **Project Name:** NEXORA Code
* **Tagline:** Code Smarter. Spend Fewer Tokens.
* **Team:** TEAM ARISE
* **Hackathon:** Global AI Hackathon 2026 — Geek Room
* **Challenge:** PS 01 — *Build a Coding Agent That Gets the Job Done on the Fewest Tokens.*
* **Primary Technology Partner:** Bifrost by Maxim AI (`https://api.maxim.ai/bifrost/v1`)
* **Mission:** Build a functional, production-ready AI coding agent that completes software development tasks (synthesizing diffs, applying patches, running regression tests, committing to Git) while radically minimizing LLM token consumption via AST context distillation, semantic prompt caching, and cost-aware provider routing.

---

## 2. Executive Architecture Summary

NEXORA Code is designed as a modular, decoupled full-stack application:
* **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS. Designed in Google Stitch, featuring a clean 3-part layout (Navigation Header, Filter/Context Sidebar, Active Workspace Canvas). Single-bundle build under 85 kB gzipped.
* **Backend:** Python 3.12 + FastAPI + SQLite (WAL mode). Serves 20 RESTful API endpoints covering tasks, metrics, providers, action approvals, and budget enforcement.
* **Token Optimization Engine:** Dual-layer optimization:
  1. *AST Context Distillation:* Prunes non-essential function/class bodies in target source files down to interfaces and type signatures prior to LLM submission.
  2. *Semantic AST Cache:* SHA-256 fingerprinting and keyword signature matching to achieve 100% token savings (0 tokens billed) on repetitive requests.
* **Security & Action Gates:** Zero-Trust architecture. AI cannot write to files, execute shell commands, or make Git commits without generating an explicit `ActionApproval` record requiring human sign-off.
* **Air-Gap Guarantee:** Repositories marked `is_confidential=True` strictly route to local Ollama (`qwen2.5-coder:14b`). Cloud provider fallback is prohibited at the database and router levels.
* **Sandbox Execution:** Isolated ephemeral worktree directories (`backend/sandboxes/nx-sandbox-*`) where patches are applied, real `python3 unittest` suites are run, real Git commits are generated, and SHA-256 audit receipts are computed.

---

## 3. Key Files Map & Repository Structure

### Backend Core (`backend/app/`)
| File Path | Lines | Core Responsibility |
|---|---|---|
| `backend/app/main.py` | 65 | FastAPI application initialization, CORS middleware, API router mounting, startup lifecycle. |
| `backend/app/api/endpoints.py` | 510 | 20 RESTful API endpoints handling tasks, approvals, repositories, metrics, health, budget, settings. |
| `backend/app/db/database.py` | 55 | SQLite connection provider, row factory, table schema initialization with foreign keys. |
| `backend/app/db/repositories.py` | 185 | Direct SQLite data access layer for repositories, tasks, audit logs, and metrics aggregation. |
| `backend/app/models/schemas.py` | 170 | Pydantic v2 schemas defining models for tasks, approvals, providers, budgets, and API contracts. |
| `backend/app/services/ast_optimizer.py` | 215 | AST context optimizer, Python `ast.parse` tree visitor, regex structure compactors for Go and TypeScript, token counting. |
| `backend/app/services/semantic_cache.py` | 75 | In-memory semantic prompt cache using exact SHA-256 hashes and keyword signatures with TTL. |
| `backend/app/services/provider_router.py` | 333 | Model router, health prober, circuit breaker, failover orchestrator, Bifrost gateway client, Ollama runner. |
| `backend/app/services/approval_guard.py` | 177 | Zero-Trust action gate, emergency kill switch state manager, approval resolution, audit generator. |
| `backend/app/services/privacy_guard.py` | 75 | Repository confidentiality verification, air-gap receipt generator, audit event logging. |
| `backend/app/services/budget_service.py` | 135 | Daily/monthly token and financial budget tracking, threshold warnings, HTTP 429 enforcement. |
| `backend/app/services/sandbox_service.py` | 146 | Worktree sandbox preparation, patch application, `python3 -m unittest` execution, real `git commit` generator. |
| `backend/app/services/tokenizer_service.py` | 95 | Tiktoken `cl100k_base` wrapper, cost calculation by provider pricing models. |

### Frontend Core (`frontend/src/`)
| File Path | Lines | Core Responsibility |
|---|---|---|
| `frontend/src/App.tsx` | 110 | Root view router, navigation state, global error boundary, toast notification manager. |
| `frontend/src/components/Header.tsx` | 145 | Top bar with Team Arise branding, air-gap status indicator, emergency kill switch toggle. |
| `frontend/src/components/Sidebar.tsx` | 90 | Left navigation bar linking Workspace, Dashboard, Repositories, Providers, Budget, History, Audit, Settings. |
| `frontend/src/views/WorkspaceView.tsx` | 650 | Primary interactive coding workspace: task input, AST preview, approval modal, diff viewer, execution telemetry. |
| `frontend/src/views/DashboardView.tsx` | 260 | High-level metrics: tokens saved, active budget, provider health, recent task stream. |
| `frontend/src/views/RepositoriesView.tsx` | 220 | Repository management, confidentiality toggles, language detection, branch inspection. |
| `frontend/src/views/ProvidersView.tsx` | 240 | AI provider configuration, Bifrost latency charts, Ollama status, circuit breaker reset buttons. |
| `frontend/src/views/BudgetView.tsx` | 230 | Budget policy management, spending limit sliders, threshold alert configurations. |
| `frontend/src/views/TaskHistoryView.tsx` | 280 | Searchable, filterable historical task log with demo task badges and inspection drawers. |
| `frontend/src/views/AuditView.tsx` | 250 | Immutable security audit log viewer, SHA-256 receipts, approval decision history. |
| `frontend/src/views/SettingsView.tsx` | 210 | API key masking, provider endpoint configs, system reset controls. |
| `frontend/src/services/api.ts` | 320 | Typed Axios/Fetch API client communicating with FastAPI backend. |

---

## 4. Empirical Status Matrix: What Works vs What Is Simulated

### Genuinely Implemented & Verified Live
1. **AST Context Pruning:** Verified repeatable reduction: **82.26% on Go**, **57.99% on TypeScript**, **43.94% on Python**.
2. **Semantic Cache:** 100% token savings (0 tokens billed) on duplicate task inputs.
3. **Action Approval Gate:** Mutations halt execution; persist in SQLite `action_approvals`; require explicit user sign-off.
4. **Emergency Kill Switch:** Global volatile boolean immediately revokes all approvals and locks incoming execution.
5. **Disposable Sandbox:** Worktrees cloned to `backend/sandboxes/`; patches applied; real `python3 unittest` run (5/5 passing in 0.106s).
6. **Real Git Commits:** Executes real `git commit` in sandbox; generates verifiable commit hash and SHA-256 audit digest.
7. **SQLite Persistence:** 6 normalized tables in WAL mode; persists repositories, tasks, approvals, audit logs, budgets, providers.
8. **Automated Test Suite:** 29/29 passing unit tests in 0.928s (`backend/tests/`).
9. **Frontend Build:** Clean Vite build in 440ms with zero errors (85 kB gzip bundle).

### Simulated / Graceful Fallback Mode
1. **Bifrost by Maxim AI Gateway:**
   - *Status:* Client logic fully implemented (`ProviderRouter._simulate_or_call_provider`).
   - *Host Condition:* `BIFROST_API_KEY` is unset in the current development environment.
   - *Behavior:* Returns simulated diff and token metrics, clearly flagged as `SIMULATED PROVIDER EXECUTION`.
2. **Local Ollama Daemon:**
   - *Status:* Client HTTP logic implemented for `http://localhost:11434`.
   - *Host Condition:* Daemon is not running on host port 11434.
   - *Behavior:* Returns simulated air-gapped response; circuit breaker strictly prevents cloud fallback.

---

## 5. Known Technical Debt & Landmines

When reviewing or refactoring this codebase, be aware of the following specific implementation details:

1. **Token Calibration Invariant (`backend/app/api/endpoints.py`):**
   * *Detail:* Both `/api/tasks/analyze` and `/api/tasks/execute` must use `get_representative_context(repo_id)` to count tokens. If someone modifies the context builder in one endpoint without updating the other, pre-flight and execution token numbers will desynchronize.
2. **Sandbox Path Validation (`backend/app/services/sandbox_service.py:54`):**
   * *Detail:* `target_file` path is joined using `os.path.join(sandbox_path, target_file)`. Add `os.path.commonpath` verification to guarantee no path traversal escaping `sandbox_path` occurs if an untrusted file path is supplied.
3. **API Keys in Environment vs Database (`backend/app/services/provider_router.py:49`):**
   * *Detail:* API keys are read from `os.environ` (`BIFROST_API_KEY`), while the database `providers` table only stores a boolean `has_api_key`. Do not attempt to read keys from `providers.api_key` columns as they are deliberately not stored there for security.
4. **In-Memory vs SQLite State:**
   * *Detail:* `_emergency_kill_switch_engaged` in `ApprovalGuard` is an in-memory class variable. If the FastAPI server process restarts with `--reload`, the kill switch state resets to `False`. The revoked approvals in SQLite remain permanently rejected.

---

## 6. How to Run, Test & Benchmark

### 1. Start Backend Server
```bash
cd /Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform
source venv/bin/activate # if using virtualenv
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Health Check:* `curl http://localhost:8000/api/health`

### 2. Start Frontend Development Server
```bash
cd frontend
npm run dev
```
*Frontend URL:* `http://localhost:5173`

### 3. Run Automated Backend Test Suite
```bash
PYTHONPATH=. python3 -m unittest discover backend/tests
```
*Expected Result:* 29 tests, 0 failures, execution time < 1.0s.

### 4. Run Token Optimization Benchmark
```bash
python3 backend/benchmark/run_benchmark.py
```
*Expected Result:* Verified savings across Go (-82.3%), TypeScript (-58.0%), Python (-43.9%), Cache (-100%).

### 5. Build Frontend for Production
```bash
cd frontend && npm run build
```
*Expected Result:* Zero errors, assets compiled to `frontend/dist/`.

---

## 7. Prioritized Recommendation Roadmap for External Advisor

| Priority | Task | Target Files | Impact |
|---|---|---|---|
| **P1** | **Inject Live Bifrost API Key** | Environment (`export BIFROST_API_KEY="..."`) | Transitions Bifrost integration from `SIMULATED` to `VERIFIED LIVE` without any code changes. |
| **P2** | **Start Local Ollama Daemon** | Host (`ollama run qwen2.5-coder:14b`) | Transitions Confidential Mode local inference from simulated air-gap to live local execution. |
| **P3** | **Sandbox Path Traversal Hardening** | `backend/app/services/sandbox_service.py` | **COMPLETED in Phase 1:** Canonical path resolution + `os.path.commonpath` containment + symlink escape rejection. 8/8 tests passing. |
| **P4** | **Ephemeral Docker Sandbox Runner** | `backend/app/services/sandbox_service.py` | Run untrusted repository unit tests inside a Docker container rather than the host Python process. |
| **P5** | **Multi-Tenant User Authentication** | `backend/app/api/endpoints.py` | Add JWT authentication middleware for production enterprise SaaS deployment. |

---

## 8. Non-Negotiable Invariants & Security Constraints

The external AI technical advisor must strictly respect the following project constraints:
1. **Never Break the Air-Gap:** Repositories with `is_confidential=True` must NEVER transmit code, prompts, or ASTs to cloud providers. Never add cloud fallback logic for confidential repositories.
2. **Never Bypass Action Approvals:** No file write, shell command, or Git commit may execute without an explicit approval record in SQLite `action_approvals`.
3. **Preserve Accurate Token Telemetry:** Never hardcode token savings. Always calculate tokens using `ast_optimizer.py` and `tiktoken`.
4. **Never Expose API Keys:** Never return raw API keys in API responses or frontend payloads.
5. **Preserve Team Arise Branding:** Do not revert branding or replace with sample identities.

