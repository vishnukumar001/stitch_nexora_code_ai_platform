import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.semantic_cache import semantic_cache

class TestBifrostUsageMetadata(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def setUp(self):
        semantic_cache.clear()

    def test_bifrost_usage_metadata_preserved_accurately(self):
        """
        Verifies that prompt_tokens, completion_tokens, and total_tokens
        returned by Bifrost Gateway are mapped directly to task telemetry.
        """
        mock_gateway = "https://api.maxim.ai/bifrost/v1"
        mock_key = "bifrost_test_key_metadata"

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": "bifrost-usage-992",
            "model": "gemini-3.5-flash",
            "choices": [{"message": {"role": "assistant", "content": "@@ -1,3 +1,6 @@\n+func Fast() {}"}}],
            "usage": {
                "prompt_tokens": 420,
                "completion_tokens": 85,
                "total_tokens": 505
            }
        }

        with patch.dict(os.environ, {
            "BIFROST_API_KEY": mock_key,
            "BIFROST_GATEWAY_URL": mock_gateway,
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            with patch("httpx.post", return_value=mock_resp):
                payload = {
                    "prompt": "Preserve usage metadata test",
                    "repo_id": "repo-core",
                    "strategy": "balanced",
                    "safe_mode": True,
                    "is_confidential": False
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()

                self.assertEqual(data["provider_input_tokens"], 420)
                self.assertEqual(data["provider_output_tokens"], 85)
                self.assertEqual(data["actual_tokens_billed"], 505)

if __name__ == "__main__":
    unittest.main()
