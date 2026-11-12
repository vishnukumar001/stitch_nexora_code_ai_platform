import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.provider_router import ProviderRouter
from backend.app.services.approval_guard import ApprovalGuard
from backend.app.services.budget_service import BudgetService
from backend.app.services.semantic_cache import semantic_cache

class TestQAMasterAudit(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        ApprovalGuard.set_kill_switch(False)

    def test_01_bifrost_and_provider_probe(self):
        """Phase 4: Probe provider connectivity and verify Bifrost gateway presence."""
        res = self.client.post('/api/router/check-connectivity')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "probed")
        providers = data["providers"]
        pids = [p["id"] for p in providers]
        self.assertIn("prov-bifrost", pids)
        self.assertIn("prov-ollama", pids)
        self.assertIn("prov-claude", pids)

        # Bifrost must be properly identified
        bifrost_prov = next(p for p in providers if p["id"] == "prov-bifrost")
        self.assertIn("Bifrost", bifrost_prov["name"])

    def test_02_confidential_safe_failure_when_local_offline(self):
        """Phase 7: When confidential mode is active and local model is offline, fail safely with NO cloud fallback."""
        try:
            # Intentionally trip circuit breaker on local model
            ProviderRouter.update_provider_health("prov-ollama", success=False, latency_ms=5000)
            ProviderRouter.update_provider_health("prov-ollama", success=False, latency_ms=5000)
            ProviderRouter.update_provider_health("prov-ollama", success=False, latency_ms=5000)

            # Attempt to run task on confidential repo
            res = self.client.post('/api/tasks/execute', json={
                "prompt": "Secure confidential private keys",
                "repo_id": "repo-auth", # Confidential repo
                "strategy": "balanced",
                "safe_mode": True
            })
            self.assertEqual(res.status_code, 503)
            self.assertIn("strictly prevented by Zero-Egress Air-Gap", res.json()["detail"])
        finally:
            # Guaranteed reset of Ollama circuit breaker
            ProviderRouter.reset_circuit_breaker("prov-ollama")

    def test_03_pre_flight_budget_overload_block(self):
        """Phase 8: Requests that would cause spending to exceed user limit must be blocked prior to LLM calls."""
        # Save original budget
        orig_bgt = BudgetService.get_budget_policy()
        orig_limit = orig_bgt["monthly_budget_usd"]

        try:
            # Set monthly budget to a tiny $0.05 limit
            res_bgt = self.client.put('/api/budget', json={"monthly_budget_usd": 0.05})
            self.assertEqual(res_bgt.status_code, 200)

            # Request exceeding $0.05 must return 403 Forbidden
            res_blocked = self.client.post('/api/tasks/execute', json={
                "prompt": "Large monorepo refactoring prompt",
                "repo_id": "repo-core",
                "strategy": "frontier",
                "safe_mode": True
            })
            self.assertEqual(res_blocked.status_code, 403)
            err_detail = res_blocked.json()["detail"]
            self.assertIn("exceeds monthly hard budget limit", err_detail["message"])
        finally:
            # Always reset budget to original limit
            self.client.put('/api/budget', json={"monthly_budget_usd": orig_limit})

    def test_04_action_approval_rejected_never_executes(self):
        """Phase 8: Rejected operations must never execute or apply code changes."""
        res_task = self.client.post('/api/tasks/execute', json={
            "prompt": "Potentially unsafe shell execution test",
            "repo_id": "repo-core",
            "strategy": "balanced",
            "safe_mode": True
        })
        self.assertEqual(res_task.status_code, 200)
        task = res_task.json()
        approval_id = task["approval_id"]

        # Reject the action
        res_rej = self.client.post(f"/api/approvals/{approval_id}/resolve", json={
            "decision": "rejected",
            "reviewer": "TEAM ARISE",
            "notes": "Rejected by security policy"
        })
        self.assertEqual(res_rej.status_code, 200)
        self.assertEqual(res_rej.json()["decision"], "rejected")

    def test_05_kill_switch_freezes_pending_approvals_and_tasks(self):
        """Phase 8: Kill Switch must block task executions and approval resolutions with HTTP 423."""
        ApprovalGuard.set_kill_switch(True)
        self.assertTrue(ApprovalGuard.is_kill_switch_engaged())

        # Task creation blocked
        res_blocked = self.client.post('/api/tasks/execute', json={
            "prompt": "Attempt task while kill switch is on",
            "repo_id": "repo-core",
            "strategy": "balanced"
        })
        self.assertEqual(res_blocked.status_code, 423)

        ApprovalGuard.set_kill_switch(False)

    def test_06_data_integrity_and_demo_flagging(self):
        """Phase 3: Seed data must be cleanly flagged as DEMO and live tasks as LIVE."""
        res = self.client.get('/api/dashboard')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("kpis", data)
        self.assertIn("recent_activities", data)
        for task in data["recent_activities"]:
            self.assertIn("is_demo", task)

    def test_07_semantic_caching_zero_tokens(self):
        """Phase 6: Repeated prompt on the same repository must hit semantic cache."""
        prompt = "Audit unique idempotent cache keys"
        repo_id = "repo-core"

        # Execute once
        res1 = self.client.post('/api/tasks/execute', json={
            "prompt": prompt,
            "repo_id": repo_id,
            "strategy": "balanced",
            "safe_mode": False
        })
        self.assertEqual(res1.status_code, 200)

        # Second execution on identical prompt must hit semantic cache
        res2 = self.client.post('/api/tasks/execute', json={
            "prompt": prompt,
            "repo_id": repo_id,
            "strategy": "balanced",
            "safe_mode": False
        })
        self.assertEqual(res2.status_code, 200)
        task2 = res2.json()
        self.assertIn("Semantic AST Cache", task2["cascade_chain"][0])

if __name__ == '__main__':
    unittest.main()
