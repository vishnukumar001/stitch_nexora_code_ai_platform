import time
import unittest
from backend.app.services.provider_router import ProviderRouter
from backend.app.db.database import get_connection

class TestCircuitBreakerRecovery(unittest.TestCase):
    """
    Independent test suite verifying the complete Circuit Breaker state machine:
    CLOSED -> OPEN -> HALF-OPEN -> CLOSED (and HALF-OPEN -> OPEN on canary failure).
    """

    def setUp(self):
        self.test_pid = "prov-gemini"
        ProviderRouter.reset_circuit_breaker(self.test_pid)

    def tearDown(self):
        ProviderRouter.reset_circuit_breaker(self.test_pid)

    def test_01_closed_to_open_transition(self):
        """Verifies that 3 consecutive failures trip the breaker from CLOSED to OPEN."""
        state0 = ProviderRouter.get_circuit_breaker_state(self.test_pid)
        self.assertEqual(state0["state"], "closed")
        self.assertEqual(state0["failure_count"], 0)
        self.assertFalse(state0["tripped"])

        # Failure 1
        ProviderRouter.update_provider_health(self.test_pid, success=False, latency_ms=500)
        state1 = ProviderRouter.get_circuit_breaker_state(self.test_pid)
        self.assertEqual(state1["state"], "closed")
        self.assertEqual(state1["failure_count"], 1)
        self.assertFalse(state1["tripped"])

        # Failure 2
        ProviderRouter.update_provider_health(self.test_pid, success=False, latency_ms=500)
        state2 = ProviderRouter.get_circuit_breaker_state(self.test_pid)
        self.assertEqual(state2["state"], "closed")
        self.assertEqual(state2["failure_count"], 2)
        self.assertFalse(state2["tripped"])

        # Failure 3 -> Must TRIP to OPEN
        ProviderRouter.update_provider_health(self.test_pid, success=False, latency_ms=500)
        state3 = ProviderRouter.get_circuit_breaker_state(self.test_pid)
        self.assertEqual(state3["state"], "open")
        self.assertEqual(state3["failure_count"], 3)
        self.assertTrue(state3["tripped"])
        self.assertEqual(state3["status"], "degraded")

    def test_02_open_state_short_circuits_calls(self):
        """While circuit is OPEN and cooldown has not expired, is_circuit_open returns True."""
        # Trip the circuit
        for _ in range(3):
            ProviderRouter.update_provider_health(self.test_pid, success=False, latency_ms=500)

        prov = ProviderRouter.get_provider_by_id(self.test_pid)
        self.assertTrue(ProviderRouter.is_circuit_open(prov))

    def test_03_open_to_half_open_cooldown_transition(self):
        """When cooldown period elapses, breaker automatically transitions from OPEN to HALF-OPEN."""
        # Trip the circuit
        for _ in range(3):
            ProviderRouter.update_provider_health(self.test_pid, success=False, latency_ms=500)

        # Artificially age the last failure time beyond COOLDOWN_PERIOD_SECONDS (15s)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE providers
        SET last_failure_time = ?
        WHERE id = ?
        """, (time.time() - 25.0, self.test_pid))
        conn.commit()
        conn.close()

        prov = ProviderRouter.get_provider_by_id(self.test_pid)
        # Canary trial must be allowed
        self.assertFalse(ProviderRouter.is_circuit_open(prov))

        # State must now be half-open
        state = ProviderRouter.get_circuit_breaker_state(self.test_pid)
        self.assertEqual(state["state"], "half-open")

    def test_04_half_open_to_closed_on_success_canary(self):
        """A successful canary request in HALF-OPEN state resets the circuit breaker to CLOSED."""
        # Set directly to half-open
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE providers
        SET circuit_state = 'half-open', circuit_breaker_tripped = 1, failure_count = 3
        WHERE id = ?
        """, (self.test_pid,))
        conn.commit()
        conn.close()

        # Canary succeeds
        ProviderRouter.update_provider_health(self.test_pid, success=True, latency_ms=95)

        state = ProviderRouter.get_circuit_breaker_state(self.test_pid)
        self.assertEqual(state["state"], "closed")
        self.assertEqual(state["failure_count"], 0)
        self.assertFalse(state["tripped"])
        self.assertEqual(state["status"], "connected")

    def test_05_half_open_to_open_on_failed_canary(self):
        """A failed canary request in HALF-OPEN state immediately trips back to OPEN."""
        # Set to half-open
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE providers
        SET circuit_state = 'half-open', circuit_breaker_tripped = 1, failure_count = 3
        WHERE id = ?
        """, (self.test_pid,))
        conn.commit()
        conn.close()

        # Canary fails
        ProviderRouter.update_provider_health(self.test_pid, success=False, latency_ms=500)

        state = ProviderRouter.get_circuit_breaker_state(self.test_pid)
        self.assertEqual(state["state"], "open")
        self.assertTrue(state["tripped"])
        self.assertEqual(state["status"], "degraded")

    def test_06_manual_reset(self):
        """Manual reset immediately restores CLOSED state and clears failure counts."""
        for _ in range(3):
            ProviderRouter.update_provider_health(self.test_pid, success=False, latency_ms=500)

        ProviderRouter.reset_circuit_breaker(self.test_pid)

        state = ProviderRouter.get_circuit_breaker_state(self.test_pid)
        self.assertEqual(state["state"], "closed")
        self.assertEqual(state["failure_count"], 0)
        self.assertFalse(state["tripped"])

if __name__ == '__main__':
    unittest.main()
