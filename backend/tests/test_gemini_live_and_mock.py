import os
import unittest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.provider_router import ProviderRouter

class TestGeminiLiveAndMock(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def setUp(self):
        ProviderRouter.reset_circuit_breaker("prov-gemini")
        from backend.app.services.semantic_cache import semantic_cache
        semantic_cache.clear()

    def test_01_gemini_mocked_invocation(self):
        """
        Tests Google Gemini API (via Bifrost) integration with mocked HTTP response.
        Verifies request URL, payload structure, token metadata capture (promptTokenCount,
        candidatesTokenCount), and ensures API key is never leaked in the response.
        """
        mock_gemini_key = "AIzaSyFakeKeyForUnitTesting_9876543210"
        mock_model = "gemini-3.5-flash"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": "@@ -10,3 +10,6 @@\n+func FastCacheLookup(key string) ([]byte, bool) {\n+    return globalPool.Get(key)\n+}"
                            }
                        ]
                    },
                    "finishReason": "STOP"
                }
            ],
            "usageMetadata": {
                "promptTokenCount": 92,
                "candidatesTokenCount": 28,
                "totalTokenCount": 120
            }
        }

        with patch.dict(os.environ, {
            "GEMINI_API_KEY": mock_gemini_key,
            "GEMINI_MODEL": mock_model,
            "BIFROST_API_KEY": "",
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            with patch("httpx.post", return_value=mock_response) as mock_post:
                payload = {
                    "prompt": "Add FastCacheLookup with global buffer pool reuse",
                    "repo_id": "repo-core",
                    "strategy": "balanced",
                    "safe_mode": True,
                    "is_confidential": False
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()

                # Verify Gemini API call was dispatched
                mock_post.assert_called()
                call_args, call_kwargs = mock_post.call_args
                self.assertIn("generativelanguage.googleapis.com", call_args[0])
                self.assertIn(f"models/{mock_model}:generateContent", call_args[0])
                self.assertIn("key=", call_args[0])

                # Verify payload structure
                json_body = call_kwargs["json"]
                self.assertIn("contents", json_body)
                self.assertIn("parts", json_body["contents"][0])
                self.assertIn("FastCacheLookup", json_body["contents"][0]["parts"][0]["text"])

                # Verify response parsing and token telemetry capture
                self.assertEqual(data["execution_mode"], "LIVE PROVIDER EXECUTION")
                self.assertIn("Google Gemini", data["solution_summary"])
                self.assertEqual(data["model_used"], mock_model)
                self.assertEqual(data["provider_input_tokens"], 92)
                self.assertEqual(data["provider_output_tokens"], 28)

                # Verify API key is NEVER exposed in the API response
                self.assertNotIn(mock_gemini_key, json.dumps(data))

    def test_02_missing_credentials_fallback_to_simulated(self):
        """
        When credentials are empty, the engine transparently returns SIMULATED mode.
        """
        with patch.dict(os.environ, {
            "GEMINI_API_KEY": "",
            "BIFROST_API_KEY": "",
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            payload = {
                "prompt": "Optimize cache throughput under concurrency",
                "repo_id": "repo-core",
                "strategy": "max_thrift",
                "safe_mode": True,
                "is_confidential": False
            }
            res = self.client.post("/api/tasks/execute", json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertEqual(data["execution_mode"], "SIMULATED PROVIDER EXECUTION")
            self.assertIn("SIMULATED PROVIDER EXECUTION", data["solution_summary"])

    def test_03_confidential_mode_never_calls_gemini(self):
        """
        Confidential mode enforces strict Zero-Egress Air-Gap.
        Neither Gemini nor any cloud provider must ever be called.
        """
        mock_key = "AIzaSyFakeKeyShouldNeverBeSent"
        with patch.dict(os.environ, {
            "GEMINI_API_KEY": mock_key,
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            with patch("httpx.post") as mock_post:
                payload = {
                    "prompt": "Audit confidential credentials and session tokens",
                    "repo_id": "repo-auth",
                    "safe_mode": True,
                    "is_confidential": True
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()

                for call in mock_post.call_args_list:
                    url = call[0][0]
                    self.assertNotIn("googleapis.com", url)
                    self.assertNotIn("maxim.ai", url)

                self.assertTrue(data["is_confidential_routed"])
                self.assertIn("qwen", data["model_used"].lower())

    def test_04_provider_probe_status_reporting(self):
        """
        Verify that probe_all_providers correctly marks Gemini as online when configured,
        or not_configured when key is absent.
        """
        with patch.dict(os.environ, {"GEMINI_API_KEY": "AIzaFakeKey"}):
            providers = ProviderRouter.probe_all_providers()
            gemini_prov = next((p for p in providers if p["id"] == "prov-gemini"), None)
            self.assertIsNotNone(gemini_prov)
            self.assertIn(gemini_prov["status"], ("online", "connected"))

        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            providers = ProviderRouter.probe_all_providers()
            gemini_prov = next((p for p in providers if p["id"] == "prov-gemini"), None)
            self.assertIsNotNone(gemini_prov)
            self.assertEqual(gemini_prov["status"], "not_configured")

if __name__ == "__main__":
    unittest.main()

