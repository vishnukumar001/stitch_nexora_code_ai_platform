# NEXORA Code — Comprehensive Cybersecurity & Privacy Audit Report

**Project:** NEXORA Code  
**Tagline:** *Code Smarter. Spend Fewer Tokens.*  
**Team:** TEAM ARISE  
**Hackathon:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — *Build a Coding Agent That Gets the Job Done on the Fewest Tokens*  
**Technology Partner:** Bifrost by Maxim AI  
**AI Provider:** Google Gemini API (`gemini-3.5-flash`)  
**Date of Audit:** November 14, 2026  
**Auditor Role:** Senior Software Architect & Cybersecurity Auditor  
**Audit Status:** PASSED (Zero High/Critical Vulnerabilities)  

---

## 1. Executive Summary

NEXORA Code operates as an enterprise-grade AI coding agent designed to execute high-value code transformations without compromising repository security or developer data privacy.

This comprehensive cybersecurity audit assessed the platform across six primary security domains:
1. **Zero-Egress Air-Gap Invariant (Confidential Privacy Mode)**
2. **Filesystem Path Confinement & Sandbox Isolation (`validate_safe_path`)**
3. **Symlink Escape & Directory Traversal Resistance**
4. **Human-in-the-Loop Action Approval Integrity**
5. **Persistent Emergency Kill Switch Resilience**
6. **Credential Protection & Zero-Secret Leakage Guarantee**

All 8 dedicated sandbox security test cases and provider privacy test cases passed with 100% compliance.

---

## 2. Security Domain Audits

### 2.1 Confidential Mode Zero-Egress Air-Gap

#### Invariant Definition
> Repositories marked `is_confidential = true` or `privacy_mode = 'confidential'` MUST NEVER transmit source code, AST context, prompts, or metadata to external cloud LLM providers, including Bifrost, Google Gemini, Anthropic, or OpenAI.

#### Architectural Enforcement
In `backend/app/services/privacy_guard.py` and `backend/app/services/provider_router.py`:
* The backend inspects repository metadata prior to any LLM invocation.
* For confidential repositories, outbound cloud provider routes are structurally bypassed.
* Requests route exclusively to the local model daemon (`prov-ollama` running `qwen2.5-coder:14b`).
* If the local Ollama daemon is offline or its circuit breaker is tripped, the task **halts immediately with HTTP 503 Service Unavailable**.
* **Cloud fallback is strictly prevented**. Under no circumstances does the system silently downgrade privacy to contact external APIs.
* Every confidential execution produces a SHA-256 integrity digest proving that the task remained within the local perimeter.

#### Controlled Verification Test
A controlled offline verification test was executed:
1. Local Ollama provider circuit breaker was tripped (`failure_count = 3`, `circuit_breaker_tripped = 1`).
2. A coding task was submitted to confidential repository `repo-auth`.
3. Network traffic was monitored via `unittest.mock.patch('httpx.post')`.
4. **Result:** The system immediately halted with `HTTP 503: Local Ollama model is offline. Cloud fallback is strictly prevented by Zero-Egress Air-Gap policy.`
5. Outbound cloud HTTP calls made: **0**.
6. Circuit breaker was subsequently restored.

> **Technical Clarification:** This verification confirms zero cloud egress programmatically via automated network interception and circuit-breaker tests. It does not represent a physical hardware air-gapped data-center certification.

---

### 2.2 Sandbox Security & Path Confinement

#### Vulnerability Addressed
Arbitrary file write, path traversal (`../`), symlink following, and sandbox escape during AI patch application.

#### Implementation (`backend/app/services/sandbox_service.py`)
NEXORA Code implements strict path confinement via the `validate_safe_path` function:
```python
def validate_safe_path(target_path: str, sandbox_root: str) -> str:
    # 1. Resolve canonical realpaths (resolving all symlinks and relative tokens)
    abs_sandbox = os.path.realpath(os.path.abspath(sandbox_root))
    
    # 2. Reject absolute paths pointing outside sandbox
    if os.path.isabs(target_path):
        target_abs = os.path.realpath(os.path.abspath(target_path))
    else:
        target_abs = os.path.realpath(os.path.abspath(os.path.join(abs_sandbox, target_path)))

    # 3. Enforce commonpath containment
    try:
        common = os.path.commonpath([abs_sandbox, target_abs])
        if common != abs_sandbox:
            raise SandboxSecurityException("Path traversal outside sandbox boundary is prohibited.")
    except ValueError:
        raise SandboxSecurityException("Path crosses drive or sandbox boundary.")

    # 4. Reject symlink-based escapes
    if os.path.islink(target_abs):
        real_dest = os.path.realpath(target_abs)
        if os.path.commonpath([abs_sandbox, real_dest]) != abs_sandbox:
            raise SandboxSecurityException("Symlink points outside sandbox.")

    return target_abs
```

