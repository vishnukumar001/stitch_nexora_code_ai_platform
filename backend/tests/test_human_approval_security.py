import os
import time
import hashlib
import unittest
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.approval_guard import ApprovalGuard
from backend.app.models.schemas import ActionType, ApprovalStatus, SeverityLevel
from backend.app.services.sandbox_service import SandboxService, SandboxSecurityException

class TestHumanApprovalSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def setUp(self):
        ApprovalGuard.set_kill_switch(False)

    def test_01_normal_approved_modification(self):
        """Valid human approval applies patch and returns success."""
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-sec-01",
            action_type=ActionType.FILE_WRITE,
            title="Update cache buffer",
            description="Buffer reuse",
            command_or_diff="@@ -1 +1 @@\n+# Buffer Pool Added",
            target_resource="prod-core:pkg/cache/cache_manager.py"
        )
        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "SecurityAuditor",
            "approve_git_commit": True
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["decision"], "approved")
        self.assertIn("verification tests passed", data["test_summary"])

    def test_02_rejected_modification_does_not_modify_or_commit(self):
        """Rejected approval does not commit code and updates status to rejected."""
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-sec-02",
            action_type=ActionType.FILE_WRITE,
            title="Potentially risky refactor",
            description="Dangerous mutation",
            command_or_diff="@@ -1 +1 @@\n-import os\n+import os, sys",
            target_resource="prod-core:pkg/cache/cache_manager.py"
        )
        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "rejected",
            "reviewer": "SecurityAuditor",
            "notes": "Rejected by security policy"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["decision"], "rejected")
        self.assertIn("rejected", data["git_commit"])

    def test_03_reused_approval_token_rejected(self):
        """Anti-replay: An approval token cannot be resolved twice."""
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-sec-03",
            action_type=ActionType.FILE_WRITE,
            title="Single use token test",
            description="One-time gate",
            command_or_diff="@@ -1 +1 @@\n+# valid",
            target_resource="prod-core:pkg/cache/cache_manager.py"
        )
        # First resolution
        res1 = self.client.post(f"/api/approvals/{appr.id}/resolve", json={"decision": "approved"})
        self.assertEqual(res1.status_code, 200)

        # Second resolution attempt (Replay Attack)
        res2 = self.client.post(f"/api/approvals/{appr.id}/resolve", json={"decision": "approved"})
        self.assertEqual(res2.status_code, 400)
        self.assertIn("Token reuse is prohibited", res2.json()["detail"])

    def test_04_approval_token_timeout_expiration(self):
        """Expired approval tokens are rejected with HTTP 410."""
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-sec-04",
            action_type=ActionType.FILE_WRITE,
            title="Expired token test",
            description="Expired gate",
            command_or_diff="@@ -1 +1 @@\n+# expired",
            target_resource="prod-core:pkg/cache/cache_manager.py"
        )
        # Artificially expire the token in database
        from backend.app.db.database import get_connection
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE action_approvals SET expires_at = ? WHERE id = ?", (time.time() - 100, appr.id))
        conn.commit()
        conn.close()

        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={"decision": "approved"})
        self.assertEqual(res.status_code, 410)
        self.assertIn("has expired", res.json()["detail"])

    def test_05_modified_proposal_after_approval_tamper_rejected(self):
        """If proposal diff hash does not match expected_diff_hash, resolution is rejected with HTTP 409."""
        diff_text = "@@ -1 +1 @@\n+# Original Safe Diff"
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-sec-05",
            action_type=ActionType.FILE_WRITE,
            title="Tamper test",
            description="Integrity binding",
            command_or_diff=diff_text,
            target_resource="prod-core:pkg/cache/cache_manager.py"
        )
        tampered_hash = hashlib.sha256("@@ -1 +1 @@\n+# Malicious Tampered Diff".encode()).hexdigest()

        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "expected_diff_hash": tampered_hash
        })
        self.assertEqual(res.status_code, 409)
        self.assertIn("integrity mismatch", res.json()["detail"])

    def test_06_separate_git_commit_authorization(self):
        """When approve_git_commit is False, patch is applied to sandbox but Git commit is withheld."""
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-sec-06",
            action_type=ActionType.FILE_WRITE,
            title="Withhold commit test",
            description="Patch without commit",
            command_or_diff="@@ -1 +1 @@\n+# Staged Only",
            target_resource="prod-core:pkg/cache/cache_manager.py"
        )
        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "approve_git_commit": False
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["decision"], "approved")
        self.assertIn("pending_git_approval", data["git_commit"])

    def test_07_sandbox_path_traversal_rejection(self):
        """Validates that parent directory traversal is strictly blocked."""
        with self.assertRaises(SandboxSecurityException):
            SandboxService.validate_safe_path("backend/sandboxes/nx-sandbox-849", "../../etc/shadow")

    def test_08_sandbox_symlink_escape_rejection(self):
        """Validates that symlink escapes outside the sandbox are strictly blocked."""
        with self.assertRaises(SandboxSecurityException):
            SandboxService.validate_safe_path("backend/sandboxes/nx-sandbox-849", "/private/tmp/hacked.sh")

    def test_09_concurrent_approval_requests(self):
        """Simultaneous approval resolutions for the same token allow only one to succeed."""
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-sec-09",
            action_type=ActionType.FILE_WRITE,
            title="Concurrency test",
            description="Parallel attempts",
            command_or_diff="@@ -1 +1 @@\n+# concurrent",
            target_resource="prod-core:pkg/cache/cache_manager.py"
        )

        def attempt_resolve(worker_id):
            return self.client.post(f"/api/approvals/{appr.id}/resolve", json={
                "decision": "approved",
                "reviewer": f"Worker-{worker_id}"
            })

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(attempt_resolve, i) for i in range(5)]
            responses = [f.result() for f in futures]

        status_codes = [r.status_code for r in responses]
        # Exactly one request must succeed (200), others must be rejected with 400 (token already resolved)
        self.assertEqual(status_codes.count(200), 1)
        self.assertEqual(status_codes.count(400), 4)

if __name__ == "__main__":
    unittest.main()
