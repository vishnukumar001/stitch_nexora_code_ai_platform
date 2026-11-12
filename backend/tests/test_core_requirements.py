import unittest
import os
import json
from backend.app.db.database import init_db, get_connection
from backend.app.services.ast_optimizer import ASTOptimizer
from backend.app.services.privacy_guard import PrivacyGuard
from backend.app.services.budget_service import BudgetService
from backend.app.services.approval_guard import ApprovalGuard
from backend.app.services.provider_router import ProviderRouter
from backend.app.services.tokenizer_service import count_tokens, calculate_cost, calculate_savings
from backend.app.models.schemas import ActionType, SeverityLevel, ApprovalStatus

class TestNexoraCodeRequirements(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()

    # Requirement A: Reliability & Automatic Failover
    def test_a_reliability_provider_failover(self):
        providers = ProviderRouter.get_all_providers()
        self.assertGreaterEqual(len(providers), 4)

        # Ensure providers include Claude, DeepSeek, GPT-4o, Ollama, Bifrost
        provider_names = [p["name"] for p in providers]
        self.assertTrue(any("Claude" in n for n in provider_names))
        self.assertTrue(any("DeepSeek" in n for n in provider_names))
        self.assertTrue(any("Ollama" in n for n in provider_names))
        self.assertTrue(any("Bifrost" in n for n in provider_names))

        # Test automatic failover execution
        res, chain, pid = ProviderRouter.execute_with_failover(
            repo_id="repo-core",
            prompt="Refactor connection pool timeout",
            compact_code="func Connect() error { return nil }",
            strategy="balanced"
        )
        self.assertIsNotNone(res)
        self.assertGreater(len(chain), 0)

    # Requirement B: Code Privacy (Confidential Repositories Local-Only)
    def test_b_code_privacy_airgap(self):
        # 'repo-auth' is marked confidential
        meta = PrivacyGuard.check_repository_privacy("repo-auth")
        self.assertTrue(meta["is_confidential"])

        # Enforce privacy check
        enforced_model, is_confidential, receipt = PrivacyGuard.enforce_privacy("repo-auth")
        self.assertTrue(is_confidential)
        self.assertEqual(enforced_model, "prov-ollama")
        self.assertTrue(len(receipt) == 64) # SHA-256 hash receipt

        # Non-confidential repo
        non_conf_model, is_conf, _ = PrivacyGuard.enforce_privacy("repo-core")
        self.assertFalse(is_conf)

    # Requirement C: Budget Management & Pre-Flight Limits
    def test_c_budget_management(self):
        budget = BudgetService.get_budget_policy("usr_elena_01")
        self.assertIn("monthly_budget_usd", budget)
        self.assertIn("current_spend_usd", budget)

        # Pre-flight check should pass for normal request
        est_cost = BudgetService.validate_pre_flight_budget(
            user_id="usr_elena_01",
            target_model="deepseek-chat-v3",
            estimated_input_tokens=500,
            estimated_output_tokens=200
        )
        self.assertGreater(est_cost, 0.0)

        # Pre-flight check should block requests exceeding budget
        with self.assertRaises(Exception):
            BudgetService.validate_pre_flight_budget(
                user_id="usr_elena_01",
                target_model="claude-3-7-sonnet",
                estimated_input_tokens=100_000_000, # Massive token overload
                estimated_output_tokens=10_000_000
            )

    # Requirement D: Action Approval Gates & Emergency Kill Switch
    def test_d_action_approval_and_kill_switch(self):
        # Create approval gate
        gate = ApprovalGuard.create_approval_gate(
            task_id="test-task-1",
            action_type=ActionType.SHELL_EXECUTION,
            title="TEST: Docker Run",
            description="Run test suite in container",
            command_or_diff="docker run test-runner",
            target_resource="test-repo",
            severity=SeverityLevel.HIGH
        )
        self.assertEqual(gate.status, ApprovalStatus.PENDING)

        # Test approving the action
        res = ApprovalGuard.resolve_approval(gate.id, ApprovalStatus.APPROVED, reviewer="Elena Rostova")
        self.assertEqual(res["decision"], "approved")

        # Test Emergency Kill Switch
        ApprovalGuard.set_kill_switch(True)
        self.assertTrue(ApprovalGuard.is_kill_switch_engaged())

        # When kill switch is engaged, new approval creation must be locked
        with self.assertRaises(Exception):
            ApprovalGuard.create_approval_gate(
                task_id="test-task-2",
                action_type=ActionType.FILE_WRITE,
                title="Write file",
                description="Write to disk",
                command_or_diff="code",
                target_resource="test-repo"
            )

        # Disengage kill switch
        ApprovalGuard.set_kill_switch(False)
        self.assertFalse(ApprovalGuard.is_kill_switch_engaged())

    # Requirement E: Token Optimization & AST Slicing (Central Objective)
    def test_e_token_optimization_ast_slicing(self):
        sample_code = """
package main
import "fmt"
import "strings"
import "time"

// 500 lines of unreferenced mock fixtures and tests...
// Dummy line 1
// Dummy line 2
// Dummy line 3
// Dummy line 4
// Dummy line 5

func TargetAlgorithm(data []string) int {
    count := 0
    for _, item := range data {
        if strings.Contains(item, "target") {
            count++
        }
    }
    return count
}

func UnreferencedHelper1() {}
func UnreferencedHelper2() {}
func UnreferencedHelper3() {}
func UnreferencedHelper4() {}
""" * 5

        res = ASTOptimizer.optimize_context(
            raw_code=sample_code,
            query="Investigate TargetAlgorithm performance",
            file_path="main.go"
        )

        self.assertGreater(res["raw_tokens"], res["compressed_tokens"])
        self.assertGreater(res["tokens_saved"], 0)
        self.assertGreaterEqual(res["compression_ratio"], 20.0)

        # Check savings calculation
        saved, ratio, base_cost, dollars_saved = calculate_savings(
            raw_tokens=res["raw_tokens"],
            compressed_tokens=res["compressed_tokens"],
            output_tokens=100,
            target_model="deepseek-chat-v3"
        )
        self.assertGreater(dollars_saved, 0.0)
        self.assertGreater(ratio, 0.0)

if __name__ == "__main__":
    unittest.main()

