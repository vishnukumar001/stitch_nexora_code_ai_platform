# NEXORA Code — Comprehensive Remediation Baseline (Phase 0)

**Project:** NEXORA Code  
**Tagline:** *Code Smarter. Spend Fewer Tokens.*  
**Team:** TEAM ARISE  
**Hackathon:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — *Build a Coding Agent That Gets the Job Done on the Fewest Tokens*  
**Auditor / Architect:** Principal Software Architect & QA Lead  
**Date:** November 14, 2026  
**Status:** BASELINE ESTABLISHED — PROCEEDING TO PHASE 1  

---

## 1. Executive Summary

This remediation baseline documents the exact technical state of the NEXORA Code repository before undertaking the mandatory remediation phases. It catalogs existing functional components, confirmed gaps, architectural risks, and test coverage to guide implementation without regressing existing capabilities.

---

## 2. Existing Functionality

1. **FastAPI Backend (`backend/app/main.py`, `backend/app/api/endpoints.py`):**
   * Exactly 20 registered REST endpoints under `/api`.
   * Static mount for production frontend bundle.
   * Health check, repository management, task analysis, task execution, budget policy, and analytics endpoints.
2. **Provider Cascade Router (`backend/app/services/provider_router.py`):**
   * Multi-provider cascade (`prov-gemini`, `prov-bifrost`, `prov-claude`, `prov-deepseek`, `prov-gpt4o`, `prov-ollama`).
   * Circuit-breaker health tracking (failure counting and tripping).
   * Direct Google Gemini API integration (`gemini-3.5-flash`).
3. **AST Context Slicing (`backend/app/services/ast_optimizer.py`):**
   * Native AST pruning for Python using standard library `ast`.
   * Heuristic structural symbol slicing for Go, TypeScript, and Rust.
4. **Tokenization & Cost Estimation (`backend/app/services/tokenizer_service.py`):**
   * Standardized local BPE tokenizer (`tiktoken cl100k_base`).
   * Provider rate pricing calculations ($0.075 in / $0.30 out for Gemini 3.5 Flash).
5. **Code Privacy & Airgap Enforcement (`backend/app/services/privacy_guard.py`):**
   * Enforces local model routing for confidential repositories.
   * Produces SHA-256 tamper-evident integrity digests.
6. **Action Approval Governance (`backend/app/services/approval_guard.py`):**
   * Intercepts mutations for human review.
   * Persistent SQLite-backed Emergency Kill Switch.
7. **Sandbox Execution (`backend/app/services/sandbox_service.py`):**
   * Filesystem sandbox containment check (`validate_safe_path` via `os.path.commonpath`).
   * Test runner and Git commit creation in disposable sandboxes.
8. **React Frontend (`frontend/src/`):**
   * 10 complete views matching Google Stitch design system.
   * Vite production build verified (534ms, 0 errors).

---

## 3. Confirmed Defects & Implementation Gaps

| # | Domain | Severity | Confirmed Defect / Gap | Root Cause |
|---|---|---|---|---|
| **1** | **Bifrost Integration** | **CRITICAL** | Live requests bypass Bifrost gateway and execute directly against Google Gemini API (`generativelanguage.googleapis.com`). `BIFROST_API_KEY` is empty, and `api.maxim.ai` returns NXDOMAIN on public DNS. | Missing live gateway proxy routing layer and fallback attribution handling. |
| **2** | **Human Approval Security** | **CRITICAL** | Approval resolution currently applies patch and creates a Git commit in a single step without requiring separate approval for the Git commit. Approval tokens lack expiration timestamps and hash binding to the exact proposed diff. | Monolithic `resolve_action_approval()` method bundles patch application and Git commit together. |
| **3** | **Budget Concurrency & Precision** | **HIGH** | Budget calculations use float rather than `Decimal` arithmetic. Pre-flight checks do not reserve estimated spend during concurrent requests, creating race conditions where concurrent calls could breach budget limits. | In-memory balance checking without atomic reservation or row locks. |
| **4** | **Provider Failover Proof** | **HIGH** | Circuit breaker tripping was verified, but a live demonstrated transition where a failed primary provider dynamically hands off to a secondary provider and succeeds within the same call needs comprehensive integration tests. | Test suite verified circuit breaker tripping on local mock, but lacked end-to-end failover handoff assertion. |
| **5** | **Task Correctness in Benchmark** | **HIGH** | Benchmarks measured token count reduction (64.81%), but did not execute verification tests on the generated code to prove that pruned contexts produce working, test-passing solutions. | Benchmark suite was focused strictly on token reduction rather than output code test pass rates. |

---

## 4. Architecture Risks

1. **External Gateway Availability:** If external gateway hostnames are unresolvable or require private networking, hardcoded gateway reliance causes complete execution failure. The architecture must support robust fallback while preserving accurate provider labeling.
2. **Approval Token Tampering:** If approval IDs are predictable or lack cryptographic binding to the staged diff text, an unauthorized client could approve a tampered payload.
3. **Concurrency in Budget Tracking:** In high-concurrency environments, multiple tasks reading `current_spend_usd` simultaneously could both pass pre-flight checks before either records usage.

---

## 5. Baseline Test Suite Results

Command:
```bash
NEXORA_TEST_MOCK_LLM=1 PYTHONPATH=. python3 -m unittest discover backend/tests
```

**Results:**
* Total Test Suites: 8
* Total Tests Executed: **41**
* Passing: **41**
* Failing: **0**
* Execution Time: **0.786s**

---

## 6. Priority Remediation Roadmap

* **Phase 1 (CRITICAL):** Bifrost Gateway Integration & Transparent Fallback Attribution.
* **Phase 2 (CRITICAL):** Strict Human Approval, Diff Hash Binding, Token Expiration, and Separate Git Commit Approval.
* **Phase 3 (HIGH):** Per-User Budget Concurrency, Atomic Spend Reservations, and Decimal Precision.
* **Phase 4 (HIGH):** End-to-End Provider Failover & Circuit Breaker Recovery Integration.
* **Phase 5 (CRITICAL):** Confidential Mode Zero-Egress Hardening.
* **Phase 6 (CRITICAL):** Token Optimization & Task Correctness Verification.
* **Phase 7 (CRITICAL):** Complete End-to-End Workflow Verification.
* **Phase 8-10:** Security Remediation, Frontend Verification, and Final Documentation.
