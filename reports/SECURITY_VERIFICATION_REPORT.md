# NEXORA Code — Security & Privacy Verification Report

**Project:** NEXORA Code  
**Team Identity:** TEAM ARISE  
**Competition:** Global AI Hackathon 2026 (Geek Room)  
**Problem Statement:** PS 01 — Build a Coding Agent That Gets the Job Done on the Fewest Tokens  
**Date of Audit:** November 12, 2026  

---

## 1. Zero-Egress Air-Gap Privacy Enforcement (Requirement B)

### Mechanism & Implementation
- **Module:** `backend/app/services/privacy_guard.py` & `backend/app/services/provider_router.py`
- **Rule:** Confidential repositories (`is_confidential = 1` or `privacy_mode = "confidential"`) must exclusively execute on local models (Local Ollama Qwen 2.5 Coder).
- **Zero Cloud Fallback Invariant:** Even if the local model daemon is offline or degraded, the system **NEVER** silently falls back to remote cloud providers (Claude, DeepSeek, or Bifrost). Instead, it raises `HTTP 503 Service Unavailable` with an explicit security alert:
  > *"Local Ollama model is offline. Cloud fallback is strictly prevented by Zero-Egress Air-Gap policy."*
- **Cryptographic Audit Log:** Every access to a confidential repository generates a SHA-256 air-gap signature recorded in `audit_logs`:
  `sha256(repo_id + ":" + is_confidential + ":" + timestamp + ":NEXORA_AIRGAP_VERIFIED")`.

### Test Evidence
- **Automated Test:** `test_02_confidential_safe_failure_when_local_offline` in `backend/tests/test_qa_master_audit.py`
- **Result:** **PASSED (0.089s)**. Confirmed that tripping the local model's circuit breaker and attempting an execution on confidential repo `repo-auth` results in immediate `HTTP 503` blocking and zero cloud transmission.

---

## 2. Action Approval Enforcement (Requirement D)

### Mechanism & Implementation
- **Module:** `backend/app/services/approval_guard.py`
- **Rule:** Explicit developer approval is mandatory prior to:
  1. Modifying or writing repository files.
  2. Executing terminal / shell commands.
  3. Performing Git commits or push operations.
- **Workflow:** When an agent task completes code synthesis in `safe_mode = True`, it generates an `ActionApproval` record with status `PENDING`. Code mutations are held in sandbox staging until the developer explicitly approves via `/api/approvals/{id}/resolve`.
- **Rejection Enforcement:** If a mutation is rejected, the approval status is updated to `REJECTED`, the staged patch is discarded, and the task status is set to `rejected`.

### Test Evidence
- **Automated Tests:**
  - `test_05_action_approval_gate` in `test_full_suite.py`: **PASSED**.
  - `test_04_action_approval_rejected_never_executes` in `test_qa_master_audit.py`: **PASSED**.

---

## 3. Pre-Flight Budget Enforcement (Requirement C)

### Mechanism & Implementation
- **Module:** `backend/app/services/budget_service.py`
- **Rule:** Per-user spending limits must be enforced **BEFORE** making model API calls.
- **Pre-Flight Validation:** Estimates prompt and completion tokens using `tiktoken` BPE. If `current_spend + estimated_cost > monthly_budget_usd`, the request is immediately rejected with `HTTP 403 Forbidden` and details:
  ```json
  {
    "error": "BUDGET_CAP_EXCEEDED",
    "message": "Pre-flight spend check blocked execution: Projected spend $... exceeds monthly hard budget limit $...",
    "hard_limit": 50.00
  }
  ```

### Test Evidence
- **Automated Test:** `test_03_pre_flight_budget_overload_block` in `test_qa_master_audit.py`
- **Result:** **PASSED**. Confirmed that setting budget cap to `$0.05` immediately blocks task execution prior to any inference.

---

## 4. Emergency Kill Switch Enforcement

### Mechanism & Implementation
- **Module:** `ApprovalGuard.set_kill_switch()`
- **Rule:** Instantly freeze all in-flight agent tasks and lock out any new mutations.
- **Backend Lockout:** When engaged, any request to `/api/tasks/execute`, `/api/tasks/analyze`, or `/api/approvals/{id}/resolve` immediately returns `HTTP 423 Locked`.

### Test Evidence
- **Automated Tests:**
  - `test_07_emergency_kill_switch_state` in `test_full_suite.py`: **PASSED**.
  - `test_05_kill_switch_freezes_pending_approvals_and_tasks` in `test_qa_master_audit.py`: **PASSED**.

