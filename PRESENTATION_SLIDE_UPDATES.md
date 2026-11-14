# NEXORA Code — Presentation Slide Updates & Synchronization
**Project:** NEXORA Code — *Code Smarter. Spend Fewer Tokens.*  
**Team:** TEAM ARISE  
**Competition:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — *Build a Coding Agent That Gets the Job Done on the Fewest Tokens*  
**Technology Partner:** Bifrost by Maxim AI  
**Synchronized Date:** November 14, 2026  
**Auditor Role:** Senior AI Infrastructure Engineer & Technical Documentation Specialist  

---

## Slide Section 1: Token Efficiency

### Slide Copy & Disclosures:
* **Core Value Proposition:** Enterprise AI coding agents waste 40%–80% of their tokens dumping entire unreferenced files and boilerplate into model contexts. NEXORA Code uses AST Context Slicing to isolate only relevant functions, structs, and interfaces.
* **Empirical Datasets (Rigorously Separated):**

```
+-------------------------------------------------------------------------------------------------------------+
|                                    NEXORA CODE TOKEN EFFICIENCY BENCHMARKS                                  |
+-----------------------------------+------------------------------------+------------------------------------+
| Benchmark Suite                   | Scope & Measurement                | Measured Reduction %               |
+-----------------------------------+------------------------------------+------------------------------------+
| Benchmark A (Curated Files)       | 3 Core Monorepo Files (Go, TS, Py) | 64.81% Cold-Run Context Reduction  |
|                                   | (4,788 -> 1,685 Input Tokens)      | (3,103 Tokens Saved)               |
+-----------------------------------+------------------------------------+------------------------------------+
| Benchmark B (Multi-Lang Suite)    | 15 End-to-End Tasks (5 Py, 5 Go,   | 41.74% Estimated Total Tokens Saved|
|                                   | 5 TS: cl100k_base In+Out Estimates)| (6,323 -> 3,684 Total BPE Tokens)  |
+-----------------------------------+------------------------------------+------------------------------------+
| Warm Semantic Cache               | Repeated / Equivalent Queries      | 100.00% Token Savings (0 Billed)   |
+-----------------------------------+------------------------------------+------------------------------------+
```

* **Honest Technical Distinctions for Judges:**
  * **Benchmark B Token Estimation:** The 6,323 → 3,684 figures are standardized local BPE tokenizer estimates (`cl100k_base`), NOT actual provider-reported billed invoice tokens.
  * **Actual Billed Usage:** Strictly measured post-inference only when a live provider returns official `usageMetadata` (such as Google Gemini's `promptTokenCount` + `candidatesTokenCount`).
  * **Demo Fixture vs. Standalone Benchmark A:** The interactive demo template dynamically slices `pkg/cache/cache_manager.go` from **1,295 to 301 tokens** (**76.76% savings** / 994 tokens saved). Standalone Benchmark A fixture measures the standardized complete package (**2,052 → 364 tokens**, **82.26% reduction**).
  * **Warm Cache Savings:** 100% token savings applies exclusively to isolated cache-hit queries that bypass LLM invocation.

---

## Slide Section 2: Technical Architecture

### Slide Copy & Disclosures:
* **Provider Routing Topology:**
  ```
  NEXORA Code Cockpit (Vite + React)
                 │
                 ▼
     FastAPI Backend Router
                 │
                 ├──► Google Gemini Direct API (gemini-3.5-flash) [VERIFIED LIVE]
                 │
                 ├──► DeepSeek V3 Failover [MOCK VERIFIED]
                 │
                 └──► Local Ollama (Confidential Mode) [VERIFIED LOCAL-ONLY FAIL-CLOSED (Offline)]
  ```
* **Bifrost by Maxim AI Disclosure:**
  * **Status:** Optional / Inactive in live routing.
  * **Truthful Statement:** *"An OpenAI-compatible Bifrost Gateway client is implemented in `provider_router.py`. Because the public `api.maxim.ai` gateway is currently unreachable on public DNS, our router communicates directly with the Google Gemini API with honest attribution (`Google Gemini (Direct API)`), without disguising direct Gemini calls as Bifrost."*
* **Sandbox Execution Architecture:**
  * **Status:** Path-Confined Disposable Directory Sandbox (`backend/sandboxes/`).
  * **Truthful Statement:** *"NEXORA Code uses path-confined sandbox directories with canonical path verification (`os.path.commonpath`) to strictly prevent `../` traversal and symlink escapes. It is a path-validated filesystem sandbox, not an OS-level kernel or Docker container sandbox. The original host repository is never mutated."*

---

## Slide Section 3: Security, Control & Reliability

### Slide Copy & Disclosures:
* **Zero-Trust Human Approval Gate:**
  * Every AI-generated file modification is staged into an approval gate bound to:
    1. Authenticated User Identity (`user_id`)
    2. Repository Identity (`repo_id`)
    3. Task Identity (`task_id`)
    4. Immutable SHA-256 Unified Diff Digest (`diff_hash`)
    5. 15-Minute Expiration Token
* **Cross-User Security Verification (7/7 Scenarios Blocked):**
  * User B cannot resolve User A’s token (`HTTP 403 Forbidden`).
  * Tokens cannot be hijacked across repositories or tasks (`HTTP 400 Bad Request`).
  * Replayed tokens after resolution are rejected (`HTTP 400 Bad Request`).
  * Tampered diffs fail integrity verification (`HTTP 409 Conflict`).
* **Decoupled Git Commit Authorization:**
  * Applying a patch for sandbox testing does **not** commit to Git. Git commits require separate, explicit human authorization (`approve_git_commit=True`).
* **Confidential Mode (Application-Level Local-Only Routing):**
  * Repositories marked `Confidential` enforce strict application-level local-only routing in the FastAPI router.
  * In the demo environment, the local Ollama daemon is offline; the system strictly fails closed with `HTTP 503 Service Unavailable` rather than leaking proprietary code to cloud models.
  * Clarification: This is application-level routing enforcement, not OS-level network namespace isolation.
* **Dashboard Seed Data Disclosure:**
  * The \$482.40 monthly spend, \$1,200.00 cap, and 14.8M tokens displayed in the cockpit are seeded demonstration baseline data (`bgt_team_arise`) to showcase multi-day pacing and budget guardrails, explicitly badged in the UI as DEMO SEED DATA.

---

## Slide Section 4: Validation & Results

### Slide Copy & Disclosures:
* **Test Suite Reconciled Numbers:**
  * **Pre-Remediation Baseline:** 93 Test Executions / 71 Unique Specifications.
  * **Final Remediated Test Suite:** **102 Test Executions / 80 Unique Specifications (100% Passing)** across 22 test files.
* **Live Gemini API Evidence:**
  * **Status:** **VERIFIED LIVE** (HTTP 200 OK).
  * **Model:** `gemini-3.5-flash` via Direct Google API.
  * **Captured Metadata:** `promptTokenCount: 3`, `candidatesTokenCount: 1`, `thoughtsTokenCount: 80`, `totalTokenCount: 84`, `serviceTier: standard`.
  * **Failover Handling:** Upon transient HTTP 429 quota exhaustion, `ProviderRouter` instantly traps the exception and cascades without crashing.
* **Compilation & Sandbox Correctness:**
  * 15/15 multi-language benchmarks passed syntax / compilation checks (`py_compile` for Python, AST grammar for Go and TypeScript).
  * 15/15 sandbox unit test executions passed with 0 regressions.
