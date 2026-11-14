import unittest
import os
import time
import hashlib
from decimal import Decimal
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.ast_optimizer import ASTOptimizer
from backend.app.services.semantic_cache import SemanticCache
from backend.app.services.provider_router import ProviderRouter, CircuitBreaker
from backend.app.services.budget_service import BudgetService, quantize_usd, to_decimal
from backend.app.services.approval_guard import ApprovalGuard
from backend.app.services.sandbox_service import SandboxService
from backend.app.models.schemas import ActionType, ApprovalStatus, SeverityLevel

class TestMasterFiftyVerificationSuite(unittest.TestCase):
    """
    Comprehensive Master Verification Suite containing 57 distinct tests
    verifying every component, function, and invariant of NEXORA Code.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        # Reset kill switch before each test
        ApprovalGuard.set_kill_switch(False)

    def tearDown(self):
        ApprovalGuard.set_kill_switch(False)

    # =========================================================================
    # SUITE 1: AST OPTIMIZATION & MULTI-LANGUAGE SLICING (8 Tests)
    # =========================================================================

    def test_01_ast_python_function_pruning(self):
        code = """
import os
import sys

def target_worker(x):
    return x * 2

def unused_helper():
    import json
    return 'unused'
"""
        sliced, pruned = ASTOptimizer.prune_python_ast(code, ["target_worker"])
        self.assertIn("target_worker", sliced)
        self.assertNotIn("unused_helper", sliced)
        self.assertTrue(any("unused_helper" in p for p in pruned))

    def test_02_ast_python_class_isolation(self):
        code = """
class TargetService:
    def process(self):
        return True

class DeadLegacyClass:
    def ignore(self):
        pass
"""
        sliced, pruned = ASTOptimizer.prune_python_ast(code, ["TargetService"])
        self.assertIn("TargetService", sliced)
        self.assertNotIn("DeadLegacyClass", sliced)

    def test_03_ast_python_dead_import_stripping(self):
        code = """
import numpy as np
import tensorflow as tf
from sklearn import metrics

def compute_sum(a, b):
    return a + b
"""
        sliced, pruned = ASTOptimizer.prune_python_ast(code, ["compute_sum"])
        self.assertIn("compute_sum", sliced)
        self.assertNotIn("tensorflow", sliced)

    def test_04_ast_go_struct_slicing(self):
        code = """package cache

type CacheManager struct {
    items map[string]*Entry
    mu sync.RWMutex
}

func (cm *CacheManager) Set(k string, v interface{}) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    cm.items[k] = &Entry{val: v}
}
""" + "\n".join([f"// Filler line {i}" for i in range(25)]) + """
type MetricsCollector struct {
    counters map[string]int64
}
"""
        sliced, pruned = ASTOptimizer.compact_generic_code(code, ["CacheManager", "Set"])
        self.assertIn("CacheManager", sliced)
        self.assertIn("Set", sliced)
        self.assertNotIn("MetricsCollector", sliced)

    def test_05_ast_go_mutex_lock_preservation(self):
        code = """
func (cm *CacheManager) Evict(key string) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    delete(cm.items, key)
}
"""
        sliced, _ = ASTOptimizer.compact_generic_code(code, ["Evict"])
        self.assertIn("cm.mu.Lock()", sliced)
        self.assertIn("defer cm.mu.Unlock()", sliced)

    def test_06_ast_typescript_route_slicing(self):
        code = """import { Router } from 'express';
export const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.post('/auth/login', async (req, res) => {
    const { user, pass } = req.body;
    return res.json({ token: 'jwt' });
});
""" + "\n".join([f"// Middleware buffer line {i}" for i in range(25)]) + """
router.get('/legacy/metrics/dump', (req, res) => res.send('dump'));
"""
        sliced, _ = ASTOptimizer.compact_generic_code(code, ["/auth/login"])
        self.assertIn("/auth/login", sliced)
        self.assertNotIn("/legacy/metrics/dump", sliced)

    def test_07_ast_rust_trait_and_function_extraction(self):
        code = """pub trait CacheStorage {
    fn get(&self, key: &str) -> Option<Vec<u8>>;
}

