import os
import unittest
from unittest.mock import patch, MagicMock
import httpx
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.provider_router import ProviderRouter
from backend.app.services.semantic_cache import semantic_cache

class TestProviderFailoverIntegration(unittest.TestCase):
    """
    Independent test suite verifying real automatic provider failover:
    Primary failures (timeout, 500, 429) automatically cascade to secondary providers
    within the same request, and tripped providers are bypassed immediately.
    """

    def setUp(self):
        semantic_cache.clear()
        self.client = TestClient(app)
        # Reset all circuit breakers to clean state
        for pid in ["prov-gemini", "prov-bifrost", "prov-deepseek", "prov-claude", "prov-gpt4o", "prov-ollama"]:
            ProviderRouter.reset_circuit_breaker(pid)

    def tearDown(self):
        for pid in ["prov-gemini", "prov-bifrost", "prov-deepseek", "prov-claude", "prov-gpt4o", "prov-ollama"]:
            ProviderRouter.reset_circuit_breaker(pid)

    def test_01_primary_provider_timeout_cascades_to_secondary(self):
        """When lead provider times out, failover cascades to secondary candidate within the same request."""
        def mock_call(provider, prompt, code):
            if provider["id"] in ("prov-bifrost", "prov-gemini"):
                raise httpx.TimeoutException("Primary provider connection timed out after 15.0s")
            # Secondary candidate succeeds
            return {
                "summary": f"Fallback solution synthesized via {provider['name']}.",
                "code_diff": "@@ -1,3 +1,5 @@\n+// Failover patch applied",
                "model_used": provider.get("model_name", "deepseek-chat-v3"),
                "provider_name": provider["name"],
                "input_tokens": 120,
                "output_tokens": 45,
                "latency_ms": 85,
                "execution_mode": "SIMULATED PROVIDER EXECUTION"
            }

        with patch.object(ProviderRouter, "_simulate_or_call_provider", side_effect=mock_call):
            res, cascade_chain, final_pid = ProviderRouter.execute_with_failover(
                repo_id="repo-core",
                prompt="Optimize cache invalidation routine",
                compact_code="func Invalidate() {}",
                strategy="balanced"
            )

            # Verification:
            # 1. Returned successfully
            self.assertIsNotNone(res)
            # 2. More than one provider attempted in cascade chain
            self.assertGreaterEqual(len(cascade_chain), 2)
            # 3. Final provider was NOT the failed lead provider
            self.assertNotIn(final_pid, ("prov-bifrost", "prov-gemini"))
            # 4. Lead provider's failure count was incremented
            lead_state = ProviderRouter.get_circuit_breaker_state("prov-gemini")
            self.assertGreaterEqual(lead_state["failure_count"], 1)

    def test_02_primary_500_server_error_failover(self):
        """When lead provider returns HTTP 500, cascade automatically proceeds to next provider."""
        def mock_call(provider, prompt, code):
            if provider["id"] in ("prov-bifrost", "prov-gemini"):
                raise Exception("Provider HTTP 500 Internal Server Error: upstream model unavailable")
            return {
                "summary": f"Recovered via {provider['name']}.",
                "code_diff": "@@ -1,2 +1,3 @@\n+// 500 Recovered",
                "model_used": provider.get("model_name"),
                "provider_name": provider["name"],
                "input_tokens": 100,
                "output_tokens": 50,
                "latency_ms": 70,
                "execution_mode": "SIMULATED PROVIDER EXECUTION"
            }

        with patch.object(ProviderRouter, "_simulate_or_call_provider", side_effect=mock_call):
            res, cascade_chain, final_pid = ProviderRouter.execute_with_failover(
                repo_id="repo-core",
                prompt="Refactor database connection pool",
                compact_code="func GetPool() {}",
                strategy="balanced"
            )
            self.assertIsNotNone(res)
            self.assertGreaterEqual(len(cascade_chain), 2)
            self.assertNotEqual(final_pid, "prov-gemini")

    def test_03_primary_429_rate_limit_failover(self):
        """When lead provider returns HTTP 429, cascade routes around the throttled provider."""
        def mock_call(provider, prompt, code):
            if provider["id"] in ("prov-bifrost", "prov-gemini"):
                raise Exception("Provider HTTP 429: Rate limit exceeded for organization")
            return {
                "summary": f"Rate-limit bypassed via {provider['name']}.",
                "code_diff": "@@ -1,2 +1,3 @@\n+// Rate limit bypassed",
                "model_used": provider.get("model_name"),
                "provider_name": provider["name"],
                "input_tokens": 110,
                "output_tokens": 40,
                "latency_ms": 65,
                "execution_mode": "SIMULATED PROVIDER EXECUTION"
            }

        with patch.object(ProviderRouter, "_simulate_or_call_provider", side_effect=mock_call):
            res, cascade_chain, final_pid = ProviderRouter.execute_with_failover(
                repo_id="repo-core",
                prompt="Audit JWT signature expiration",
                compact_code="func CheckJWT() {}",
                strategy="balanced"
            )
            self.assertIsNotNone(res)
            self.assertGreaterEqual(len(cascade_chain), 2)

    def test_04_tripped_provider_bypassed_immediately(self):
        """A provider with tripped circuit breaker is skipped without being called."""
        # Intentionally trip prov-gemini circuit breaker
        for _ in range(3):
            ProviderRouter.update_provider_health("prov-gemini", success=False, latency_ms=500)

        called_providers = []

        def mock_call(provider, prompt, code):
            called_providers.append(provider["id"])
            return {
                "summary": f"Processed by {provider['name']}.",
                "code_diff": "@@ -1 +1 @@",
                "model_used": provider.get("model_name"),
                "provider_name": provider["name"],
                "input_tokens": 100,
                "output_tokens": 30,
                "latency_ms": 50,
                "execution_mode": "SIMULATED PROVIDER EXECUTION"
            }

        with patch.object(ProviderRouter, "_simulate_or_call_provider", side_effect=mock_call):
            res, cascade_chain, final_pid = ProviderRouter.execute_with_failover(
                repo_id="repo-core",
                prompt="Unique query for tripped breaker bypass",
                compact_code="func B() {}",
                strategy="balanced"
            )

            # prov-gemini must NOT have been called at all!
            self.assertNotIn("prov-gemini", called_providers)
            self.assertNotEqual(final_pid, "prov-gemini")

    def test_05_http_endpoint_task_execute_failover(self):
        """End-to-end task execution API returns HTTP 200 with failover cascade chain."""
        def mock_call(provider, prompt, code):
            if provider["id"] in ("prov-bifrost", "prov-gemini"):
                raise httpx.ConnectError("Connection refused by upstream gateway")
            return {
                "summary": f"Solution via {provider['name']}.",
                "code_diff": "@@ -1,2 +1,3 @@\n+// Live failover diff",
                "model_used": provider.get("model_name"),
                "provider_name": provider["name"],
                "input_tokens": 150,
                "output_tokens": 60,
                "latency_ms": 110,
                "execution_mode": "SIMULATED PROVIDER EXECUTION"
            }

        with patch.object(ProviderRouter, "_simulate_or_call_provider", side_effect=mock_call):
            res = self.client.post("/api/tasks/execute", json={
                "prompt": "Test HTTP endpoint automatic failover",
                "repo_id": "repo-core",
                "strategy": "balanced",
                "safe_mode": False
            })
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertGreaterEqual(len(data["cascade_chain"]), 2)
            self.assertNotIn(data["model_used"], ("gemini-3.5-flash", "bifrost-adaptive-router"))

    def test_06_deepseek_live_failover_dispatch_and_token_metadata(self):
        """
        Verifies that when Gemini returns HTTP 429 Rate Limit, the router cascades
        to DeepSeek V3, accurately formatting OpenAI-compatible payload to api.deepseek.com,
        capturing prompt/completion token metadata, attributing to DeepSeek V3, and reconciling budget.
        """
        mock_deepseek_key = "sk-deepseek-live-test-key-998877"
        mock_ds_response = MagicMock()
        mock_ds_response.status_code = 200
        mock_ds_response.json.return_value = {
            "id": "chatcmpl-ds-9981",
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "@@ -10,3 +10,5 @@\n+// DeepSeek V3 optimized cache\n+func FastCache() {}"
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 145,
                "completion_tokens": 38,
                "total_tokens": 183
            }
        }

        # Intentionally trip prov-gemini with 3 HTTP 429 failures to open the circuit breaker
        for _ in range(3):
            ProviderRouter.update_provider_health("prov-gemini", success=False, latency_ms=500, error_type="HTTP 429")

        with patch.dict(os.environ, {
            "DEEPSEEK_API_KEY": mock_deepseek_key,
            "GEMINI_API_KEY": "",
            "BIFROST_API_KEY": "",
            "NEXORA_TEST_MOCK_LLM": "0"
        }):
            with patch("httpx.post", return_value=mock_ds_response) as mock_post:
                payload = {
                    "prompt": "Refactor hot cache lookup path using sync.Pool",
                    "repo_id": "repo-core",
                    "strategy": "balanced",
                    "safe_mode": False,
                    "is_confidential": False
                }
                res = self.client.post("/api/tasks/execute", json=payload)
                self.assertEqual(res.status_code, 200)
                data = res.json()

                # Verify DeepSeek was called
                mock_post.assert_called()
                call_args, call_kwargs = mock_post.call_args
                self.assertIn("api.deepseek.com", call_args[0])
                self.assertIn("/chat/completions", call_args[0])
                self.assertEqual(call_kwargs["headers"]["Authorization"], f"Bearer {mock_deepseek_key}")

                # Verify payload structure
                json_body = call_kwargs["json"]
                self.assertEqual(json_body["model"], "deepseek-chat")
                self.assertEqual(len(json_body["messages"]), 2)

                # Verify token telemetry & attribution
                self.assertEqual(data["execution_mode"], "LIVE PROVIDER EXECUTION")
                self.assertEqual(data["provider_input_tokens"], 145)
                self.assertEqual(data["provider_output_tokens"], 38)
                self.assertIn("DeepSeek V3", data["solution_summary"])
                self.assertNotIn(mock_deepseek_key, str(data))

if __name__ == '__main__':
    unittest.main()
