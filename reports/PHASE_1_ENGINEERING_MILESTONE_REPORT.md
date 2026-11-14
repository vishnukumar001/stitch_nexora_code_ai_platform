# NEXORA Code — Phase 1 Engineering Milestone Report
**Project:** NEXORA Code — *Code Smarter. Spend Fewer Tokens.*  
**Team:** TEAM ARISE  
**Hackathon:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — Build a Coding Agent That Gets the Job Done on the Fewest Tokens  
**Technology Partner:** Bifrost by Maxim AI  
**Role:** Senior Backend Engineer and Security Architect  
**Date:** November 13, 2026  
**Document Status:** Complete & Verified  

---

## 1. Executive Summary

This milestone report documents the successful completion of the **Phase 1 Engineering Milestone** for NEXORA Code. All core objectives—enforcing mathematical sandbox path confinement, verifying Bifrost AI Gateway integration, separating token telemetry and pricing configurations, and validating the complete automated test suite—have been achieved without modifying the existing React frontend, altering Team Arise branding, or breaking core invariants.

### Key Achievements at a Glance:
* **Sandbox Confinement & Path Security:** Implemented `SandboxService.validate_safe_path` using canonical path resolution (`os.path.realpath`) and `os.path.commonpath` containment checks. Zero directory traversal, absolute path escape, or symlink bypass is permitted.
* **New Security Test Suite:** Created `backend/tests/test_sandbox_security.py` covering all 6 mandatory attack vectors + 2 boundary tests. All 8 tests passing (`Ran 8 tests in 0.012s — OK`).
* **Bifrost by Maxim AI Verification:** URL configuration normalized (`rstrip("/")`), Bearer authentication trimmed, choice/usage parsing hardened, and transparent fallback simulation preserved when `BIFROST_API_KEY` is unconfigured.
* **Granular Token Telemetry:** Telemetry models updated in `schemas.py` and `endpoints.py` to record baseline tokens, compacted tokens, actual provider input tokens, actual provider output tokens, and cache hit flags separately. Cost calculations now dynamically utilize provider-specific pricing configurations.
* **Full Test & Build Verification:** 37/37 backend unit tests passing in 0.658s; frontend production build compiling in 529ms; empirical benchmarks confirming 82.26% (Go), 57.99% (TypeScript), 43.94% (Python), and 100% (Cache Hit) token reductions.

---

## 2. Phase 1 — Sandbox Security Implementation

### 2.1 File Inspected & Modified
* [`backend/app/services/sandbox_service.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/sandbox_service.py)

### 2.2 Security Architecture & Controls Implemented
1. **`SandboxSecurityException`:** Custom exception class (inheriting from `ValueError`) raised on any directory traversal, invalid volume, or symlink escape attempt.
2. **Canonical Sandbox Root Resolution:** Sandbox directory path is resolved to its real canonical path:
   $$\text{sandbox\_root} = \text{os.path.realpath}(\text{os.path.abspath}(\text{sandbox\_path}))$$
3. **Canonical Target Resolution:** Both relative paths and candidate absolute paths are resolved against `sandbox_root` using `os.path.realpath(candidate_abs)`.
4. **`os.path.commonpath` Containment:**
   ```python
   common = os.path.commonpath([sandbox_root, canonical_target])
   if common != sandbox_root:
       raise SandboxSecurityException(f"Security Violation: Target path '{target_file}' escapes sandbox root.")
   ```
5. **Sandbox Root Target Prohibition:** Prevents replacing or overwriting the sandbox root directory itself (`canonical_target == sandbox_root`).
6. **Sandbox ID Path Traversal Defense:** In `get_or_create_sandbox`, verified that `clean_sandbox_id = os.path.basename(sandbox_id)` equals `sandbox_id`, preventing `sandbox_id` from escaping `backend/sandboxes/`.
7. **Strict Patch Application Guard:** `apply_patch_and_test` validates `canonical_target_file = cls.validate_safe_path(sandbox_path, target_file)` before creating files, reading files, or executing subprocesses.

### 2.3 Automated Security Test Evidence
* **Test File:** [`backend/tests/test_sandbox_security.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/tests/test_sandbox_security.py)
* **Execution Command:** `PYTHONPATH=. python3 -m unittest backend/tests/test_sandbox_security.py`
* **Result:** `Ran 8 tests in 0.012s — OK`

