import os
import time
import hashlib
import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.approval_guard import ApprovalGuard
from backend.app.models.schemas import ActionType, ApprovalStatus, SeverityLevel

class TestCrossUserApprovalSecurity(unittest.TestCase):
    """
    Adversarial Security Test Suite for Cross-User, Cross-Repository,
    Cross-Task, Anti-Replay, Tamper Resistance, and Authorization Boundaries.
    """

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def setUp(self):
        ApprovalGuard.set_kill_switch(False)

    def test_01_user_b_cannot_resolve_user_a_token(self):
        """
        Adversarial: User A ('usr_alice_sec') creates an approval gate.
        User B ('usr_bob_adversary') attempts to resolve User A's token.
        Expected: HTTP 403 Forbidden with cross-user security violation.
        """
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-user-a-01",
            action_type=ActionType.FILE_WRITE,
            title="Alice patch",
            description="Alice's verified code mutation",
            command_or_diff="@@ -1 +1 @@\n+// Alice valid change",
            target_resource="repo-core:pkg/auth/session.go",
            user_id="usr_alice_sec",
            repo_id="repo-core"
        )

        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "Bob Adversary",
            "reviewer_user_id": "usr_bob_adversary"
        })

        self.assertEqual(res.status_code, 403)
        self.assertIn("Cross-user security violation", res.json()["detail"])
        self.assertIn("usr_bob_adversary", res.json()["detail"])
        self.assertIn("usr_alice_sec", res.json()["detail"])

    def test_02_approval_token_rejected_against_different_repository(self):
        """
        Adversarial: Approval token is generated and bound to 'repo-core'.
        Attacker attempts to resolve this token against 'repo-auth' or 'repo-billing'.
        Expected: HTTP 400 Bad Request with repository binding violation.
        """
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-repo-bind-02",
            action_type=ActionType.FILE_WRITE,
            title="Bound to repo-core",
            description="Core repository patch",
            command_or_diff="@@ -1 +1 @@\n+// Core fix",
            target_resource="repo-core:pkg/core/engine.go",
            user_id="usr_team_arise_01",
            repo_id="repo-core"
        )

        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "TEAM ARISE",
            "reviewer_user_id": "usr_team_arise_01",
            "target_repo_id": "repo-auth"
        })

        self.assertEqual(res.status_code, 400)
        self.assertIn("Repository binding violation", res.json()["detail"])
        self.assertIn("repo-core", res.json()["detail"])
        self.assertIn("repo-auth", res.json()["detail"])

    def test_03_approval_token_rejected_against_different_task(self):
        """
        Adversarial: Approval token is bound to specific task 'task-sec-orig-103'.
        Attacker attempts to hijack token for another task 'task-hijacked-999'.
        Expected: HTTP 400 Bad Request with task binding violation.
        """
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-sec-orig-103",
            action_type=ActionType.FILE_WRITE,
            title="Original task token",
            description="Task bound",
            command_or_diff="@@ -1 +1 @@\n+// Original diff",
            target_resource="repo-core:pkg/cache/cache.go",
            user_id="usr_team_arise_01",
            repo_id="repo-core"
        )

        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "TEAM ARISE",
            "reviewer_user_id": "usr_team_arise_01",
            "target_repo_id": "repo-core",
            "target_task_id": "task-hijacked-999"
        })

        self.assertEqual(res.status_code, 400)
        self.assertIn("Task binding violation", res.json()["detail"])
        self.assertIn("task-sec-orig-103", res.json()["detail"])
        self.assertIn("task-hijacked-999", res.json()["detail"])

    def test_04_approval_token_reused_after_resolution_rejected(self):
        """
        Adversarial (Replay Attack): Legitimate user approves token.
        Subsequent replay resolution for the same token MUST be rejected.
        Expected: HTTP 400 Bad Request with token reuse prohibition.
        """
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-replay-04",
            action_type=ActionType.FILE_WRITE,
            title="Single-use gate",
            description="One-time resolution",
            command_or_diff="@@ -1 +1 @@\n+// One-time mutation",
            target_resource="repo-core:pkg/cache/cache.go",
            user_id="usr_alice_sec",
            repo_id="repo-core"
        )

        # First resolution succeeds
        res1 = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "Alice",
            "reviewer_user_id": "usr_alice_sec"
        })
        self.assertEqual(res1.status_code, 200)

        # Second resolution attempt (Replay) fails
        res2 = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "Alice",
            "reviewer_user_id": "usr_alice_sec"
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("Token reuse is prohibited", res2.json()["detail"])

    def test_05_diff_modified_after_approval_tamper_rejected(self):
        """
        Adversarial (Tampering Attack): Proposed diff hash does not match
        the SHA-256 hash computed at approval gate creation time.
        Expected: HTTP 409 Conflict with integrity mismatch error.
        """
        orig_diff = "@@ -1 +1 @@\n+// Safe original code"
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-tamper-05",
            action_type=ActionType.FILE_WRITE,
            title="Tamper gate",
            description="Diff integrity test",
            command_or_diff=orig_diff,
            target_resource="repo-core:pkg/cache/cache.go",
            user_id="usr_team_arise_01",
            repo_id="repo-core"
        )

        tampered_hash = hashlib.sha256("@@ -1 +1 @@\n+// Injected backdoor payload".encode("utf-8")).hexdigest()

        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "TEAM ARISE",
            "expected_diff_hash": tampered_hash
        })
        self.assertEqual(res.status_code, 409)
        self.assertIn("integrity mismatch", res.json()["detail"])

    def test_06_git_commit_attempted_without_separate_authorization(self):
        """
        Security: Patch approval WITHOUT explicit Git commit authorization
        (approve_git_commit=False) must NOT produce a Git commit hash.
        Expected: Approval succeeds, sandbox dry-run tests pass, git_commit is withheld.
        """
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-no-git-06",
            action_type=ActionType.FILE_WRITE,
            title="Staged patch only",
            description="No Git authorization provided",
            command_or_diff="@@ -1 +1 @@\n+// Staged without commit",
            target_resource="repo-core:pkg/cache/cache.go",
            user_id="usr_team_arise_01",
            repo_id="repo-core"
        )

        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "TEAM ARISE",
            "approve_git_commit": False
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["decision"], "approved")
        self.assertIn("pending_git_approval", data["git_commit"])

    def test_07_authorized_matching_user_repo_task_succeeds(self):
        """
        Happy Path: Authenticated user matches token owner, repository matches,
        and task matches. Resolution succeeds with full audit record.
        """
        appr = ApprovalGuard.create_approval_gate(
            task_id="task-valid-07",
            action_type=ActionType.FILE_WRITE,
            title="Valid matched resolution",
            description="All security attributes match",
            command_or_diff="@@ -1 +1 @@\n+// Fully authorized patch",
            target_resource="repo-core:pkg/cache/cache.go",
            user_id="usr_lead_architect",
            repo_id="repo-core"
        )

        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "Lead Architect",
            "reviewer_user_id": "usr_lead_architect",
            "target_repo_id": "repo-core",
            "target_task_id": "task-valid-07",
            "approve_git_commit": True
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["decision"], "approved")
        self.assertIn("SHA-256 Tamper-Evident Audit Digest", data["signature_type"])

if __name__ == "__main__":
    unittest.main()
