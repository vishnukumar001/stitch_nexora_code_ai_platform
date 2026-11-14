# NEXORA Code — Final Live Demonstration Runbook & Checklist

**Project:** NEXORA Code — *Code Smarter. Spend Fewer Tokens.*  
**Team:** TEAM ARISE  
**Competition:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — *Build a Coding Agent That Gets the Job Done on the Fewest Tokens*  
**Technology Partner:** Bifrost by Maxim AI  
**Primary AI Engine:** Google Gemini API (`gemini-3.5-flash`)  
**Auditor & Presentation Lead:** TEAM ARISE Lead Architect  

---

## 1. Pre-Demo Environment Verification Checklist

Execute these verification checks 15 minutes before presenting to the judges:

- [ ] **1. Python Backend Running:**
  ```bash
  # Check backend health
  curl -s http://localhost:8000/api/health
  # Expected response: {"status": "healthy", ...}
  ```
- [ ] **2. React/Vite Frontend Running:**
  ```bash
  # Open in browser:
  http://localhost:5173
  ```
- [ ] **3. Automated Test Verification:**
  ```bash
  python3 -m unittest discover -s backend/tests
  # Expected: Ran 102 tests in ~6s — OK (0 failures)
  ```
- [ ] **4. Database Seed State & Kill Switch:**
  ```bash
  # Ensure kill switch is disengaged:
  curl -s -X POST "http://localhost:8000/api/security/kill-switch?engaged=false"
  ```
- [ ] **5. Environment Keys Confirmed:**
  Ensure `.env` contains `GEMINI_API_KEY` for live model inference.

---

## 2. Five-Minute Live Judge Demonstration Script

### Act 1: The Token Crisis & The NEXORA Cockpit (0:00 – 1:00)
1. **Open the Dashboard (`http://localhost:5173`):**
   * *What to Say:* *"Enterprise AI coding agents waste up to 80% of their tokens sending entire multi-thousand-line repositories and unreferenced boilerplate into the LLM context window. NEXORA Code solves this with intelligent AST Context Slicing."*
   * *What to Show:* Show the cockpit telemetry: **14.8M tokens used**, **76.1% token savings**, **\$482.40 spend against \$1,200.00 monthly budget** *(explicitly labeled in the UI as DEMO SEED DATA to distinguish demonstration baseline presets from live execution telemetry)*.
   * Point out the **Google Gemini Direct API status** (Verified Live) and provider failover topology.

### Act 2: AST Context Slicing in Action (1:00 – 2:00)
1. **Navigate to "New Task / Workspace":**
2. **Select Repository:** `prod-core-monorepo` (`repo-core`).
3. **Select Prompt Template or Enter:**
   `"Find and fix the memory leak in cache_manager.go. Explain the root cause, generate a minimal patch, and run the relevant tests."`
4. **Click "Analyze Code Context":**
   * *What to Show:* The AST Analyzer inspects `cache_manager.go`:
     - In the live interactive UI workspace, the target context is dynamically sliced from **1,295 baseline tokens** down to **301 tokens** — an immediate **76.76% token reduction** (**994 tokens saved**)!
     - *(Note for judges: In our standalone standardized Benchmark A suite, the full package fixture demonstrates 2,052 → 364 tokens, an 82.26% reduction)*.
   * *What to Say:* *"Notice how our AST engine prunes unreferenced structs, lock contention blocks, and dead imports while isolating the exact `CacheManager` struct and `EvictExpiredKeys()` method."*

### Act 3: Live Inference & Provider Cascade (2:00 – 3:00)
1. **Click "Generate Solution Patch":**
   * *What to Show:* The request routes through `ProviderRouter`:
     - Checks pre-flight budget reservation with Decimal precision.
     - Dispatches prompt to the primary AI model (**Google Gemini 3.5 Flash Direct API**).
     - Generates a surgical unified diff replacing raw buffer allocations with `sync.Pool`.
   * *What to Say:* *"The solution is synthesized live. Upstream token metadata is captured directly from Google Gemini's response, billing exact tokens and reconciling the reserved budget."*

### Act 4: Human-in-the-Loop Gate & Decoupled Git Commit (3:00 – 4:00)
1. **Inspect Step 9: Action Approval Gate:**
   * *What to Say:* *"Zero-trust security: NEXORA Code never modifies files or creates commits automatically. Every patch is bound to an immutable SHA-256 diff hash, the issuing user, repository, and task, protected by a 15-minute expiration token."*
2. **Demonstrate Decoupled File-Write vs. Git Commit Authorization:**
   * **Step A (Withhold Commit):** Uncheck the toggle: *"Authorize Git commit creation in sandbox upon approval"*.
   * **Step B (Apply Patch & Test):** Click *"Approve & Apply Changes"*.
   * *What to Show:* The patch is applied to the isolated sandbox filesystem (`backend/sandboxes/nx-sandbox-...`), and 24/24 unit tests pass in the sandbox, BUT the Git commit is strictly withheld (`pending_git_approval`, uncommitted staged changes).
   * *What to Say:* *"Notice that applying a patch to test it in the sandbox does NOT mutate repository version history. An agent can never commit to Git without separate, explicit authorization."*
