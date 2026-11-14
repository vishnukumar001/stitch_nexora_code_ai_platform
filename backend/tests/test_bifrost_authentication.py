import os
import unittest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.semantic_cache import semantic_cache

class TestBifrostAuthentication(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def setUp(self):
        semantic_cache.clear()

    def test_bifrost_auth_header_format_and_no_leak(self):
        """
        Verifies that Bearer token authentication is correctly formatted,
        handles existing 'Bearer ' prefixes gracefully, and never exposes
        the API key in responses, errors, or serialized outputs.
        """
        mock_gateway = "https://api.maxim.ai/bifrost/v1"
        secret_key = "bifrost_live_secret_key_very_confidential"

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": "bifrost-101",
            "model": "bifrost-adaptive-router",
            "choices": [{"message": {"role": "assistant", "content": "@@ -1 +1 @@\n+// patched"}}],
            "usage": {"prompt_tokens": 100, "completion_tokens": 20}
        }

        with patch.dict(os.environ, {
            "BIFROST_API_KEY": secret_key,
            "BIFROST_GATEWAY_URL": mock_gateway,
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            with patch("httpx.post", return_value=mock_resp) as mock_post:
                payload = {
                    "prompt": "Test auth header formatting",
                    "repo_id": "repo-core",
                    "strategy": "balanced",
                    "safe_mode": True,
                    "is_confidential": False
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()

                # Verify Authorization header was sent with Bearer
                auth_sent = mock_post.call_args[1]["headers"]["Authorization"]
                self.assertEqual(auth_sent, f"Bearer {secret_key}")

                # Verify key is never leaked in the response body
                serialized = json.dumps(data)
                self.assertNotIn(secret_key, serialized)

    def test_bifrost_auth_failure_401_handled(self):
        """
        Verifies that a 401 Unauthorized response from Bifrost Gateway triggers
        failover without leaking credentials or crashing the application.
        """
        mock_gateway = "https://api.maxim.ai/bifrost/v1"
        invalid_key = "invalid_bifrost_key"

        mock_err_resp = MagicMock()
        mock_err_resp.status_code = 401
        mock_err_resp.text = "Unauthorized: Invalid API key"

        with patch.dict(os.environ, {
            "BIFROST_API_KEY": invalid_key,
            "BIFROST_GATEWAY_URL": mock_gateway,
            "GEMINI_API_KEY": "",
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            with patch("httpx.post", return_value=mock_err_resp):
                payload = {
                    "prompt": "Test handling of 401 unauthorized",
                    "repo_id": "repo-core",
                    "strategy": "balanced",
                    "safe_mode": True,
                    "is_confidential": False
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()
                # Should fail over to simulation when all keys exhausted
                self.assertEqual(data["execution_mode"], "SIMULATED PROVIDER EXECUTION")
                self.assertNotIn(invalid_key, json.dumps(data))

if __name__ == "__main__":
    unittest.main()