| Test Case | Scenario Tested | Attack Vector / Input | Expected Result | Status |
|---|---|---|---|---|
| `test_01` | Normal relative path | `"main.py"`, `"pkg/cache/cache_manager.py"` | Successfully resolves to canonical path inside sandbox | **PASS (`VERIFIED AUTOMATED`)** |
| `test_02` | Parent directory traversal | `"../outside.txt"`, `"../../etc/passwd"` | Raises `SandboxSecurityException` | **PASS (`VERIFIED AUTOMATED`)** |
| `test_03` | Absolute external path | `"/etc/passwd"`, `"/tmp/secret.key"` | Raises `SandboxSecurityException` | **PASS (`VERIFIED AUTOMATED`)** |
| `test_04` | Nested directory traversal | `"pkg/cache/../../../../external_vault/secret.key"` | Raises `SandboxSecurityException` | **PASS (`VERIFIED AUTOMATED`)** |
| `test_05` | Symlink directory escape | `"vault_symlink/secret.key"` (symlink to external dir) | Raises `SandboxSecurityException` | **PASS (`VERIFIED AUTOMATED`)** |
| `test_05b`| Symlink file escape | `"secret_symlink.key"` (symlink to external file) | Raises `SandboxSecurityException` | **PASS (`VERIFIED AUTOMATED`)** |
| `test_06` | Valid nested sandbox file | `"pkg/cache/cache_manager.py"`, new nested file | Successfully resolves within sandbox boundary | **PASS (`VERIFIED AUTOMATED`)** |
| `test_07` | Patch application block | `apply_patch_and_test(..., target_file="../../outside.py")` | Raises exception; external file untouched | **PASS (`VERIFIED AUTOMATED`)** |
| `test_08` | Sandbox ID escape check | `get_or_create_sandbox("../escape_sandbox")` | Raises `SandboxSecurityException` | **PASS (`VERIFIED AUTOMATED`)** |

---

## 3. Phase 2 — Bifrost AI Gateway Integration

