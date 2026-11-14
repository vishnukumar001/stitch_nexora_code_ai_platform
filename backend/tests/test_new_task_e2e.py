import unittest
import json
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db

class TestNewTaskEndToEnd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def test_01_repositories_endpoint(self):
        res = self.client.get("/api/repositories")
        self.assertEqual(res.status_code, 200)
        repos = res.json()
        self.assertTrue(len(repos) >= 4)
        repo_ids = [r["id"] for r in repos]
        self.assertIn("repo-core", repo_ids)
        self.assertIn("repo-auth", repo_ids)

    def test_02_task_analyze_endpoint(self):
        payload = {
            "prompt": "Find and fix the memory leak in cache_manager.go. Explain the root cause, generate a minimal patch, and run the relevant tests.",
            "repo_id": "repo-core",
            "is_confidential": False
        }
        res = self.client.post("/api/tasks/analyze", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("understood_task", data)
        self.assertIn("relevant_files", data)
        self.assertIn("estimated_tokens_raw", data)
        self.assertIn("estimated_tokens_compact", data)
        self.assertIn("token_savings_pct", data)
        self.assertIn("selected_provider", data)
        self.assertIn("execution_plan", data)
        self.assertTrue(data["token_savings_pct"] > 50)
        self.assertTrue(len(data["relevant_files"]) > 0)
        self.assertTrue(len(data["execution_plan"]) >= 4)

    def test_03_task_execute_and_approval_workflow(self):
        prompt = "Find and fix the memory leak in cache_manager.go. Explain the root cause, generate a minimal patch, and run the relevant tests."
        payload = {
            "prompt": prompt,
            "repo_id": "repo-core",
            "strategy": "balanced",
            "safe_mode": True,
            "is_confidential": False
        }
        res = self.client.post("/api/tasks/execute", json=payload)
        self.assertEqual(res.status_code, 200)
        task = res.json()

        self.assertEqual(task["status"], "pending_approval")
        self.assertIsNotNone(task["approval_id"])
        self.assertTrue(len(task["diffs"]) > 0)
        self.assertIn("execution_mode", task)
        self.assertTrue(task["tokens_saved"] > 0)

        approval_id = task["approval_id"]

        # Check pending approvals
        appr_res = self.client.get("/api/approvals")
        self.assertEqual(appr_res.status_code, 200)
        pending_ids = [a["id"] for a in appr_res.json()]
        self.assertIn(approval_id, pending_ids)

        # Resolve approval
        resolve_payload = {
            "decision": "approved",
            "reviewer": "TEAM ARISE",
            "notes": "Verified minimal AST patch and bounds check pass."
        }
        res_resolve = self.client.post(f"/api/approvals/{approval_id}/resolve", json=resolve_payload)
        self.assertEqual(res_resolve.status_code, 200)
        resolve_data = res_resolve.json()
        self.assertEqual(resolve_data["decision"], "approved")
        self.assertIn("applied_sandbox", resolve_data)
        self.assertIn("test_summary", resolve_data)

        # Check task list shows status completed
        tasks_res = self.client.get("/api/tasks")
        self.assertEqual(tasks_res.status_code, 200)
        matching = [t for t in tasks_res.json() if t["id"] == task["id"]]
        self.assertTrue(len(matching) > 0)
        self.assertEqual(matching[0]["status"], "completed")

if __name__ == "__main__":
    unittest.main()

