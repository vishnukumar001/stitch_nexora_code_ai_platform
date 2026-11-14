# NEXORA Code — Complete Project Intelligence & Technical Discovery Audit

**Project:** NEXORA Code  
**Tagline:** Code Smarter. Spend Fewer Tokens.  
**Team:** TEAM ARISE  
**Competition:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — *Build a Coding Agent That Gets the Job Done on the Fewest Tokens*  
**Technology Partner:** Bifrost by Maxim AI  
**Audit Date:** November 13, 2026  
**Auditor Classification:** Senior Software Architect & Security Auditor  

---

## 1. Project Overview

### A. System Purpose & Core Objective
NEXORA Code is an intelligent, token-efficient AI developer platform and coding agent. Its core objective is to complete full software engineering workflows (bug fixing, refactoring, feature implementation, and test verification) while systematically minimizing LLM token consumption. 

Unlike generic chatbots or naive agentic wrappers that feed entire multi-thousand-line monorepo dependency trees into LLM context windows, NEXORA Code applies static Abstract Syntax Tree (AST) symbol extraction, semantic dependency pruning, local semantic caching, and dynamic model cascade routing to prune 65% to 90%+ of unneeded context before making model invocations.

### B. Target Users
1. **Engineering Teams & Monorepo Maintainers:** Developers managing large codebases seeking to prevent runaway API spend and context window exhaustion.
2. **Enterprise & Regulated Sectors:** Organizations with strict intellectual property or privacy requirements requiring air-gapped local model processing (e.g., healthcare, fintech, defense).
3. **Engineering Managers / FinOps:** Leaders needing granular, per-user monthly token and budget caps, pre-flight budget gates, and real-time cost-saving telemetry.

### C. Main Problems Solved
1. **Excessive Context Bloat (Token Waste):** Sending entire files or unreferenced dependencies wastes hundreds of thousands of tokens per task.
2. **Provider Fragility & Vendor Lock-in:** Single-provider outages, rate limits, or latency spikes halt agent development.
3. **Intellectual Property Leakage:** Accidental leakage of confidential source code to public cloud AI APIs.
4. **Agentic Runaway Spend:** Automated agents executing recursive LLM loops that deplete API budgets.
5. **Destructive Unsupervised Code Mutations:** AI agents modifying files or executing shell commands without human validation.

### D. Core Differentiators
* **AST-Driven Context Slicing:** Extracts only target classes, functions, and immediate symbol references, stripping unreferenced stdlib imports, dead code, and mock fixtures.
* **Dual Privacy Modes:** Explicit toggle between `STANDARD MODE` (multi-provider cloud cascade via Bifrost) and `CONFIDENTIAL MODE` (100% strict air-gapped local model execution via Ollama with zero cloud egress).
* **Pre-Flight Budget Gate:** Validates estimated input/output token cost against remaining user budget *before* dispatching model inference.
* **Human-in-the-Loop Approval Interceptor:** All file writes, Git operations, and shell executions are held in a pending state until explicit developer approval.
* **Bifrost by Maxim AI Dynamic Routing:** OpenAI-compatible proxy gateway with automatic failover across Claude 3.7 Sonnet, DeepSeek V3, and GPT-4o.
* **Semantic Query & Context Caching:** In-memory SHA-256 semantic cache delivering 100% token savings (0 tokens billed) on identical or repeated queries.
* **Isolated Sandbox Execution:** Automatically stages mutations into an isolated worktree ([`backend/sandboxes/nx-sandbox-849`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/sandboxes/nx-sandbox-849)), executes real test suites, creates a sandbox Git commit, and generates a SHA-256 audit digest.

### E. Current Development Stage
* **Backend:** Functional Python 3 FastAPI application with 17 active endpoints, 6 services, SQLite persistence, and 29 automated tests.
* **Frontend:** Functional React 18 + TypeScript + Vite + Tailwind CSS single-page application compiled into production bundle ([`frontend/dist`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/dist)).
* **Execution Status:** 
  * AST context optimization: **VERIFIED AUTOMATED**
  * Human approval and real sandbox test execution: **VERIFIED AUTOMATED**
  * Live Bifrost and Ollama model inference: **SIMULATED** (runs in transparent, deterministic fallback mode when `BIFROST_API_KEY` or local Ollama daemon is unconfigured; verified compatible via mocked unit tests).

---

## 2. Complete Technology Stack