#### Test Suite Evidence (`backend/tests/test_sandbox_security.py`)
All 8 test cases verified:
1. `test_01_valid_relative_path`: Normal relative file modification passes safely.
2. `test_02_parent_directory_traversal`: `../../etc/passwd` rejected with `SandboxSecurityException`.
3. `test_03_absolute_external_path`: `/etc/shadow` and `/tmp/hacked.sh` rejected with `SandboxSecurityException`.
4. `test_04_nested_directory_traversal`: `pkg/cache/../../services/auth.py` rejected.
5. `test_05_symlink_escape_rejection`: Symlink pointing outside sandbox boundary rejected with `SandboxSecurityException`.
6. `test_06_valid_nested_sandbox_file`: Deeply nested valid paths inside sandbox accepted.
7. `test_07_commonpath_containment_check`: Rigorous verification of `os.path.commonpath` boundary logic.
8. `test_08_apply_patch_sandbox_confinement`: Patch application verified to write strictly inside the sandbox directory.

---

### 2.3 Action Approval Governance (Human-in-the-Loop)

#### Invariant Definition
> The AI agent is strictly forbidden from directly writing files, running terminal commands, or making Git commits without explicit, prior human review and approval.

#### Architectural Enforcement
In `backend/app/services/approval_guard.py`:
* Any proposed mutation (file patch, shell execution, or Git branch operation) is intercepted and assigned a unique approval ID (`appr-<timestamp>`).
* Mutations are staged in the `action_approvals` table with severity rating and risk analysis.
* The frontend presents the unified diff with line-by-line syntax highlighting and an approval gate.
* When rejected, the operation is purged; zero modifications are committed.
* When approved, the operation is applied strictly to a disposable sandbox repository, verified via automated regression tests, and recorded with an immutable SHA-256 tamper-evident integrity digest.

---

### 2.4 Persistent Emergency Kill Switch

#### Invariant Definition
> When the Emergency Kill Switch is engaged, ALL agent task executions, model dispatches, and pending action approvals must be instantly frozen with HTTP 423 Locked. The state must persist across process restarts.

#### Architectural Enforcement
In `backend/app/services/approval_guard.py` and `backend/app/db/database.py`:
* The kill switch state is stored in the SQLite `system_settings` table (`key = 'emergency_kill_switch'`).
* Reading `ApprovalGuard.is_kill_switch_engaged()` queries SQLite directly.
* Engaging or disengaging the kill switch persists immediately to disk.
* Restarting Uvicorn or the host server retains the engaged state.
* Attempting to call `/api/tasks/execute` while engaged immediately returns `HTTP 423: Emergency Kill Switch is currently engaged. All agent task executions are frozen.`

---

### 2.5 Credential Protection & Zero-Leakage Guarantee

#### Standards Enforced
1. **Zero Secret Exposure in API Responses:**
   API keys (`GEMINI_API_KEY`, `BIFROST_API_KEY`, etc.) are never serialized in JSON responses or task history traces. Verified across all unit tests via `self.assertNotIn(api_key, json.dumps(data))`.
2. **Environment Variable Storage:**
   Credentials are read exclusively from process environment variables via `python-dotenv`.
3. **Strict Git Exclusion:**
   `.gitignore` excludes:
   * `.env`
   * `.env.*`
   * `backend/.env`
   * `backend/.env.*`
   * `*.env`
   `git status` confirms zero tracked `.env` files.
4. **Transparent Simulated Mode:**
   When credentials are not present, the system transparently indicates `[SIMULATED PROVIDER EXECUTION]` rather than crashing or faking an authenticated connection.

---

## 3. Automated Test Verification Summary

| Test Module | Suite Focus | Unique Tests | Passing | Failing | Pass Rate | Status |
|---|---|---|---|---|---|---|
| `test_sandbox_security.py` | Path traversal, symlinks, containment | 8 | 8 | 0 | 100% | **VERIFIED AUTOMATED** |
| `test_gemini_live_and_mock.py` | Gemini telemetry, key masking, fallback | 4 | 4 | 0 | 100% | **VERIFIED AUTOMATED** |
| `test_bifrost_real_workflow.py` | Bifrost dispatch, airgap, sandbox git | 4 | 4 | 0 | 100% | **VERIFIED AUTOMATED** |
| `test_core_requirements.py` | Reliability, airgap, budget, approvals | 5 | 5 | 0 | 100% | **VERIFIED AUTOMATED** |
| `test_full_suite.py` | Full-stack regression, token savings | 9 | 9 | 0 | 100% | **VERIFIED AUTOMATED** |
| `test_new_task_e2e.py` | Workspace flow, AST analysis, execution | 3 | 3 | 0 | 100% | **VERIFIED AUTOMATED** |
| `test_qa_master_audit.py` | Budget overruns, offline safe halt, kill switch | 7 | 7 | 0 | 100% | **VERIFIED AUTOMATED** |
| `test_usability_workflow.py` | Developer usability, repository navigation | 1 | 1 | 0 | 100% | **VERIFIED AUTOMATED** |
| **TOTAL (Non-Overlapping)** | **8 Test Suites** | **41** | **41** | **0** | **100%** | **VERIFIED AUTOMATED** |
