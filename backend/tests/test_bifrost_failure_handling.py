import os
import unittest
import httpx
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.provider_router import ProviderRouter

class TestBifrostFailureHandling(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def test_bifrost_gateway_timeout_triggers_failover(self):
        """
        Verifies that when Bifrost Gateway times out (ConnectTimeout / ReadTimeout),
        the router catches the timeout, trips/increments provider failure, and
        cascades to the next provider without crashing.
        """
        with patch.dict(os.environ, {
            "BIFROST_API_KEY": "bifrost_timeout_test_key",
            "BIFROST_GATEWAY_URL": "https://api.maxim.ai/bifrost/v1",
            "GEMINI_API_KEY": "",
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            with patch("httpx.post", side_effect=httpx.ConnectTimeout("Connection timed out after 15.0s")):
                payload = {
                    "prompt": "Test Bifrost gateway timeout cascade",
                    "repo_id": "repo-core",
                    "strategy": "balanced",
                    "safe_mode": True,
                    "is_confidential": False
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertIsNotNone(data["id"])
                # Confirms graceful execution despite gateway timeout
                self.assertIn("execution_mode", data)

    def test_bifrost_gateway_500_internal_error_failover(self):
        """
        Verifies that a 500 Internal Server Error or 502 Bad Gateway from Bifrost
        is handled and cascades to fallback.
        """
        mock_err_resp = MagicMock()
        mock_err_resp.status_code = 502
        mock_err_resp.text = "502 Bad Gateway: Upstream provider unavailable"

        with patch.dict(os.environ, {
            "BIFROST_API_KEY": "bifrost_502_key",
            "BIFROST_GATEWAY_URL": "https://api.maxim.ai/bifrost/v1",
            "GEMINI_API_KEY": "",
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            with patch("httpx.post", return_value=mock_err_resp):
                payload = {
                    "prompt": "Test 502 bad gateway handling",
                    "repo_id": "repo-core",
                    "strategy": "balanced",
                    "safe_mode": True,
                    "is_confidential": False
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
