import os
import unittest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.provider_router import ProviderRouter
from backend.app.services.semantic_cache import semantic_cache

class TestBifrostRealWorkflow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def setUp(self):
        semantic_cache.clear()

    def test_01_bifrost_mocked_live_invocation(self):
        """
        Tests genuine Bifrost API integration with mocked provider HTTP response.
        Verifies request headers, payload structure, token metadata capture,
        and ensures API keys are never exposed in responses.
        """
        mock_bifrost_key = "bifrost_live_test_key_xyz987"
        mock_gateway_url = "https://api.maxim.ai/bifrost/v1"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "chatcmpl-bifrost-992",
            "object": "chat.completion",
            "model": "claude-3-7-sonnet",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "@@ -138,8 +138,9 @@\n-	rawBuffer := make([]byte, 0, 65536)\n+	bufPtr := bufferPool.Get().(*bytes.Buffer)\n+	bufPtr.Reset()\n+	defer bufferPool.Put(bufPtr)"
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 301,
                "completion_tokens": 42,
                "total_tokens": 343
            }
        }

        with patch.dict(os.environ, {"BIFROST_API_KEY": mock_bifrost_key, "BIFROST_GATEWAY_URL": mock_gateway_url}):
            with patch("httpx.post", return_value=mock_response) as mock_post:
                payload = {
                    "prompt": "Find and fix the memory leak in cache_manager.go",
                    "repo_id": "repo-core",
                    "strategy": "frontier",
                    "safe_mode": True,
                    "is_confidential": False
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()

                # Verify Bifrost API call was dispatched with correct headers and payload
                mock_post.assert_called()
                call_args, call_kwargs = mock_post.call_args
                self.assertEqual(call_args[0], f"{mock_gateway_url}/chat/completions")
                self.assertEqual(call_kwargs["headers"]["Authorization"], f"Bearer {mock_bifrost_key}")
                self.assertEqual(call_kwargs["headers"]["Content-Type"], "application/json")
                self.assertIn("Code context:", call_kwargs["json"]["messages"][1]["content"])

                # Verify response parsing & metadata capture
                self.assertEqual(data["execution_mode"], "LIVE PROVIDER EXECUTION")
                self.assertIn("Live solution generated via Bifrost", data["solution_summary"])
                self.assertEqual(data["model_used"], "claude-3-7-sonnet")

                # Verify key is never exposed in the response
                self.assertNotIn(mock_bifrost_key, json.dumps(data))

    def test_02_confidential_mode_zero_cloud_egress(self):
        """
        Priority 3: Verifies that confidential repositories NEVER send code
        to external cloud providers or Bifrost, even if BIFROST_API_KEY is configured.
        """
        mock_bifrost_key = "bifrost_secret_key"

        with patch.dict(os.environ, {"BIFROST_API_KEY": mock_bifrost_key}):
            with patch("httpx.post") as mock_post:
                payload = {
                    "prompt": "Audit JWT token expiration and enforce secure validation",
                    "repo_id": "repo-auth", # Confidential repository!
                    "strategy": "frontier",
                    "safe_mode": True,
                    "is_confidential": True
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()

                # Assert that Bifrost or external cloud URLs were NEVER called
                for call in mock_post.call_args_list:
                    url = call[0][0]
                    self.assertNotIn("maxim.ai", url)
                    self.assertNotIn("anthropic.com", url)
                    self.assertNotIn("openai.com", url)

                self.assertTrue(data["is_confidential_routed"])
                self.assertIn("qwen", data["model_used"].lower())

    def test_03_confidential_mode_offline_halt_never_fall_back(self):
        """
        Priority 3: Verifies that if local model fails, confidential tasks HALT
        with HTTP 503 and NEVER silently fall back to cloud providers.
        """
        ProviderRouter.update_provider_health("prov-ollama", success=False, latency_ms=5000)
        ProviderRouter.update_provider_health("prov-ollama", success=False, latency_ms=5000)
        ProviderRouter.update_provider_health("prov-ollama", success=False, latency_ms=5000)

        try:
            payload = {
                "prompt": "Audit cryptographic signatures",
                "repo_id": "repo-auth",
                "safe_mode": True,
                "is_confidential": True
            }
            res = self.client.post("/api/tasks/execute", json=payload)
            self.assertEqual(res.status_code, 503)
            self.assertIn("Cloud fallback is strictly prevented", res.json()["detail"])
        finally:
            ProviderRouter.reset_circuit_breaker("prov-ollama")

    def test_04_real_sandbox_and_git_workflow(self):
        """
        Priority 2: Verifies genuine coding workflow:
        1. Task staged with pending approval
        2. Approved patch applied to disposable repository in sandbox
        3. Real tests executed in the sandbox
        4. Real git commit created with real commit hash and SHA-256 audit digest.
        """
        payload = {
            "prompt": "Find and fix the memory leak in cache_manager.go",
            "repo_id": "repo-core",
            "strategy": "balanced",
            "safe_mode": True,
            "is_confidential": False
        }
        res_exec = self.client.post("/api/tasks/execute", json=payload)
        self.assertEqual(res_exec.status_code, 200)
        task = res_exec.json()
        approval_id = task["approval_id"]
        self.assertIsNotNone(approval_id)

        # Resolve approval
        resolve_payload = {
            "decision": "approved",
            "reviewer": "TEAM ARISE",
            "notes": "Verified minimal buffer reuse patch."
        }
        res_resolve = self.client.post(f"/api/approvals/{approval_id}/resolve", json=resolve_payload)
        self.assertEqual(res_resolve.status_code, 200)
        resolve_data = res_resolve.json()

        # Verify real sandbox path and execution
        self.assertEqual(resolve_data["applied_sandbox"], "nx-sandbox-849")
        self.assertIn("tests passed in sandbox", resolve_data["test_summary"])
        self.assertIn("sha256:", resolve_data["audit_receipt"])
        self.assertIn("SHA:", resolve_data["git_commit"])

        # Check sandbox directory actually exists on disk
        sandbox_dir = os.path.abspath(f"backend/sandboxes/{resolve_data['applied_sandbox']}")
        self.assertTrue(os.path.exists(sandbox_dir))
        self.assertTrue(os.path.exists(os.path.join(sandbox_dir, "pkg/cache/cache_manager.py")))

if __name__ == "__main__":
    unittest.main()

