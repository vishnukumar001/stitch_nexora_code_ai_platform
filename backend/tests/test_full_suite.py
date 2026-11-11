import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.approval_guard import ApprovalGuard

class TestFullNexoraSuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_01_health_and_cluster(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["cluster_node"], "us-east-aurora-9")

    def test_02_dashboard_kpis(self):
        res = self.client.get('/api/dashboard')
        self.assertEqual(res.status_code, 200)
        kpis = res.json()["kpis"]
        self.assertIn("tasks_completed", kpis)
        self.assertIn("token_savings_pct", kpis)
        self.assertIn("current_spend_usd", kpis)

    def test_03_code_privacy_confidential_repo(self):
        # auth-service is confidential
        res = self.client.post('/api/tasks/execute', json={
            "prompt": "Upgrade JWT verification logic",
            "repo_id": "repo-auth",
            "strategy": "balanced",
            "safe_mode": True
        })
        self.assertEqual(res.status_code, 200)
        task = res.json()
        self.assertTrue(task["is_confidential_routed"])
        self.assertIn("Local", task["cascade_chain"][0])

    def test_04_token_optimization_and_savings(self):
        res = self.client.post('/api/tasks/execute', json={
            "prompt": "Investigate memory spike in cache_manager.go",
            "repo_id": "repo-core",
            "strategy": "balanced",
            "safe_mode": True
        })
        self.assertEqual(res.status_code, 200)
        task = res.json()
        self.assertGreater(task["tokens_uncompressed"], task["tokens_compressed"])
        self.assertGreater(task["tokens_saved"], 0)
        self.assertGreater(task["compression_ratio"], 50.0)
        self.assertGreater(task["cost_saved_usd"], 0.0)

    def test_05_action_approval_gate(self):
        # A task executed in safe mode must stage a pending approval gate
        res = self.client.post('/api/tasks/execute', json={
            "prompt": "Refactor buffer pool for high concurrency",
            "repo_id": "repo-core",
            "strategy": "balanced",
            "safe_mode": True
        })
        self.assertEqual(res.status_code, 200)
        task = res.json()
        self.assertEqual(task["status"], "pending_approval")
        self.assertIsNotNone(task["pending_approval"])

        approval_id = task["pending_approval"]["id"]

        # Resolve approval
        res_approve = self.client.post(f'/api/approvals/{approval_id}/resolve', json={
            "decision": "approved",
            "reviewer": "Elena Rostova"
        })
        self.assertEqual(res_approve.status_code, 200)
        self.assertEqual(res_approve.json()["decision"], "approved")

    def test_06_budget_limit_enforcement(self):
        res = self.client.get('/api/budget')
        self.assertEqual(res.status_code, 200)
        b = res.json()
        self.assertGreater(b["monthly_budget_usd"], 0)

        # Update budget
        update_res = self.client.put('/api/budget', json={
            "monthly_budget_usd": 1500.0,
            "hard_limit_enforced": True
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["monthly_budget_usd"], 1500.0)

    def test_07_emergency_kill_switch(self):
        # Engage kill switch
        res_kill = self.client.post('/api/security/kill-switch?engaged=true')
        self.assertEqual(res_kill.status_code, 200)
        self.assertTrue(res_kill.json()["kill_switch_engaged"])

        # When kill switch is engaged, new tasks must be blocked with HTTP 423 Locked
        res_blocked = self.client.post('/api/tasks/execute', json={
            "prompt": "Attempt execution while kill switch is engaged",
            "repo_id": "repo-core",
            "strategy": "balanced",
            "safe_mode": True
        })
        self.assertEqual(res_blocked.status_code, 423)

        # Disengage kill switch
        res_disengage = self.client.post('/api/security/kill-switch?engaged=false')
        self.assertEqual(res_disengage.status_code, 200)
        self.assertFalse(res_disengage.json()["kill_switch_engaged"])

    def test_08_provider_failover_simulation(self):
        res = self.client.post('/api/router/failover-test?provider_id=prov-claude')
        self.assertEqual(res.status_code, 200)
        self.assertIn("Simulated timeout error", res.json()["message"])

if __name__ == '__main__':
    unittest.main()