| Layer | Component | Version / Specification | Verified Location |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^18.3.1` | [`frontend/package.json`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/package.json#L12) |
| **Frontend Language** | TypeScript | `^5.6.3` | [`frontend/package.json`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/package.json#L22) |
| **Frontend Build Tool** | Vite | `^5.4.11` | [`frontend/package.json`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/package.json#L23) |
| **Styling & CSS** | Tailwind CSS + PostCSS | `^3.4.15` | [`frontend/tailwind.config.js`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/tailwind.config.js) |
| **Icons & Typography** | Google Material Symbols & Fonts | Inter, JetBrains Mono, Space Grotesk | [`frontend/index.html`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/index.html#L7-L9) |
| **Backend Framework** | FastAPI | `>=0.115.0` | [`backend/requirements.txt`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/requirements.txt#L1) |
| **ASGI Web Server** | Uvicorn | `>=0.34.0` | [`backend/requirements.txt`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/requirements.txt#L2) |
| **Data Validation** | Pydantic v2 | `>=2.10.0` | [`backend/requirements.txt`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/requirements.txt#L3) |
| **HTTP Client** | HTTPX | `>=0.28.0` | [`backend/requirements.txt`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/requirements.txt#L5) |
| **Database** | SQLite 3 | Embedded DB (`backend/app/db/nexora.db`) | [`backend/app/db/database.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/db/database.py#L9) |
| **Tokenization Engine** | Tiktoken | `>=0.8.0` (`cl100k_base` reference baseline) | [`backend/app/services/tokenizer_service.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/tokenizer_service.py#L5) |
| **AST Parsing (Python)** | Python Standard `ast` module | Built-in Python 3.12+ standard library | [`backend/app/services/ast_optimizer.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/ast_optimizer.py#L1) |
| **AST Compacting (Multi-lang)** | Heuristic Scope & Locus Slicer | Regular expressions + syntax boundary matching | [`backend/app/services/ast_optimizer.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/ast_optimizer.py#L51) |
| **AI Gateway Partner** | Bifrost by Maxim AI | `https://api.maxim.ai/bifrost/v1/chat/completions` | [`backend/app/services/provider_router.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/provider_router.py#L268) |
| **Local Model Runtime** | Ollama API | `http://localhost:11434/api/generate` (`qwen2.5-coder:14b`) | [`backend/app/services/provider_router.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/provider_router.py#L228) |
| **Testing Framework** | Python `unittest` | Built-in (29 automated tests across 6 files) | [`backend/tests/`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/tests/) |
| **Version Control & Sandboxing** | Git 2.54.0 | Isolated worktree cloning & commit engine | [`backend/app/services/sandbox_service.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/sandbox_service.py#L86) |

---

## 3. Complete File & Folder Structure

```
/Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py          # 17 FastAPI REST endpoints (Tasks, Repos, Router, Budget, Security, Settings)
│   │   ├── core/                     # Reserved for core app configurations
│   │   ├── db/
│   │   │   ├── database.py           # SQLite connection, schema creation, migrations, and seed data
│   │   │   └── nexora.db             # SQLite database file (6 tables: repos, providers, budgets, approvals, tasks, logs)
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic data contracts (TaskRequest, TaskResponse, Provider, ActionApproval, etc.)
│   │   ├── services/
│   │   │   ├── approval_guard.py     # Human action approval gates, kill switch state, and mutation validation
│   │   │   ├── ast_optimizer.py      # Python ast parser + multi-language heuristic symbol extractor & slicer
│   │   │   ├── budget_service.py     # Pre-flight financial check, usage tracking, and budget policy enforcement
│   │   │   ├── privacy_guard.py      # Confidential repository check, zero-cloud-egress verification, air-gap logging
│   │   │   ├── provider_router.py    # Multi-provider cascade, Bifrost client, Ollama runner, circuit breaker failover
│   │   │   ├── sandbox_service.py    # Sandbox worktree preparation, patch applicator, unit test runner, git committer
│   │   │   ├── semantic_cache.py     # In-memory query hash cache for 0-token instant hits
│   │   │   └── tokenizer_service.py  # Tiktoken BPE token counting, multi-model pricing math, and savings calculation
│   │   └── main.py                   # FastAPI application initialization, CORS middleware, API router & static SPA mount
│   ├── benchmark/
│   │   ├── benchmark_results.json    # Serialized empirical token measurements
│   │   ├── fixtures/
│   │   │   ├── auth_service.py       # Python reference fixture (1,072 baseline tokens)
│   │   │   ├── cache_service.go      # Go reference fixture (1,295 - 1,353 baseline tokens)
│   │   │   └── gateway_router.ts     # TypeScript reference fixture (707 baseline tokens)
│   │   └── run_benchmark.py          # Standalone reproducible token optimization benchmark runner
│   ├── disposable_repos/
│   │   └── repo-core/                # Real on-disk Git repository (cache service + test suite) for safe mutation testing
│   ├── sandboxes/
│   │   └── nx-sandbox-849/           # Active sandbox worktree where approved patches are applied and verified
│   ├── tests/
│   │   ├── test_bifrost_real_workflow.py  # Mocked Bifrost gateway, air-gap zero egress, and sandbox execution tests (4 tests)
│   │   ├── test_core_requirements.py      # Five core hackathon requirement tests (5 tests)
│   │   ├── test_full_suite.py             # System-wide integration test suite (9 tests)
│   │   ├── test_new_task_e2e.py           # End-to-end task analysis, execution, and approval resolution tests (3 tests)
│   │   ├── test_qa_master_audit.py        # Security, data integrity, budget overload, and semantic cache tests (7 tests)
│   │   └── test_usability_workflow.py     # First-time user 9-step workflow verification test (1 test)
│   └── requirements.txt              # Python runtime dependencies
├── frontend/
│   ├── dist/                         # Compiled production assets served directly by FastAPI
│   ├── index.html                    # HTML entrypoint with Dark Theme, Material Symbols, and Google Fonts
│   ├── package.json                  # NPM project metadata and dependency definitions
│   ├── src/
│   │   ├── api.ts                    # Strongly-typed fetch client communicating with backend `/api`
│   │   ├── App.tsx                   # Top-level state coordinator, telemetry polling, and view router
│   │   ├── components/
│   │   │   ├── NavigationSidebar.tsx # 6-item left navigation sidebar with kill switch alert & team profile
│   │   │   └── TopHeader.tsx         # Top bar with active project selector, new task shortcut & kill switch toggle
│   │   └── views/
│   │       ├── DashboardView.tsx     # Cockpit with 3 KPI cards, active repo pill, and task activity table
│   │       ├── WorkspaceView.tsx     # Primary 11-step New Coding Task view with diff viewer and approval gate
│   │       ├── ProjectsView.tsx      # Repository management, branch tracking, and confidential air-gap toggles
│   │       ├── TaskHistoryView.tsx   # Searchable and filterable past task ledger with diff and timing metrics
│   │       ├── UsageTokensView.tsx   # Token analytics charts, model distribution, and budget controls
│   │       ├── SettingsView.tsx      # Provider topology, connectivity probe, vault secret input, and kill switch
│   │       ├── LandingPageView.tsx   # Marketing / overview landing page
│   │       └── AuthView.tsx          # Login authentication view
│   ├── tailwind.config.js            # Design system color tokens, surfaces, and typography configuration
│   └── tsconfig.json                 # TypeScript compiler configuration
├── reports/                          # Audit reports, benchmarks, and architectural documentation
└── start.sh                          # Universal startup script (dependency check, unit tests, and uvicorn launch)
```

---

## 4. Token Optimization Deep Audit

### A. Context Slicing Pipeline
1. **Input Code Identification:** The target repository file context is loaded via [`get_representative_context()`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/api/endpoints.py#L162).
2. **Symbol Extraction:** Natural language instructions are stripped of common stop words (`for`, `with`, `into`, etc.) to isolate code identifiers (e.g., `CacheManager`, `EvictExpiredKeys`, `sync.Pool`, `bufferPool`).
3. **AST Symbol Isolation:**
   * **Python:** Uses `ast.parse()`, traverses `ast.FunctionDef` and `ast.ClassDef` nodes, keeps matching nodes, and prunes unreferenced imports and dead functions via `ast.unparse()`.
   * **Go / TypeScript / Rust:** Uses [`ASTOptimizer.compact_generic_code()`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/ast_optimizer.py#L51), which locates target symbol anchors, extracts surrounding block windows (2 lines before, 16 lines after), merges overlapping ranges, and replaces unreferenced code blocks with AST pruning markers.
4. **Token Measurement:** Unoptimized code and compacted code are tokenized using `tiktoken` with `cl100k_base`.

### B. Mathematical Calibration & Token Invariants
* **Formula for Reduction Ratio:**
  $$\text{Reduction Ratio (\%)} = \text{round}\left(\frac{\text{Baseline Tokens} - \text{Compacted Tokens}}{\text{Baseline Tokens}} \times 100, 1\right)$$
* **Unified Pre-flight & Execution Measurement:** Both `/tasks/analyze` and `/tasks/execute` share identical baseline context:
  * Baseline Input: **1,295 tokens**
  * AST Compacted: **301 tokens**
  * Input Tokens Saved: **994 tokens**
  * Reduction: **76.8%**
* **Input vs. Output vs. Cost Distinction:**
  * **Input Tokens Saved:** 994 tokens pruned from context before model dispatch.
  * **Actual Provider Ingestion:** 301 input tokens (billed at target model rate, e.g. \$0.14/1M for DeepSeek or \$3.00/1M for Claude).
  * **Actual Provider Output:** ~42 to 250 completion tokens (billed at output rate, e.g. \$0.28/1M for DeepSeek or \$15.00/1M for Claude).
  * **Net Cost Saved:** Difference between sending 1,295 raw tokens to a frontier model (GPT-4o) versus sending 301 compacted tokens to the selected cascade model.

---

## 5. API Inventory & Implementation Status

| Method | Endpoint | Purpose | Request Body | Response Body | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | System health, cluster node & kill switch status | None | `status`, `airgap_enforced`, `kill_switch_active` | **VERIFIED LIVE** |
| `GET` | `/api/dashboard` | Dashboard KPIs, providers, recent activities | None | `kpis`, `providers`, `recent_activities` | **VERIFIED LIVE** |
| `GET` | `/api/repositories` | List registered repositories | None | `List[Repository]` | **VERIFIED LIVE** |
| `POST` | `/api/repositories` | Register new repository | `RepositoryCreate` | `Repository` | **VERIFIED LIVE** |
| `PATCH` | `/api/repositories/{id}/privacy` | Toggle confidential air-gap mode | Query param `is_confidential` | Updated `Repository` | **VERIFIED LIVE** |
| `POST` | `/api/tasks/analyze` | Step 4 Pre-flight AST context analysis | `TaskAnalyzeRequest` | `TaskAnalyzeResponse` (files, plan, savings) | **VERIFIED LIVE** |
| `POST` | `/api/tasks/execute` | Dispatch task execution & stage approval | `AgentTaskRequest` | `AgentTaskResponse` (diffs, approval_id, steps) | **VERIFIED LIVE** |
| `GET` | `/api/tasks` | List executed tasks with provenance | None | `List[TaskRecord]` | **VERIFIED LIVE** |
| `GET` | `/api/analytics` | 30-day token trajectory & model shares | None | `TokenAnalyticsSummary` | **VERIFIED LIVE** |
| `GET` | `/api/router` | Model router topology & providers | None | `topology_id`, `providers` | **VERIFIED LIVE** |
| `POST` | `/api/router/check-connectivity` | Active probe of provider health | None | Provider status list | **VERIFIED LIVE** |
| `POST` | `/api/router/failover-test` | Simulate provider failure & cascade | Query param `provider_id` | Failover chain & latency | **VERIFIED LIVE** |
| `GET` | `/api/budget` | Get current user budget policy | None | `BudgetPolicy` | **VERIFIED LIVE** |
| `PUT` | `/api/budget` | Update monthly budget & caps | `BudgetUpdate` | Updated `BudgetPolicy` | **VERIFIED LIVE** |
| `GET` | `/api/approvals` | List pending action approval gates | None | `List[ActionApproval]` | **VERIFIED LIVE** |
| `POST` | `/api/approvals/{id}/resolve`| Human approval/rejection of mutation | `ApprovalDecision` | Resolution receipt, test summary, git commit | **VERIFIED LIVE** |
| `POST` | `/api/security/kill-switch` | Toggle emergency freeze | Query param `engaged` | Kill switch status & message | **VERIFIED LIVE** |
| `GET` | `/api/security/status` | Security posture & pending gates count | None | Security metrics & audit logs | **VERIFIED LIVE** |
| `GET` | `/api/settings` | Settings & pruning rules metadata | None | Settings schema | **VERIFIED LIVE** |
| `POST` | `/api/settings/vault` | Store secret key in memory vault | Query params `provider_id`, `api_key` | Enclave confirmation receipt | **VERIFIED LIVE** |

---

## 6. Frontend & UI/UX Audit

| Screen / View | Implementation File | Primary Data Sources | Interactivity & Functional Reality |
| :--- | :--- | :--- | :--- |
| **Dashboard** | [`DashboardView.tsx`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/src/views/DashboardView.tsx) | `GET /api/dashboard` | Working: KPI summary cards, + New Coding Task button, active project link, recent tasks table with Inspect button. Provenance badges (`DEMO DATA` vs `LIVE EXECUTION`) accurately displayed. |
| **New Coding Task** | [`WorkspaceView.tsx`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/src/views/WorkspaceView.tsx) | `/tasks/analyze`, `/tasks/execute`, `/approvals/{id}/resolve` | Working: 11-step workflow. Prominent multiline textarea (`rows={6}`), live character counter (`0 / 2,000`), clear button, 4 quick templates, Standard/Confidential toggles, dynamic diff viewer with line coloring, human approval buttons, sandbox test outcomes. |
| **Projects** | [`ProjectsView.tsx`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/src/views/ProjectsView.tsx) | `GET /api/repositories`, `PATCH .../privacy` | Working: Lists registered projects; allows toggling Confidential Mode which immediately persists to database and locks air-gap routing. |
| **Task History** | [`TaskHistoryView.tsx`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/src/views/TaskHistoryView.tsx) | `GET /api/tasks` (from App telemetry) | Working: Filterable table of past tasks, search input, status badges, tokens saved metrics, and Inspect button opening task details in WorkspaceView. |
| **Usage & Tokens** | [`UsageTokensView.tsx`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/src/views/UsageTokensView.tsx) | `GET /api/analytics`, `GET /api/budget`, `PUT /api/budget` | Working: Token trajectory chart, model share distribution, budget limit inputs with real update calls. Some trajectory points are historical reference benchmarks. |
| **Settings** | [`SettingsView.tsx`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/frontend/src/views/SettingsView.tsx) | `GET /api/settings`, `POST /api/settings/vault`, `POST .../kill-switch` | Working: Provider latency & circuit breaker display, active probe button, secret key vault inputs, emergency kill switch toggle. |

---

## 7. Current Problems, Technical Debt & Blockers

| Priority | Issue Description | Root Cause & Location | Remediation Requirement |
| :---: | :--- | :--- | :--- |
| **HIGH** | `BIFROST_API_KEY` is not present in local environment | Environment variable unexported in shell | Evaluator must export `BIFROST_API_KEY="your-key"` or enter it into the Settings Vault to switch from simulated baseline to live cloud inference. |
| **HIGH** | Ollama daemon is not running on host port 11434 | Ollama binary not installed in system PATH | Evaluator must install/run `ollama serve` and `ollama pull qwen2.5-coder:14b` to demonstrate live local model execution. |
| **MEDIUM** | Trajectory chart in Token Analytics uses seeded points | 30-day historical trend requires weeks of live usage | Connect trajectory series to an SQLite aggregation query grouping tasks by date. |
| **LOW** | Hardware Enclave (YubiHSM2) is conceptual | Physical HSM hardware is unavailable in local dev | Document that secret vault isolation operates via in-memory process separation. |
| **LOW** | Docker container daemon not attached | Sandboxing uses directory worktree rather than Docker | Filesystem sandbox worktree is fully functional; Linux Docker daemon is optional. |

---

## 8. Installation & Execution Guide

### Prerequisites
* macOS / Linux
* Python 3.10+ (tested on Python 3.13)
* Node.js 18+ and npm
* Git 2.30+

### Step-by-Step Launch
```bash
# 1. Clone & enter project root
cd /path/to/stitch_nexora_code_ai_platform

# 2. (Optional) Configure live AI Provider credentials
export BIFROST_API_KEY="your_bifrost_api_key"
export BIFROST_GATEWAY_URL="https://api.maxim.ai/bifrost/v1"

# 3. (Optional) Start local Ollama daemon for Confidential Mode
ollama serve &
ollama pull qwen2.5-coder:14b

# 4. Install backend dependencies
python3 -m pip install -r backend/requirements.txt

# 5. Build frontend production assets
cd frontend && npm install && npm run build && cd ..

# 6. Execute backend verification test suite (29 tests)
PYTHONPATH=. python3 -m unittest discover backend/tests

# 7. Start the unified production server
./start.sh
# Server active at: http://localhost:8000
# OpenAPI Docs at:  http://localhost:8000/docs
```

---

## 9. Final Readiness Summary

* **Fully Implemented & Automated:** AST token optimization, 11-step New Task interface, pre-flight budget enforcement, air-gap zero-cloud-egress lock, human action approval gates, real disposable sandbox test execution, and real Git commit creation.
* **Tested & Verified:** 29/29 backend tests passing (`0.635s`), frontend production build compiling cleanly (`0.440s`), token benchmark suite reproducible.
* **Demonstration Readiness:** **100% READY** for live hackathon demonstration on `http://localhost:8000`.