### 3.1 File Inspected & Hardened
* [`backend/app/services/provider_router.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/provider_router.py)

### 3.2 Audit Findings & Engineering Enhancements
1. **Gateway URL Normalization:** `bifrost_url = os.environ.get("BIFROST_GATEWAY_URL", "https://api.maxim.ai/bifrost/v1").rstrip("/")` ensures endpoint URLs never suffer double-slash formatting (`//chat/completions`).
2. **Authentication Header Sanitization:** Reads `BIFROST_API_KEY` from environment. Strips whitespace and auto-formats `Bearer <KEY>` cleanly. Never logs or returns raw keys.
3. **Payload & Model Formatting:** Structured for OpenAI-compatible chat completions (`/chat/completions`) routing to models such as `bifrost-adaptive-router`, `claude-3-7-sonnet`, `claude-3-5-sonnet`, and `gpt-4o`.
4. **Response Parsing Resiliency:** Extracts diff content from either standard OpenAI choices (`choices[0]["message"]["content"]`) or root `content` fields.
5. **Usage Telemetry Capture:** Captures `usage.prompt_tokens` and `usage.completion_tokens`, falling back to exact BPE tokenizer calculations if provider usage objects are absent.
6. **Transparent Fallback Simulation (Current Host State):**
   - **Host Environment Check:** `BIFROST_API_KEY` is currently unset in the host process environment.
   - **Adherence to Constraint:** In accordance with instructions (*"Do not fabricate live execution. Do not make paid API calls without explicit authorization"*), the system executes deterministic simulated fallback.
   - **Labeling Invariant:** Returned tasks explicitly carry `"execution_mode": "SIMULATED PROVIDER EXECUTION"` and document missing configuration in task summaries.

---

## 4. Phase 3 — Granular Token Telemetry & Cost Accounting

### 4.1 Files Inspected & Modified
* [`backend/app/services/tokenizer_service.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/services/tokenizer_service.py)
* [`backend/app/models/schemas.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/models/schemas.py)
* [`backend/app/api/endpoints.py`](file:///Users/vishnukumar/Downloads/stitch_nexora_code_ai_platform/backend/app/api/endpoints.py)

### 4.2 Telemetry Separation Architecture
Prior to this milestone, estimated context savings were sometimes conflated with runtime provider usage. Telemetry has now been mathematically bifurcated:

1. **Pre-Inference Context Optimization Metrics:**
   - `tokens_uncompressed`: Baseline token count of raw target context (e.g. 1,295 tokens).
   - `tokens_compressed`: Token count of pruned AST context (e.g. 301 tokens).
   - `tokens_saved`: $T_{\text{uncompressed}} - T_{\text{compressed}}$ (e.g. 994 tokens).
   - `compression_ratio`: $\frac{T_{\text{saved}}}{T_{\text{uncompressed}}} \times 100$ (e.g. 76.8%).
2. **Runtime Provider Usage Metrics (Billed Telemetry):**
   - `provider_input_tokens`: Actual tokens transmitted across the network to the AI provider.
   - `provider_output_tokens`: Actual tokens generated by the model.
   - `actual_tokens_billed`: $T_{\text{input}} + T_{\text{output}}$ (Strictly $0$ on semantic cache hits).
3. **Semantic Cache Tracking:**
   - `cache_hit`: Explicit boolean flag.
   - On cache hit: `actual_tokens_billed = 0`, `cost_billed_usd = 0.0`, `compression_ratio = 100.0%`.
4. **Provider-Aware Cost Modeling:**
   - `calculate_cost` enhanced with optional `provider_rates: Tuple[float, float]` ($/M input, $/M output) queried directly from SQLite `providers` table.
   - Accurately computes billing for DeepSeek ($0.14/$0.28 per M), Bifrost ($1.20/$4.50 per M), Claude ($3.00/$15.00 per M), GPT-4o ($2.50/$10.00 per M), and local Ollama ($0.00/$0.00).

---

## 5. Phase 4 — Comprehensive Verification Suite Results

### 5.1 Full Backend Test Suite
* **Command:** `PYTHONPATH=. python3 -m unittest discover backend/tests`
* **Tests Executed:** 37 tests (29 existing tests + 8 new sandbox security tests)
* **Outcome:** `Ran 37 tests in 0.658s — OK`
* **Failures / Errors:** 0
* **Classification:** **`VERIFIED AUTOMATED`**

### 5.2 Frontend Production Build
* **Command:** `cd frontend && npm run build`
* **Output:**
  - `dist/index.html`: 1.06 kB (gzip: 0.57 kB)
  - `dist/assets/index-MgByZWu1.css`: 36.70 kB (gzip: 6.97 kB)
  - `dist/assets/index-DALQ03rt.js`: 251.86 kB (gzip: 66.86 kB)
* **Build Time:** 529 milliseconds
* **Errors / Warnings:** 0
* **Classification:** **`VERIFIED LIVE`**

### 5.3 Token Benchmark Suite
* **Command:** `python3 backend/benchmark/run_benchmark.py`
* **Empirical Token Savings Verified:**
  - Go Service Context: 1,353 $\rightarrow$ 240 tokens (**82.26% reduction**)
  - TypeScript Context: 707 $\rightarrow$ 297 tokens (**57.99% reduction**)
  - Python Context: 1,072 $\rightarrow$ 601 tokens (**43.94% reduction**)
  - Semantic Cache Hit: **0 tokens billed (100.0% reduction)**
* **Classification:** **`VERIFIED LIVE`**

---

## 6. Files Changed in Milestone

| File Path | Nature of Change | Core Purpose |
|---|---|---|
| `backend/app/services/sandbox_service.py` | Security Hardening | Implemented `validate_safe_path`, `SandboxSecurityException`, `os.path.commonpath` containment, and sandbox root target prohibition. |
| `backend/tests/test_sandbox_security.py` | New Automated Tests | 8 comprehensive security test cases covering traversal, absolute paths, nested attacks, and symlinks. |
| `backend/app/services/tokenizer_service.py` | Telemetry Enhancement | Enhanced `calculate_cost` with provider rate tuples and expanded `MODEL_PRICING` dictionary. |
| `backend/app/services/provider_router.py` | Gateway Hardening & Telemetry | Normalized Bifrost gateway URLs, trimmed auth headers, captured granular input/output tokens, and tracked cache hits. |
| `backend/app/models/schemas.py` | Contract Update | Added `provider_input_tokens`, `provider_output_tokens`, `cache_hit`, and `actual_tokens_billed` to API response schemas. |
| `backend/app/api/endpoints.py` | Endpoint Integration | Integrated granular token telemetry, cache hit tracking, and provider rate lookups in `/tasks/analyze` and `/tasks/execute`. |
| `reports/NEXORA_SECURITY_AND_PRIVACY_AUDIT.md` | Documentation Update | Updated threat model table: Path Traversal marked Fully Mitigated & Verified Automated. |
| `reports/NEXORA_EXTERNAL_AI_HANDOFF.md` | Documentation Update | Updated recommendation roadmap: P3 Sandbox Path Traversal marked Completed. |

---

## 7. Status Classification & Remaining Limitations

| Component | Status Classification | Details / Evidence |
|---|---|---|
| **Sandbox Confinement & Path Security** | **`VERIFIED AUTOMATED`** | 8/8 automated security tests passing in CI/test runner. |
| **Bifrost Gateway HTTP Client** | **`SIMULATED`** (Live) / **`VERIFIED AUTOMATED`** (Mocked) | Fully implemented with HTTP Bearer client; runs in transparent simulation because `BIFROST_API_KEY` is not set on host. Tested via `test_bifrost_real_workflow.py`. |
| **Ollama Local Model Client** | **`SIMULATED`** (Live) / **`VERIFIED AUTOMATED`** (Mocked) | Client logic implemented; runs in transparent air-gapped simulation because daemon is offline on host port 11434. Circuit breaker strictly blocks cloud leakage. |
| **Token Telemetry Separation** | **`VERIFIED AUTOMATED` & `VERIFIED LIVE`** | Baseline tokens, compacted tokens, actual provider tokens, and cache hits tracked separately in API responses. |
| **Test Suite & Benchmark Execution** | **`VERIFIED AUTOMATED` & `VERIFIED LIVE`** | 37/37 tests passing in 0.658s; benchmark confirms 71.05% average token reduction. |

### Remaining Limitations:
1. **Live External AI Credentials:** Live Bifrost invocations require exporting `BIFROST_API_KEY` in the host shell environment. Once exported, zero code modifications are necessary.
2. **Local Inference Daemon:** Live local air-gapped execution requires running `ollama run qwen2.5-coder:14b` on host port 11434.
3. **Container-Level Sandbox Isolation:** Filesystem-level worktree isolation and path confinement are complete; production enterprise deployment can further isolate test execution inside ephemeral Docker containers.

