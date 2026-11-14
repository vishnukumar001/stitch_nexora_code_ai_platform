import unittest
from decimal import Decimal
from fastapi import HTTPException
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.budget_service import BudgetService, to_decimal, quantize_usd
from backend.app.db.database import get_connection

class TestBudgetEnforcement(unittest.TestCase):
    """
    Independent test suite verifying per-user budget enforcement,
    pre-flight limit checks, user isolation, and Decimal precision.
    """

    def setUp(self):
        self.client = TestClient(app)
        # Ensure fresh policy state for test users
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
            'bgt_test_user_a', 'usr_test_a', 10.0, 9.50,
            100000, 95000, 1, 1, 80.0, 5, 0.0, 0
        )
        """)
        cursor.execute("""
        INSERT OR REPLACE INTO budget_policies (
            id, user_id, monthly_budget_usd, current_spend_usd,
            monthly_token_cap, current_tokens_used, hard_limit_enforced,
            auto_throttle_active, alert_threshold_pct, runway_days,
            reserved_spend_usd, reserved_tokens
        ) VALUES (
            'bgt_test_user_b', 'usr_test_b', 500.0, 10.0,
            1000000, 50000, 1, 1, 80.0, 25, 0.0, 0
        )
        """)
        conn.commit()
        conn.close()

    def tearDown(self):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM budget_policies WHERE user_id IN ('usr_test_a', 'usr_test_b')")
        cursor.execute("DELETE FROM budget_reservations WHERE user_id IN ('usr_test_a', 'usr_test_b')")
        conn.commit()
        conn.close()

    def test_01_preflight_budget_hard_cap_rejection(self):
        """User A has $0.50 remaining ($10.0 limit, $9.50 spent). An expensive call ($1.00) must be rejected with 403."""
        with self.assertRaises(HTTPException) as ctx:
            # 100,000 input tokens on Claude (~$0.30) + 10,000 output (~$0.15) might fit,
            # but 500,000 tokens on Claude costs ~$1.50 which exceeds $0.50 remaining
            BudgetService.validate_pre_flight_budget(
                user_id="usr_test_a",
                target_model="claude-3-7-sonnet",
                estimated_input_tokens=200_000,
                estimated_output_tokens=10_000
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail["error"], "BUDGET_CAP_EXCEEDED")
        self.assertIn("exceeds monthly hard budget limit", ctx.exception.detail["message"])

    def test_02_preflight_token_cap_rejection(self):
        """User A has 5,000 tokens remaining (100k cap, 95k used). A 10,000 token call must be rejected."""
        with self.assertRaises(HTTPException) as ctx:
            BudgetService.validate_pre_flight_budget(
                user_id="usr_test_a",
                target_model="deepseek-chat-v3", # Cheap dollar-wise, but exceeds token cap
                estimated_input_tokens=8_000,
                estimated_output_tokens=2_000
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail["error"], "TOKEN_CAP_EXCEEDED")
        self.assertIn("exceeds monthly token cap", ctx.exception.detail["message"])

    def test_03_soft_limit_allows_spend_when_hard_limit_disabled(self):
        """When hard_limit_enforced is False, budget check allows request even if exceeding limit."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE budget_policies SET hard_limit_enforced = 0 WHERE user_id = 'usr_test_a'")
        conn.commit()
        conn.close()

        # Should NOT raise HTTPException
        est_cost = BudgetService.validate_pre_flight_budget(
            user_id="usr_test_a",
            target_model="claude-3-7-sonnet",
            estimated_input_tokens=200_000,
            estimated_output_tokens=10_000
        )
        self.assertGreater(est_cost, 0.50)

    def test_04_user_isolation_guarantee(self):
        """User A hitting budget cap must NEVER block User B, and User B spend must not alter User A."""
        # User A is blocked
        with self.assertRaises(HTTPException):
            BudgetService.validate_pre_flight_budget(
                user_id="usr_test_a",
                target_model="claude-3-7-sonnet",
                estimated_input_tokens=200_000,
                estimated_output_tokens=10_000
            )

        # User B with plenty of budget can proceed freely
        est_cost_b = BudgetService.validate_pre_flight_budget(
            user_id="usr_test_b",
            target_model="claude-3-7-sonnet",
            estimated_input_tokens=200_000,
            estimated_output_tokens=10_000
        )
        self.assertGreater(est_cost_b, 0.0)

        # Record usage for User B
        BudgetService.record_usage(user_id="usr_test_b", cost_billed_usd=15.0, tokens_consumed=50000)

        # Verify User A's policy remains identical
        policy_a = BudgetService.get_budget_policy("usr_test_a")
        self.assertEqual(policy_a["current_spend_usd"], 9.50)
        self.assertEqual(policy_a["current_tokens_used"], 95000)

        # Verify User B was updated
        policy_b = BudgetService.get_budget_policy("usr_test_b")
        self.assertEqual(policy_b["current_spend_usd"], 25.0)
        self.assertEqual(policy_b["current_tokens_used"], 100000)

    def test_05_decimal_precision_exact_arithmetic(self):
        """Micro-USD costs accumulate with exact Decimal precision without floating point drift."""
        user_id = "usr_test_precision"
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO budget_policies (
                id, user_id, monthly_budget_usd, current_spend_usd,
                monthly_token_cap, current_tokens_used, hard_limit_enforced,
                auto_throttle_active, alert_threshold_pct, runway_days,
                reserved_spend_usd, reserved_tokens
            ) VALUES (
                'bgt_precision', 'usr_test_precision', 10.0, 0.0,
                1000000, 0, 1, 1, 80.0, 30, 0.0, 0
            )
            """)
            conn.commit()
            conn.close()

            # Record 100 micro-charges of $0.000125
            micro_charge = 0.000125
            for _ in range(100):
                BudgetService.record_usage(user_id, micro_charge, 10)

            policy = BudgetService.get_budget_policy(user_id)
            expected = Decimal("0.000125") * Decimal("100") # Exactly 0.012500
            actual = to_decimal(policy["current_spend_usd"])
            self.assertEqual(actual, expected)
        finally:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM budget_policies WHERE user_id = 'usr_test_precision'")
            conn.commit()
            conn.close()

if __name__ == '__main__':
    unittest.main()