3. **Authorize Git Commit:**
   * Explain that checking the Git commit authorization toggle generates a genuine sandbox Git commit with a **SHA-256 Tamper-Evident Audit Digest**.

### Act 5: Confidential Mode (Local Routing) & Financial Guardrails (4:00 – 5:00)
1. **Navigate to Repositories & Switch to `auth-service` (Confidential):**
   * *What to Say:* *"When a repo is marked Confidential, NEXORA enforces Application-Level Local-Only Routing, routing exclusively to local models (Ollama Qwen 2.5 Coder). In this demonstration environment, the local Ollama daemon is offline; rather than falling back to remote cloud models, the system strictly fails closed with HTTP 503 Service Unavailable, preventing accidental third-party data egress. Note: This is an application-level routing policy, not an OS-level network isolation."*
2. **Navigate to Budget Manager (`/budget`):**
   * Show hard budget limits, token caps, and runway calculation.
   * Demonstrate pre-flight overload rejection: *"If projected spend exceeds the user's hard cap, the call is blocked BEFORE the model is invoked."*
3. **Show the Emergency Kill Switch (Top-Right Nav):**
   * Toggle the Kill Switch: instantly freezes all agent executions with `HTTP 423 Locked`.

---

## 3. Judge Q&A Cheat Sheet (Honest Technical Answers)

| Potential Judge Question | Technical Reality & Recommended Response |
| :--- | :--- |
| **"Are you calling Bifrost or Google Gemini directly?"** | *"We execute all live inference directly through the Google Gemini API (gemini-3.5-flash), with honest attribution ('Google Gemini (Direct API)') and captured token metadata. While an OpenAI-compatible Bifrost client is preserved in our router code for future proxying, we decided not to integrate Bifrost at this stage, so no live requests are routed through it."* |
| **"What happens when Gemini hits rate limits (HTTP 429)?"** | *"Our `ProviderRouter` automatically cascades to secondary models (DeepSeek V3, Claude 3.7). The DeepSeek client is fully implemented with OpenAI compatibility and token usage parsing. If a live API key is missing or quota is exhausted, it safely runs transparent simulated fallback."* |
| **"How do you prevent User B from approving User A's token or tampering with the diff?"** | *"Every approval gate is cryptographically bound to the issuing user (`user_id`), target repository (`repo_id`), parent task (`task_id`), and exact diff SHA-256 hash. If User B attempts to resolve User A's token, the server strictly returns HTTP 403. If the diff is altered, it returns HTTP 409. If a resolved token is replayed, it returns HTTP 400."* |
| **"How do you get your token savings and verify correctness across languages?"** | *"Our AST Context Slicing engine (`ast_optimizer.py`) parses syntax trees to extract only targeted symbols and strip unreferenced boilerplate. In our 15-task multi-language benchmark (Python, Go, TypeScript), it achieved a verified 41.74% estimated total token reduction (6,323 → 3,684 tokens via standard `cl100k_base` BPE tokenizer) with 100% compilation and sandbox unit test pass rates. Note that `cl100k_base` figures are standardized pre-flight estimates; actual billed tokens are measured directly from live model usageMetadata. Repeated queries hit our Semantic Cache for 100% token savings (0 tokens billed)."* |
| **"How do you prevent concurrent race conditions on user budgets?"** | *"Our `BudgetService` uses Python `Decimal` quantization to eliminate floating-point drift and enforces an atomic thread-safe 3-stage lifecycle: Pre-flight Reservation -> Task Dispatch -> Actual Spend Reconciliation. If 20 threads simultaneously try to exceed the budget, only the allowed slots succeed and the rest receive HTTP 403."* |
| **"Can the agent modify files outside the sandbox?"** | *"No. All operations run in a path-confined disposable directory clone (`backend/sandboxes/`) with canonical path verification (`os.path.commonpath`), strictly blocking `../` traversal, absolute path escapes, and symlink jailbreaks. The original project repository is never mutated. Note that this is a path-validated directory sandbox, not a kernel or Docker container sandbox."* |
| **"Is the audit log immutable?"** | *"Audit logs are written to SQLite with unique cryptographic IDs and SHA-256 tamper-evident integrity digests computed across the approval ID, reviewer, decision, and timestamp."* |

---

## 4. Emergency Backup Commands

If anything goes wrong during the demo, run these quick commands in terminal:

```bash
# 1. Reset all circuit breakers and semantic cache
python3 -c "from backend.app.services.provider_router import ProviderRouter; [ProviderRouter.reset_circuit_breaker(p) for p in ['prov-gemini', 'prov-bifrost', 'prov-ollama']]"

# 2. Reset Kill Switch to OFF
curl -s -X POST "http://localhost:8000/api/security/kill-switch?engaged=false"

# 3. Reset test user budget
python3 -c "from backend.app.services.budget_service import BudgetService; BudgetService.get_budget_policy('usr_team_arise_01')"

# 4. Verify backend health
curl -s http://localhost:8000/api/health
```

---

<div align="center">
<strong>NEXORA Code is thoroughly audited, verified, and submission-ready for the Global AI Hackathon 2026.</strong>
</div>
