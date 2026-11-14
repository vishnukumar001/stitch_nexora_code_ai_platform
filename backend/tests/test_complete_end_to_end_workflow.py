import time
import hashlib
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.approval_guard import ApprovalGuard
from backend.app.services.budget_service import BudgetService
from backend.app.services.semantic_cache import semantic_cache
from backend.app.services.provider_router import ProviderRouter
from backend.app.db.database import get_connection

class TestCompleteEndToEndWorkflow(unittest.TestCase):
    """
    Independent test suite verifying the complete end-to-end coding agent lifecycle:
    1. Pre-flight budget check & atomic reservation
    2. AST slicing and context compression
    3. Provider inference (Bifrost / Gemini)
    4. Exact usage reconciliation
    5. Approval gate staging with cryptographic diff hash binding
    6. Sandbox verification and test suite execution
    7. Separate Git commit authorization
    8. Immutable audit logging with SHA-256 tamper-evident integrity digest
    9. Handling of failure/rejection/tampering/timeout paths
    """

    def setUp(self):
        semantic_cache.clear()
        ApprovalGuard.set_kill_switch(False)
        self.client = TestClient(app)

        # Reset provider circuit breakers
        for pid in ["prov-gemini", "prov-bifrost", "prov-deepseek", "prov-claude", "prov-gpt4o", "prov-ollama"]:
            ProviderRouter.reset_circuit_breaker(pid)

        # Setup clean test user budget
        self.user_id = "usr_e2e_lead"
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM budget_reservations WHERE user_id = ?", (self.user_id,))
        cursor.execute("""
        INSERT OR REPLACE INTO budget_policies (
            id, user_id, monthly_budget_usd, current_spend_usd,
            monthly_token_cap, current_tokens_used, hard_limit_enforced,
            auto_throttle_active, alert_threshold_pct, runway_days,
            reserved_spend_usd, reserved_tokens
        ) VALUES (
            'bgt_e2e_lead', ?, 50.0, 5.0,
            500000, 25000, 1, 1, 80.0, 28, 0.0, 0
        )
        """, (self.user_id,))
        conn.commit()
        conn.close()

        # Fast deterministic provider response mock for workflow execution
        self.mock_provider_resp = {
            "summary": "Fix Memory Leak in CacheManager Eviction Buffer using sync.Pool.",
            "code_diff": """@@ -138,8 +138,10 @@
-	rawBuffer := make([]byte, 0, 65536)
-	buf := bytes.NewBuffer(rawBuffer)
+	// Lease pre-allocated byte slice from sync.Pool
+	bufPtr := bufferPool.Get().(*bytes.Buffer)
+	bufPtr.Reset()
+	defer bufferPool.Put(bufPtr)""",
            "model_used": "gemini-3.5-flash",
            "provider_name": "Google Gemini (Direct API)",
            "input_tokens": 180,
            "output_tokens": 60,
            "latency_ms": 75,
            "execution_mode": "SIMULATED PROVIDER EXECUTION"
        }

    def tearDown(self):
        ApprovalGuard.set_kill_switch(False)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM budget_policies WHERE user_id = ?", (self.user_id,))
        cursor.execute("DELETE FROM budget_reservations WHERE user_id = ?", (self.user_id,))
        conn.commit()
        conn.close()

    def test_01_full_happy_path_workflow_with_commit_authorized(self):
        """Complete happy path: Task -> Reservation -> Slicing -> Inference -> Reconcile -> Approval -> Sandbox -> Commit -> Audit."""
        with patch.object(ProviderRouter, "_simulate_or_call_provider", return_value=self.mock_provider_resp):
            # 1. Submit task request with safe_mode=True
            req_payload = {
                "prompt": "Fix Memory Leak in CacheManager Eviction Buffer with sync.Pool",
                "repo_id": "repo-core",
                "strategy": "balanced",
                "safe_mode": True,
                "user_id": self.user_id
            }
            res_task = self.client.post("/api/tasks/execute", json=req_payload)
            self.assertEqual(res_task.status_code, 200)
            task_data = res_task.json()

            task_id = task_data["id"]
            approval_id = task_data["approval_id"]
            self.assertIsNotNone(approval_id)
            self.assertEqual(task_data["status"], "pending_approval")
            self.assertGreater(task_data["tokens_saved"], 0)
            self.assertGreater(task_data["compression_ratio"], 40.0)

            # 2. Verify budget usage was reconciled accurately
            policy = BudgetService.get_budget_policy(self.user_id)
            self.assertEqual(policy["reserved_spend_usd"], 0.0)
            self.assertGreater(policy["current_spend_usd"], 5.0)

            # 3. Retrieve pending approval details
            res_appr = self.client.get(f"/api/approvals/{approval_id}")
            self.assertEqual(res_appr.status_code, 200)
            appr_data = res_appr.json()
            self.assertEqual(appr_data["status"], "pending")
            diff_text = appr_data["command_or_diff"]
            diff_hash = appr_data["diff_hash"]
            self.assertEqual(diff_hash, hashlib.sha256(diff_text.encode("utf-8")).hexdigest())

            # 4. Resolve approval with explicit Git commit authorization
            res_resolve = self.client.post(f"/api/approvals/{approval_id}/resolve", json={
                "decision": "approved",
                "reviewer": "TEAM ARISE LEAD",
                "notes": "Verified in AST Sandbox, test suite passed cleanly.",
                "expected_diff_hash": diff_hash,
                "approve_git_commit": True
            })
            self.assertEqual(res_resolve.status_code, 200)
            resolve_data = res_resolve.json()

            self.assertEqual(resolve_data["decision"], "approved")
            self.assertIn("SHA:", resolve_data["git_commit"])

            # 5. Verify immutable audit log
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_logs WHERE event_type LIKE 'APPROVAL_%' ORDER BY timestamp DESC LIMIT 1")
            audit_row = cursor.fetchone()
            conn.close()

            self.assertIsNotNone(audit_row)
            self.assertIn("TEAM ARISE LEAD", audit_row["details"])
            self.assertTrue(audit_row["signature"].startswith("sha256:"))

    def test_02_workflow_with_git_commit_withheld(self):
        """Developer approves patch application in sandbox but withholds Git commit."""
        with patch.object(ProviderRouter, "_simulate_or_call_provider", return_value=self.mock_provider_resp):
            res_task = self.client.post("/api/tasks/execute", json={
                "prompt": "Fix Memory Leak in CacheManager Eviction Buffer with sync.Pool",
                "repo_id": "repo-core",
                "safe_mode": True,
                "user_id": self.user_id
            })
            approval_id = res_task.json()["approval_id"]

            # Resolve approval with approve_git_commit=False
            res_resolve = self.client.post(f"/api/approvals/{approval_id}/resolve", json={
                "decision": "approved",
                "reviewer": "AUDITOR",
                "notes": "Testing only; withhold git commit until QA signoff.",
                "approve_git_commit": False
            })
            self.assertEqual(res_resolve.status_code, 200)
            data = res_resolve.json()
            self.assertIn("pending_git_approval", data["git_commit"])

    def test_03_rejection_workflow_aborts_execution(self):
        """Developer rejects patch; execution is aborted, zero code is committed, and audit logged."""
        with patch.object(ProviderRouter, "_simulate_or_call_provider", return_value=self.mock_provider_resp):
            res_task = self.client.post("/api/tasks/execute", json={
                "prompt": "Fix Memory Leak in CacheManager Eviction Buffer with sync.Pool",
                "repo_id": "repo-core",
                "safe_mode": True,
                "user_id": self.user_id
            })
            approval_id = res_task.json()["approval_id"]

            res_reject = self.client.post(f"/api/approvals/{approval_id}/resolve", json={
                "decision": "rejected",
                "reviewer": "SECURITY REVIEWER",
                "notes": "Diff violates concurrency pattern."
            })
            self.assertEqual(res_reject.status_code, 200)
            data = res_reject.json()
            self.assertEqual(data["decision"], "rejected")
            self.assertIn("rejected", data["git_commit"])

    def test_04_tampered_diff_detected_and_rejected(self):
        """If expected_diff_hash does not match staged diff, return HTTP 409 conflict."""
        with patch.object(ProviderRouter, "_simulate_or_call_provider", return_value=self.mock_provider_resp):
            res_task = self.client.post("/api/tasks/execute", json={
                "prompt": "Fix Memory Leak in CacheManager Eviction Buffer with sync.Pool",
                "repo_id": "repo-core",
                "safe_mode": True,
                "user_id": self.user_id
            })
            approval_id = res_task.json()["approval_id"]

            tampered_hash = "deadbeef" * 8
            res_resolve = self.client.post(f"/api/approvals/{approval_id}/resolve", json={
                "decision": "approved",
                "reviewer": "SECURITY REVIEWER",
                "expected_diff_hash": tampered_hash
            })
            self.assertEqual(res_resolve.status_code, 409)
            self.assertIn("modified after approval gate creation", res_resolve.json()["detail"])

    def test_05_expired_approval_rejected(self):
        """Approval tickets older than 15 minutes are rejected with HTTP 410 Gone."""
        with patch.object(ProviderRouter, "_simulate_or_call_provider", return_value=self.mock_provider_resp):
            res_task = self.client.post("/api/tasks/execute", json={
                "prompt": "Fix Memory Leak in CacheManager Eviction Buffer with sync.Pool",
                "repo_id": "repo-core",
                "safe_mode": True,
                "user_id": self.user_id
            })
            approval_id = res_task.json()["approval_id"]

            # Artificially age the ticket past 15 minutes
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE action_approvals SET expires_at = ? WHERE id = ?", (time.time() - 60.0, approval_id))
            conn.commit()
            conn.close()

            res_resolve = self.client.post(f"/api/approvals/{approval_id}/resolve", json={
                "decision": "approved",
                "reviewer": "REVIEWER"
            })
            self.assertEqual(res_resolve.status_code, 410)
            self.assertIn("has expired", res_resolve.json()["detail"])

    def test_06_kill_switch_locks_workflow(self):
        """When Emergency Kill Switch is engaged, task execution and resolution return HTTP 423."""
        ApprovalGuard.set_kill_switch(True)

        res_task = self.client.post("/api/tasks/execute", json={
            "prompt": "Attempt task while kill switch is engaged",
            "repo_id": "repo-core",
            "safe_mode": True
        })
        self.assertEqual(res_task.status_code, 423)

        ApprovalGuard.set_kill_switch(False)

if __name__ == '__main__':
    unittest.main()
