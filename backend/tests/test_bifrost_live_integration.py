import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.provider_router import ProviderRouter
from backend.app.services.semantic_cache import semantic_cache

class TestBifrostLiveIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def setUp(self):
        semantic_cache.clear()

    def test_bifrost_gateway_routing_to_gemini(self):
        """
        Verifies that when BIFROST_API_KEY is configured, requests dispatch
        to the configured Bifrost Gateway endpoint with correct OpenAI-compatible payload
        and route to the upstream Gemini model.
        """
        mock_gateway = "https://api.maxim.ai/bifrost/v1"
        mock_key = "bifrost_test_sec_key_7788"

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": "bifrost-cmpl-441",
            "model": "gemini-3.5-flash",
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "@@ -10,3 +10,5 @@\n+// Bifrost Gateway patch\n+func FastPool() {}"
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 185,
                "completion_tokens": 45,
                "total_tokens": 230
            }
        }

        with patch.dict(os.environ, {
            "BIFROST_API_KEY": mock_key,
            "BIFROST_GATEWAY_URL": mock_gateway,
            "GEMINI_API_KEY": "",
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            with patch("httpx.post", return_value=mock_resp) as mock_post:
                payload = {
                    "prompt": "Refactor buffer pool for high throughput",
                    "repo_id": "repo-core",
                    "strategy": "balanced",
                    "safe_mode": True,
                    "is_confidential": False
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()

                # Verify Bifrost Gateway was called
                mock_post.assert_called()
                call_url = mock_post.call_args[0][0]
                self.assertEqual(call_url, f"{mock_gateway}/chat/completions")

                # Verify Bearer Auth Header
                headers = mock_post.call_args[1]["headers"]
                self.assertEqual(headers["Authorization"], f"Bearer {mock_key}")
                self.assertEqual(headers["Content-Type"], "application/json")

                # Verify execution mode & provider attribution
                self.assertEqual(data["execution_mode"], "LIVE PROVIDER EXECUTION")
                self.assertIn("Bifrost", data["solution_summary"])
                self.assertEqual(data["model_used"], "gemini-3.5-flash")

if __name__ == "__main__":
    unittest.main()
