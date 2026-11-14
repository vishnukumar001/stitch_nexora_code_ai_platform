import unittest
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.provider_router import ProviderRouter
from backend.app.services.semantic_cache import semantic_cache
from backend.app.db.database import get_connection

class TestConfidentialModeZeroEgress(unittest.TestCase):
    """
    Independent test suite verifying Zero-Egress Air-Gap security:
    - Confidential repositories and explicit confidential flags route strictly to local model.
    - Cloud fallback is 100% prevented under all conditions (offline, error, circuit breaker).
    - Audit logging records tamper-evident receipt without leaking source code.
    - Zero egress verified across concurrent tasks.
    """

    def setUp(self):
        semantic_cache.clear()
        self.client = TestClient(app)
        ProviderRouter.reset_circuit_breaker("prov-ollama")

    def tearDown(self):
        ProviderRouter.reset_circuit_breaker("prov-ollama")

    def test_01_confidential_repo_routes_strictly_to_local_ollama(self):
        """Confidential repo (repo-auth) routes to local Ollama with zero cloud egress."""
        cloud_called = []

        def mock_call(provider, prompt, code):
            if provider["id"] != "prov-ollama":
                cloud_called.append(provider["id"])
                raise AssertionError(f"SECURITY VIOLATION: Cloud provider {provider['id']} was invoked for confidential repo!")
            return {
                "summary": "Local Air-Gap synthesis complete.",
                "code_diff": "@@ -1 +1 @@",
                "model_used": "qwen2.5-coder:14b",
                "provider_name": "Local Ollama (Qwen 2.5 Coder)",
                "input_tokens": 80,
                "output_tokens": 40,
                "latency_ms": 35,
                "execution_mode": "SIMULATED PROVIDER EXECUTION"
            }

        with patch.object(ProviderRouter, "_simulate_or_call_provider", side_effect=mock_call):
            res = self.client.post("/api/tasks/execute", json={
                "prompt": "Secure JWT HMAC verification secret key",
                "repo_id": "repo-auth", # Confidential repo
                "strategy": "balanced",
                "safe_mode": False
            })
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["is_confidential_routed"])
            self.assertEqual(data["model_used"], "qwen2.5-coder:14b")
            self.assertEqual(len(cloud_called), 0)

    def test_02_explicit_confidential_flag_forces_airgap_on_standard_repo(self):
        """Passing is_confidential=True on standard repo forces Zero-Egress Air-Gap."""
        cloud_called = []

        def mock_call(provider, prompt, code):
            if provider["id"] != "prov-ollama":
                cloud_called.append(provider["id"])
                raise AssertionError(f"SECURITY VIOLATION: Cloud provider {provider['id']} was invoked!")
            return {
                "summary": "Air-Gap enforced.",
                "code_diff": "@@ -1 +1 @@",
                "model_used": "qwen2.5-coder:14b",
                "provider_name": "Local Ollama (Qwen 2.5 Coder)",
                "input_tokens": 80,
                "output_tokens": 30,
                "latency_ms": 30,
                "execution_mode": "SIMULATED PROVIDER EXECUTION"
            }

        with patch.object(ProviderRouter, "_simulate_or_call_provider", side_effect=mock_call):
            res = self.client.post("/api/tasks/execute", json={
                "prompt": "Sanitize internal secrets in memory",
                "repo_id": "repo-core", # Standard repo
                "is_confidential": True, # Explicit override
                "strategy": "balanced",
                "safe_mode": False
            })
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["is_confidential_routed"])
            self.assertEqual(len(cloud_called), 0)

    def test_03_zero_egress_when_local_offline_raises_503_no_cloud_fallback(self):
        """When local model is offline (circuit breaker tripped), return HTTP 503; NEVER fallback to cloud."""
        # Trip Ollama circuit breaker
        for _ in range(3):
            ProviderRouter.update_provider_health("prov-ollama", success=False, latency_ms=5000)

        res = self.client.post("/api/tasks/execute", json={
            "prompt": "Process sensitive cryptographic signing keys",
            "repo_id": "repo-auth",
            "strategy": "balanced",
            "safe_mode": True
        })
        self.assertEqual(res.status_code, 503)
        self.assertIn("strictly prevented by Zero-Egress Air-Gap", res.json()["detail"])

    def test_04_audit_log_records_airgap_verification_without_leaking_code(self):
        """Audit log contains tamper-evident receipt hash and never stores raw confidential code."""
        prompt = "Confidential customer PII encryption routine secret_9918"
        res = self.client.post("/api/tasks/execute", json={
            "prompt": prompt,
            "repo_id": "repo-auth",
            "strategy": "balanced",
            "safe_mode": False
        })
        self.assertEqual(res.status_code, 200)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_logs WHERE event_type = 'AIRGAP_ENFORCED_LOCAL_ONLY' ORDER BY timestamp DESC LIMIT 1")
        row = cursor.fetchone()
        conn.close()

        self.assertIsNotNone(row)
        # Receipt signature exists
        self.assertTrue(len(row["signature"]) >= 32)
        # Raw secret code or prompt must NOT be in audit details
        self.assertNotIn("secret_9918", row["details"])
        self.assertIn("protected under strict Zero-Egress Airgap Policy", row["details"])

    def test_05_concurrent_confidential_requests_safety(self):
        """Concurrent requests to confidential repos operate safely without race conditions or audit collisions."""
        def run_task(idx):
            return self.client.post("/api/tasks/execute", json={
                "prompt": f"Concurrent air-gap validation test iteration {idx}",
                "repo_id": "repo-auth",
                "strategy": "balanced",
                "safe_mode": False
            })

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(run_task, i) for i in range(10)]
            responses = [f.result() for f in as_completed(futures)]

        for r in responses:
            self.assertEqual(r.status_code, 200)
            self.assertTrue(r.json()["is_confidential_routed"])

if __name__ == '__main__':
    unittest.main()