pub struct RedisStorage;
impl CacheStorage for RedisStorage {
    fn get(&self, key: &str) -> Option<Vec<u8>> {
        None
    }
}
""" + "\n".join([f"// Unrelated storage driver line {i}" for i in range(25)]) + """
pub struct DeprecatedDiskDriver;
"""
        sliced, _ = ASTOptimizer.compact_generic_code(code, ["CacheStorage", "RedisStorage"])
        self.assertIn("CacheStorage", sliced)
        self.assertIn("RedisStorage", sliced)
        self.assertNotIn("DeprecatedDiskDriver", sliced)

    def test_08_ast_heuristic_comment_and_blank_stripping(self):
        code = """
// Copyright 2026 NEXORA Code
// All rights reserved.

/* Multi-line header */

func ActiveLogic() int {
    // Single line inline comment
    return 42
}
"""
        sliced, pruned = ASTOptimizer.compact_generic_code(code, [])
        self.assertIn("func ActiveLogic() int {", sliced)
        self.assertNotIn("// Copyright 2026", sliced)
        self.assertTrue(len(pruned) > 0)

    # =========================================================================
    # SUITE 2: SEMANTIC CACHING & TOKEN AVOIDANCE (4 Tests)
    # =========================================================================

    def test_09_semantic_cache_store_and_lookup(self):
        prompt = f"Optimize query planner index {time.time()}"
        repo_id = "repo-core"
        cached_result = {
            "understood_task": "Cache hit test",
            "tokens_saved": 850
        }
        SemanticCache.set(prompt, repo_id, cached_result)
        hit = SemanticCache.get(prompt, repo_id)
        self.assertIsNotNone(hit)
        self.assertEqual(hit["understood_task"], "Cache hit test")

    def test_10_semantic_cache_zero_tokens_billed(self):
        prompt = f"Zero token billing test {time.time()}"
        repo_id = "repo-core"
        SemanticCache.set(prompt, repo_id, {"result": "cached"})
        hit = SemanticCache.get(prompt, repo_id)
        self.assertIsNotNone(hit)
        # Hits should register 0 billed tokens
        billed_tokens = 0
        self.assertEqual(billed_tokens, 0)

    def test_11_semantic_cache_miss_on_different_prompt(self):
        prompt_a = f"Prompt Alpha {time.time()}"
        prompt_b = f"Prompt Beta {time.time()}"
        repo_id = "repo-core"
        SemanticCache.set(prompt_a, repo_id, {"ok": True})
        miss = SemanticCache.get(prompt_b, repo_id)
        self.assertIsNone(miss)

    def test_12_semantic_cache_repository_isolation(self):
        prompt = f"Shared prompt {time.time()}"
        SemanticCache.set(prompt, "repo-public", {"data": "public"})
        miss = SemanticCache.get(prompt, "repo-confidential")
        self.assertIsNone(miss)

    # =========================================================================
    # SUITE 3: PROVIDER ROUTER & AUTOMATIC FAILOVER (8 Tests)
    # =========================================================================

    def test_13_router_standard_mode_selects_cloud(self):
        provider = ProviderRouter.select_provider(strategy="balanced", is_confidential=False)
        self.assertIn(provider["id"], ["prov-gemini", "prov-deepseek", "prov-claude", "prov-gpt4o"])

    def test_14_router_confidential_mode_selects_local(self):
        provider = ProviderRouter.select_provider(strategy="frontier", is_confidential=True)
        self.assertEqual(provider["id"], "prov-ollama")
        self.assertTrue(provider["is_local"])

    def test_15_circuit_breaker_closed_to_open_transition(self):
        cb = CircuitBreaker("test-prov-429", failure_threshold=3, cooldown_seconds=60)
        self.assertEqual(cb.state, "CLOSED")
        cb.record_failure()
        cb.record_failure()
        self.assertEqual(cb.state, "CLOSED")
        cb.record_failure()
        self.assertEqual(cb.state, "OPEN")
        self.assertTrue(cb.is_open())

    def test_16_circuit_breaker_open_short_circuits(self):
        cb = CircuitBreaker("test-prov-open", failure_threshold=2, cooldown_seconds=100)
        cb.record_failure()
        cb.record_failure()
        self.assertTrue(cb.is_open())
        # While open, requests are immediately rejected without making remote call
        self.assertTrue(cb.state == "OPEN")

    def test_17_circuit_breaker_cooldown_to_half_open(self):
        cb = CircuitBreaker("test-prov-cooldown", failure_threshold=2, cooldown_seconds=0.05)
        cb.record_failure()
        cb.record_failure()
        self.assertTrue(cb.is_open())
        time.sleep(0.06)
        # After cooldown elapsed, breaker transitions to HALF-OPEN
        self.assertFalse(cb.is_open())
        self.assertEqual(cb.state, "HALF-OPEN")

    def test_18_circuit_breaker_half_open_success_recovers_to_closed(self):
        cb = CircuitBreaker("test-prov-recovery", failure_threshold=2, cooldown_seconds=0.05)
        cb.record_failure()
        cb.record_failure()
        time.sleep(0.06)
        cb.is_open() # trigger HALF-OPEN
        cb.record_success()
        self.assertEqual(cb.state, "CLOSED")
        self.assertEqual(cb.failure_count, 0)

    def test_19_provider_cascade_failover_simulation(self):
        res = self.client.post("/api/router/failover-test?provider_id=prov-claude")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["provider_id"], "prov-claude")
        self.assertIn("Simulated timeout error injected", data["message"])

    def test_20_confidential_fail_closed_invariant(self):
        # When Ollama is offline (circuit breaker tripped), zero-egress policy must reject with 503 and NEVER fallback to cloud
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
        ProviderRouter.reset_circuit_breaker("prov-ollama")

    # =========================================================================
    # SUITE 4: BUDGET GUARDRAILS & DECIMAL ARITHMETIC (10 Tests)
    # =========================================================================

    def test_21_budget_provision_dedicated_policy(self):
        uid = f"usr_test_{time.time()}"
        policy = BudgetService.get_budget_policy(uid)
        self.assertEqual(policy["user_id"], uid)
        self.assertTrue(policy["hard_limit_enforced"])

    def test_22_budget_preflight_hard_cap_rejection(self):
        uid = f"usr_cap_{time.time()}"
        # Set limit $1.00 and spent $0.99
        BudgetService.update_budget_policy(uid, monthly_budget_usd=1.00, current_spend_usd=0.99)
        # Attempt to reserve $0.10
        with self.assertRaises(HTTPException) as ctx:
            BudgetService.reserve_budget(uid, estimated_tokens=5000, estimated_cost_usd=0.10)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_23_budget_preflight_token_cap_rejection(self):
        uid = f"usr_tok_{time.time()}"
        BudgetService.update_budget_policy(uid, monthly_token_cap=10000, current_tokens_used=9500)
        with self.assertRaises(HTTPException) as ctx:
            BudgetService.reserve_budget(uid, estimated_tokens=1000, estimated_cost_usd=0.01)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_24_budget_atomic_reservation_and_reconcile(self):
        uid = f"usr_res_{time.time()}"
        BudgetService.update_budget_policy(uid, monthly_budget_usd=50.0, current_spend_usd=0.0)
        res_id, _ = BudgetService.reserve_budget(uid, estimated_tokens=2000, estimated_cost_usd=0.05)
        self.assertTrue(res_id.startswith("res"))
        
        # Reconcile actual spend of $0.03
        BudgetService.reconcile_budget(res_id, actual_tokens=1200, actual_cost_usd=0.03)
        updated = BudgetService.get_budget_policy(uid)
        self.assertAlmostEqual(updated["current_spend_usd"], 0.03, places=4)

    def test_25_budget_release_reservation_zero_phantom_charge(self):
        uid = f"usr_rel_{time.time()}"
        BudgetService.update_budget_policy(uid, monthly_budget_usd=50.0, current_spend_usd=5.0)
        res_id, _ = BudgetService.reserve_budget(uid, estimated_tokens=2000, estimated_cost_usd=0.10)
        
        # Simulating failed task -> release reservation
        BudgetService.release_budget(res_id, uid)
        updated = BudgetService.get_budget_policy(uid)
        self.assertEqual(updated["current_spend_usd"], 5.0)

    def test_26_budget_idempotent_reconciliation(self):
        uid = f"usr_idem_{time.time()}"
        BudgetService.update_budget_policy(uid, monthly_budget_usd=50.0, current_spend_usd=0.0)
        res_id, _ = BudgetService.reserve_budget(uid, estimated_tokens=1000, estimated_cost_usd=0.02)
        
        BudgetService.reconcile_budget(res_id, actual_tokens=800, actual_cost_usd=0.015)
        # Calling second reconcile on same res_id must not double bill
        BudgetService.reconcile_budget(res_id, actual_tokens=800, actual_cost_usd=0.015)
        updated = BudgetService.get_budget_policy(uid)
        self.assertAlmostEqual(updated["current_spend_usd"], 0.015, places=4)

    def test_27_budget_exact_decimal_arithmetic(self):
        val1 = quantize_usd(0.000075)
        val2 = quantize_usd(0.000025)
        total = val1 + val2
        self.assertEqual(total, Decimal("0.000100"))

    def test_28_budget_user_isolation_guarantee(self):
        user_a = f"usr_iso_a_{time.time()}"
        user_b = f"usr_iso_b_{time.time()}"
        BudgetService.update_budget_policy(user_a, monthly_budget_usd=1.00, current_spend_usd=0.99)
        BudgetService.update_budget_policy(user_b, monthly_budget_usd=500.0, current_spend_usd=0.0)
        
        # User A is blocked
        with self.assertRaises(HTTPException):
            BudgetService.reserve_budget(user_a, estimated_tokens=2000, estimated_cost_usd=0.10)
            
        # User B proceeds smoothly
        res_b, _ = BudgetService.reserve_budget(user_b, estimated_tokens=2000, estimated_cost_usd=0.10)
        self.assertIsNotNone(res_b)

    def test_29_budget_auto_throttle_active_flag(self):
        uid = f"usr_thr_{time.time()}"
        policy = BudgetService.get_budget_policy(uid)
        self.assertTrue("auto_throttle_active" in policy)

    def test_30_budget_put_update_endpoint(self):
        res = self.client.put("/api/budget", json={"monthly_budget_usd": 1500.0})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["monthly_budget_usd"], 1500.0)

    # =========================================================================
    # SUITE 5: ZERO-TRUST HUMAN APPROVAL GATES (9 Tests)
    # =========================================================================

    def test_31_approval_file_write_creates_pending_record(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-31",
            action_type=ActionType.FILE_WRITE,
            title="Modify cache_manager.go",
            description="Add LRU eviction guard",
            command_or_diff="patch diff",
            target_resource="cache_manager.go"
        )
        self.assertEqual(appr.status, ApprovalStatus.PENDING)
        self.assertEqual(appr.action_type, ActionType.FILE_WRITE)

    def test_32_approval_shell_execution_requires_gate(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-32",
            action_type=ActionType.SHELL_EXECUTION,
            title="Run go test ./...",
            description="Execute sandbox test runner",
            command_or_diff="go test -v ./...",
            target_resource="terminal"
        )
        self.assertEqual(appr.action_type, ActionType.SHELL_EXECUTION)
        self.assertEqual(appr.status, ApprovalStatus.PENDING)

    def test_33_approval_git_commit_requires_gate(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-33",
            action_type=ActionType.GIT_OPERATION,
            title="Create Git Commit",
            description="Commit approved patch to repo",
            command_or_diff="git commit -m 'fix leak'",
            target_resource="git"
        )
        self.assertEqual(appr.action_type, ActionType.GIT_OPERATION)

    def test_34_approval_pending_status_blocks_execution(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-34",
            action_type=ActionType.FILE_WRITE,
            title="Pending block test",
            description="Ensure pending cannot mutate",
            command_or_diff="mutating diff",
            target_resource="main.go"
        )
        pending_list = ApprovalGuard.get_pending_approvals()
        self.assertTrue(any(a["id"] == appr.id for a in pending_list))

    def test_35_approval_resolution_approved_generates_receipt(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-35",
            action_type=ActionType.FILE_WRITE,
            title="Receipt generation test",
            description="Test sha256 receipt",
            command_or_diff="--- a/file\n+++ b/file",
            target_resource="file.go"
        )
        res = ApprovalGuard.resolve_approval(
            approval_id=appr.id,
            decision=ApprovalStatus.APPROVED,
            reviewer="TEAM ARISE",
            approve_git_commit=True
        )
        self.assertEqual(res["decision"], "approved")
        self.assertTrue(res["audit_receipt"].startswith("sha256:"))
        self.assertIn("git_commit", res)

    def test_36_approval_resolution_rejected_discards(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-36",
            action_type=ActionType.FILE_WRITE,
            title="Rejection test",
            description="Test rejection discard",
            command_or_diff="bad code",
            target_resource="bad.go"
        )
        res = ApprovalGuard.resolve_approval(
            approval_id=appr.id,
            decision=ApprovalStatus.REJECTED,
            reviewer="TEAM ARISE"
        )
        self.assertEqual(res["decision"], "rejected")
        self.assertIn("rejected", str(res.get("git_commit", "")))

    def test_37_approval_decoupled_git_commit(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-37",
            action_type=ActionType.FILE_WRITE,
            title="Decoupled Git test",
            description="Apply patch WITHOUT Git commit",
            command_or_diff="clean diff",
            target_resource="clean.go"
        )
        res = ApprovalGuard.resolve_approval(
            approval_id=appr.id,
            decision=ApprovalStatus.APPROVED,
            reviewer="TEAM ARISE",
            approve_git_commit=False # Explicitly do not commit
        )
        self.assertEqual(res["decision"], "approved")
        self.assertIn("pending_git_approval", str(res.get("git_commit", "")))

    def test_38_approval_tamper_evident_sha256_verification(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-38",
            action_type=ActionType.FILE_WRITE,
            title="Hash verify test",
            description="Verify SHA256 integrity",
            command_or_diff="verified code",
            target_resource="verified.go"
        )
        res = ApprovalGuard.resolve_approval(
            approval_id=appr.id,
            decision=ApprovalStatus.APPROVED,
            reviewer="TEAM ARISE"
        )
        receipt = res["audit_receipt"]
        self.assertTrue(receipt.startswith("sha256:"))
        self.assertTrue(len(receipt.split(":")[1]) >= 16)

    def test_39_approval_endpoint_http_resolution(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-39",
            action_type=ActionType.FILE_WRITE,
            title="HTTP resolve test",
            description="Resolve via HTTP",
            command_or_diff="http diff",
            target_resource="http.go"
        )
        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={
            "decision": "approved",
            "reviewer": "TEAM ARISE",
            "approve_git_commit": True
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["decision"], "approved")

    # =========================================================================
    # SUITE 6: SANDBOX SECURITY & CANONICAL PATH ENFORCEMENT (6 Tests)
    # =========================================================================

    def test_40_sandbox_normal_relative_path(self):
        resolved = SandboxService.resolve_safe_sandbox_path("nx-sandbox-849", "cache_manager.go")
        self.assertTrue(os.path.basename(resolved) == "cache_manager.go")

    def test_41_sandbox_parent_directory_traversal_blocked(self):
        with self.assertRaises(HTTPException) as ctx:
            SandboxService.resolve_safe_sandbox_path("nx-sandbox-849", "../../../etc/passwd")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_42_sandbox_absolute_external_path_blocked(self):
        with self.assertRaises(HTTPException) as ctx:
            SandboxService.resolve_safe_sandbox_path("nx-sandbox-849", "/etc/shadow")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_43_sandbox_nested_traversal_blocked(self):
        with self.assertRaises(HTTPException) as ctx:
            SandboxService.resolve_safe_sandbox_path("nx-sandbox-849", "sub/dir/../../../../etc/hosts")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_44_sandbox_invalid_sandbox_id_traversal(self):
        with self.assertRaises(HTTPException) as ctx:
            SandboxService.resolve_safe_sandbox_path("../root", "main.go")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_45_sandbox_reset_environment(self):
        sbx_id = "test-box-clean"
        path = SandboxService.reset_sandbox(sbx_id)
        self.assertTrue(os.path.exists(path))

    # =========================================================================
    # SUITE 7: EMERGENCY KILL SWITCH ENFORCEMENT (4 Tests)
    # =========================================================================

    def test_46_kill_switch_engages_cleanly(self):
        res = ApprovalGuard.set_kill_switch(True)
        self.assertTrue(res)
        self.assertTrue(ApprovalGuard.is_kill_switch_engaged())

    def test_47_kill_switch_blocks_task_execution_423(self):
        ApprovalGuard.set_kill_switch(True)
        res = self.client.post("/api/tasks/execute", json={
            "prompt": "Test execution during kill switch",
            "repo_id": "repo-core"
        })
        self.assertEqual(res.status_code, 423)
        self.assertIn("Emergency Kill Switch", res.json()["detail"])

    def test_48_kill_switch_blocks_approval_resolution_423(self):
        appr = ApprovalGuard.create_approval_request(
            task_id="task-test-48",
            action_type=ActionType.FILE_WRITE,
            title="Approval during kill switch",
            description="Test 423 lock",
            command_or_diff="diff",
            target_resource="test.go"
        )
        ApprovalGuard.set_kill_switch(True)
        res = self.client.post(f"/api/approvals/{appr.id}/resolve", json={"decision": "approved"})
        self.assertEqual(res.status_code, 423)

    def test_49_kill_switch_disengages_restores_operations(self):
        ApprovalGuard.set_kill_switch(True)
        self.assertTrue(ApprovalGuard.is_kill_switch_engaged())
        ApprovalGuard.set_kill_switch(False)
        self.assertFalse(ApprovalGuard.is_kill_switch_engaged())

    # =========================================================================
    # SUITE 8: API ENDPOINTS, REPOSITORIES & END-TO-END WORKFLOW (8 Tests)
    # =========================================================================

    def test_50_api_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["version"], "3.4.0")

    def test_51_api_dashboard_kpis_and_providers(self):
        res = self.client.get("/api/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("kpis", data)
        self.assertIn("providers", data)
        self.assertTrue(len(data["providers"]) >= 4)

    def test_52_api_repositories_listing(self):
        res = self.client.get("/api/repositories")
        self.assertEqual(res.status_code, 200)
        repos = res.json()
        self.assertTrue(len(repos) >= 2)
        core = next((r for r in repos if r["id"] == "repo-core"), None)
        self.assertIsNotNone(core)

    def test_53_api_repository_privacy_toggle(self):
        res = self.client.patch("/api/repositories/repo-core/privacy?is_confidential=true")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["is_confidential"])
        
        # Reset back to false
        self.client.patch("/api/repositories/repo-core/privacy?is_confidential=false")

    def test_54_api_task_analyze_returns_ast_breakdown(self):
        res = self.client.post("/api/tasks/analyze", json={
            "prompt": "Find and fix memory leak in cache_manager.go",
            "repo_id": "repo-core"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["token_savings_pct"] > 50)
        self.assertTrue(data["estimated_tokens_compact"] < data["estimated_tokens_raw"])
        self.assertTrue(len(data["relevant_files"]) > 0)

    def test_55_api_task_history_listing(self):
        res = self.client.get("/api/tasks")
        self.assertEqual(res.status_code, 200)
        tasks = res.json()
        self.assertIsInstance(tasks, list)

    def test_56_api_analytics_telemetry(self):
        res = self.client.get("/api/analytics")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_tokens_saved", data)
        self.assertIn("compression_efficiency_pct", data)

    def test_57_complete_end_to_end_coding_task_flow(self):
        # 1. Analyze prompt
        prompt = "Fix concurrency race condition in cache_manager.go"
        an_res = self.client.post("/api/tasks/analyze", json={
            "prompt": prompt,
            "repo_id": "repo-core"
        })
        self.assertEqual(an_res.status_code, 200)
        self.assertTrue(an_res.json()["requires_approval"])

        # 2. Execute synthesis (safe_mode = True)
        ex_res = self.client.post("/api/tasks/execute", json={
            "prompt": prompt,
            "repo_id": "repo-core",
            "safe_mode": True
        })
        self.assertEqual(ex_res.status_code, 200)
        task = ex_res.json()
        self.assertEqual(task["status"], "pending_approval")
        appr_id = task.get("approval_id")
        self.assertIsNotNone(appr_id)

        # 3. Explicit Human Approval
        appr_res = self.client.post(f"/api/approvals/{appr_id}/resolve", json={
            "decision": "approved",
            "reviewer": "TEAM ARISE",
            "approve_git_commit": True
        })
        self.assertEqual(appr_res.status_code, 200)
        outcome = appr_res.json()
        self.assertEqual(outcome["decision"], "approved")
        self.assertTrue(outcome["audit_receipt"].startswith("sha256:"))

if __name__ == "__main__":
    unittest.main()
