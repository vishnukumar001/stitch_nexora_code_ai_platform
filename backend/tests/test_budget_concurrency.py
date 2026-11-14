import unittest
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal
from fastapi import HTTPException
from backend.app.services.budget_service import BudgetService, to_decimal
from backend.app.db.database import get_connection

class TestBudgetConcurrency(unittest.TestCase):
    """
    Independent test suite verifying atomic concurrency control, race condition
    prevention, thread-safe reservations, and isolation under multi-threaded contention.
    """

    def setUp(self):
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
            'bgt_conc_user', 'usr_concurrency_test', 1.00, 0.00,
            1000000, 0, 1, 1, 80.0, 30, 0.0, 0
        )
        """)
        conn.commit()
        conn.close()

    def tearDown(self):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM budget_policies WHERE user_id LIKE 'usr_concurrency%'")
        cursor.execute("DELETE FROM budget_reservations WHERE user_id LIKE 'usr_concurrency%'")
        conn.commit()
        conn.close()

    def test_01_concurrent_reservations_race_condition_prevention(self):
        """
        20 threads concurrently try to reserve $0.40 each on a $1.00 budget.
        Without atomic locking, all 20 would read $0 spent and all succeed ($8.00 total).
        With atomic locking, exactly 2 succeed and 18 are blocked.
        """
        user_id = "usr_concurrency_test"
        success_reservations = []
        rejected_count = 0
        lock = threading.Lock()

        def try_reserve():
            try:
                # 80,000 input + 10,000 output on Claude is roughly ~$0.39
                res_id, est_cost = BudgetService.reserve_budget(
                    user_id=user_id,
                    target_model="claude-3-7-sonnet",
                    estimated_input_tokens=80_000,
                    estimated_output_tokens=10_000
                )
                with lock:
                    success_reservations.append((res_id, est_cost))
            except HTTPException as e:
                if e.status_code == 403 and e.detail.get("error") == "BUDGET_CAP_EXCEEDED":
                    with lock:
                        nonlocal rejected_count
                        rejected_count += 1
                else:
                    raise e

        threads = [threading.Thread(target=try_reserve) for _ in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Exactly 2 reservations can fit within $1.00 (each ~$0.39, 2 * 0.39 = $0.78, 3rd would be $1.17 > $1.00)
        self.assertEqual(len(success_reservations), 2)
        self.assertEqual(rejected_count, 18)

        policy = BudgetService.get_budget_policy(user_id)
        self.assertLessEqual(policy["reserved_spend_usd"] + policy["current_spend_usd"], 1.00)

        # Cleanup active reservations
        for res_id, _ in success_reservations:
            BudgetService.release_reservation(res_id, user_id)

    def test_02_concurrent_reconciliations_exact_accounting(self):
        """
        Concurrently reconcile active reservations; verify final DB spend is exact.
        """
        user_id = "usr_concurrency_test"
        resv_ids = []
        # Pre-reserve 2 slots
        res_id1, _ = BudgetService.reserve_budget(user_id, "claude-3-7-sonnet", 50000, 5000)
        res_id2, _ = BudgetService.reserve_budget(user_id, "claude-3-7-sonnet", 50000, 5000)
        resv_ids = [(res_id1, 0.22, 55000), (res_id2, 0.28, 55000)]

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(BudgetService.reconcile_reservation, r_id, user_id, cost, tokens)
                for r_id, cost, tokens in resv_ids
            ]
            for f in as_completed(futures):
                f.result()

        policy = BudgetService.get_budget_policy(user_id)
        self.assertEqual(policy["reserved_spend_usd"], 0.0)
        self.assertEqual(policy["current_spend_usd"], 0.50) # 0.22 + 0.28
        self.assertEqual(policy["current_tokens_used"], 110000)

    def test_03_concurrent_multi_user_contention(self):
        """
        Multiple users concurrently reserving and spending; verify complete isolation and zero deadlocks.
        """
        users = [f"usr_concurrency_multi_{i}" for i in range(5)]
        conn = get_connection()
        cursor = conn.cursor()
        for u in users:
            cursor.execute("""
            INSERT OR REPLACE INTO budget_policies (
                id, user_id, monthly_budget_usd, current_spend_usd,
                monthly_token_cap, current_tokens_used, hard_limit_enforced,
                auto_throttle_active, alert_threshold_pct, runway_days,
                reserved_spend_usd, reserved_tokens
            ) VALUES (
                ?, ?, 10.0, 0.0, 500000, 0, 1, 1, 80.0, 30, 0.0, 0
            )
            """, (f"bgt_{u}", u))
        conn.commit()
        conn.close()

        def user_work(u):
            for _ in range(5):
                res_id, cost = BudgetService.reserve_budget(u, "deepseek-chat-v3", 1000, 200)
                BudgetService.reconcile_reservation(res_id, u, actual_cost_usd=0.01, actual_tokens=1200)

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(user_work, u) for u in users]
            for f in as_completed(futures):
                f.result()

        # Each user must have exactly 5 * $0.01 = $0.05 and 5 * 1200 = 6000 tokens
        for u in users:
            pol = BudgetService.get_budget_policy(u)
            self.assertEqual(pol["reserved_spend_usd"], 0.0)
            self.assertEqual(pol["current_spend_usd"], 0.05)
            self.assertEqual(pol["current_tokens_used"], 6000)

if __name__ == '__main__':
    unittest.main()
