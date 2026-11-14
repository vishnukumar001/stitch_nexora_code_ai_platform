import unittest
from decimal import Decimal
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.budget_service import BudgetService, to_decimal
from backend.app.services.semantic_cache import semantic_cache
from backend.app.db.database import get_connection

class TestUsageAccounting(unittest.TestCase):
    """
    Independent test suite verifying accurate usage accounting, reservation lifecycle,
    prevention of phantom charges on failure, and idempotency.
    """

    def setUp(self):
        semantic_cache.clear()
        self.client = TestClient(app)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM budget_reservations")
        cursor.execute("""
        INSERT OR REPLACE INTO budget_policies (
            id, user_id, monthly_budget_usd, current_spend_usd,
            monthly_token_cap, current_tokens_used, hard_limit_enforced,
            auto_throttle_active, alert_threshold_pct, runway_days,
            reserved_spend_usd, reserved_tokens
        ) VALUES (
            'bgt_acct_test', 'usr_acct_test', 100.0, 10.0,
            1000000, 50000, 1, 1, 80.0, 30, 0.0, 0
        )
        """)
        conn.commit()
        conn.close()

    def tearDown(self):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM budget_policies WHERE user_id = 'usr_acct_test'")
        cursor.execute("DELETE FROM budget_reservations WHERE user_id = 'usr_acct_test'")
        conn.commit()
        conn.close()

    def test_01_reserve_reconcile_lifecycle(self):
        """Standard lifecycle: Active reservation created -> reconciled with actual spend."""
        user_id = "usr_acct_test"

        # 1. Reserve
        res_id, est_cost = BudgetService.reserve_budget(
            user_id=user_id,
            target_model="claude-3-7-sonnet",
            estimated_input_tokens=10_000,
            estimated_output_tokens=1_000
        )
        self.assertGreater(est_cost, 0.0)

        # Verify reservation table and policy
        policy = BudgetService.get_budget_policy(user_id)
        self.assertEqual(policy["reserved_spend_usd"], est_cost)
        self.assertEqual(policy["current_spend_usd"], 10.0)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM budget_reservations WHERE id = ?", (res_id,))
        row = cursor.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row["status"], "active")
        conn.close()

        # 2. Reconcile with actual spend
        actual_cost = 0.045
        actual_tokens = 11000
        BudgetService.reconcile_reservation(
            reservation_id=res_id,
            user_id=user_id,
            actual_cost_usd=actual_cost,
            actual_tokens=actual_tokens
        )

        policy_after = BudgetService.get_budget_policy(user_id)
        self.assertEqual(policy_after["reserved_spend_usd"], 0.0)
        self.assertEqual(policy_after["current_spend_usd"], 10.045)
        self.assertEqual(policy_after["current_tokens_used"], 61000)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM budget_reservations WHERE id = ?", (res_id,))
        row = cursor.fetchone()
        self.assertEqual(row["status"], "reconciled")
        conn.close()

    def test_02_release_reservation_prevents_phantom_charges(self):
        """When inference fails or times out, release_reservation frees funds with 0 phantom charge."""
        user_id = "usr_acct_test"

        # 1. Reserve
        res_id, est_cost = BudgetService.reserve_budget(
            user_id=user_id,
            target_model="claude-3-7-sonnet",
            estimated_input_tokens=20_000,
            estimated_output_tokens=2_000
        )

        # 2. Simulate provider failure -> release reservation
        BudgetService.release_reservation(reservation_id=res_id, user_id=user_id)

        policy_after = BudgetService.get_budget_policy(user_id)
        self.assertEqual(policy_after["reserved_spend_usd"], 0.0)
        self.assertEqual(policy_after["current_spend_usd"], 10.0) # Untouched!
        self.assertEqual(policy_after["current_tokens_used"], 50000)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM budget_reservations WHERE id = ?", (res_id,))
        row = cursor.fetchone()
        self.assertEqual(row["status"], "released")
        conn.close()

    def test_03_no_double_reconciliation(self):
        """Calling reconcile multiple times on the same reservation is strictly idempotent."""
        user_id = "usr_acct_test"

        res_id, _ = BudgetService.reserve_budget(user_id, "claude-3-7-sonnet", 5000, 500)
        BudgetService.reconcile_reservation(res_id, user_id, 0.02, 5500)

        # Attempt duplicate reconciliation
        BudgetService.reconcile_reservation(res_id, user_id, 0.02, 5500)

        policy = BudgetService.get_budget_policy(user_id)
        self.assertEqual(policy["current_spend_usd"], 10.02) # Exactly once!

    def test_04_zero_token_cache_hit_accounting(self):
        """Semantic cache hits bill $0.00 and 0 tokens, releasing reserved budget cleanly."""
        user_id = "usr_acct_test"
        res_id, est_cost = BudgetService.reserve_budget(user_id, "claude-3-7-sonnet", 5000, 500)

        # Cache hit reconciliation
        BudgetService.reconcile_reservation(
            reservation_id=res_id,
            user_id=user_id,
            actual_cost_usd=0.0,
            actual_tokens=0
        )

        policy = BudgetService.get_budget_policy(user_id)
        self.assertEqual(policy["reserved_spend_usd"], 0.0)
        self.assertEqual(policy["current_spend_usd"], 10.0)
        self.assertEqual(policy["current_tokens_used"], 50000)

if __name__ == '__main__':
    unittest.main()
