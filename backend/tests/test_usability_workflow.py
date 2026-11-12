import unittest
from fastapi.testclient import TestClient
from backend.app.main import app

class TestUsabilityWorkflows(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_complete_9_step_first_time_user_flow(self):
        # 1. Open dashboard
        res_dash = self.client.get('/api/dashboard')
        self.assertEqual(res_dash.status_code, 200)
        data_dash = res_dash.json()
        self.assertIn("kpis", data_dash)
        self.assertIn("providers", data_dash)
        self.assertIn("recent_activities", data_dash)

        # 2 & 3. Create a new coding task & select repository
        res_repos = self.client.get('/api/repositories')
        self.assertEqual(res_repos.status_code, 200)
        repos = res_repos.json()
        self.assertGreater(len(repos), 0)
        target_repo = repos[0]["id"]

        # 4. Analyse the task (Step 4 & 5 of simple workflow)
        res_analyze = self.client.post('/api/tasks/analyze', json={
            "prompt": "Find and fix the memory leak in cache_manager.go",
            "repo_id": target_repo,
            "is_confidential": False
        })
        self.assertEqual(res_analyze.status_code, 200)
        analysis = res_analyze.json()
        self.assertIn("understood_task", analysis)
        self.assertGreater(len(analysis["relevant_files"]), 0)
        self.assertGreater(analysis["estimated_tokens_raw"], analysis["estimated_tokens_compact"])
        self.assertTrue(analysis["requires_approval"])

        # 5 & 6. Generate solution & review proposed changes
        res_exec = self.client.post('/api/tasks/execute', json={
            "prompt": "Find and fix the memory leak in cache_manager.go",
            "repo_id": target_repo,
            "strategy": "balanced",
            "safe_mode": True
        })
        self.assertEqual(res_exec.status_code, 200)
        task = res_exec.json()
        self.assertEqual(task["status"], "pending_approval")
        self.assertIsNotNone(task["approval_id"])
        self.assertGreater(len(task["diffs"]), 0)

        # 6. Approve the changes
        res_approve = self.client.post(f"/api/approvals/{task['approval_id']}/resolve", json={
            "decision": "approved",
            "reviewer": "TEAM ARISE",
            "notes": "Verified sync.Pool buffer reuse benchmark"
        })
        self.assertEqual(res_approve.status_code, 200)
        self.assertEqual(res_approve.json()["decision"], "approved")

        # 7. Check execution results in task history
        res_tasks = self.client.get('/api/tasks')
        self.assertEqual(res_tasks.status_code, 200)
        tasks_list = res_tasks.json()
        self.assertGreater(len(tasks_list), 0)

        # 8. Review token usage and budget limits
        res_analytics = self.client.get('/api/analytics')
        self.assertEqual(res_analytics.status_code, 200)
        self.assertIn("total_tokens_saved", res_analytics.json())

        res_budget = self.client.get('/api/budget')
        self.assertEqual(res_budget.status_code, 200)
        self.assertGreater(res_budget.json()["monthly_budget_usd"], 0)

        # 9. Open settings & test provider failover
        res_settings = self.client.get('/api/settings')
        self.assertEqual(res_settings.status_code, 200)

        res_failover = self.client.post('/api/router/failover-test?provider_id=prov-claude')
        self.assertEqual(res_failover.status_code, 200)
        self.assertIn("Simulated timeout error", res_failover.json()["message"])

if __name__ == '__main__':
    unittest.main()
