import sqlite3
import json
import os
import time
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nexora.db")

def get_connection():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Repositories table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        branch TEXT NOT NULL DEFAULT 'main',
        language TEXT NOT NULL,
        is_confidential INTEGER NOT NULL DEFAULT 0,
        ast_indexed INTEGER NOT NULL DEFAULT 1,
        contributors_count INTEGER DEFAULT 1,
        total_loc INTEGER DEFAULT 0,
        privacy_mode TEXT DEFAULT 'internal',
        local_path TEXT
    );
    """)

    # Providers table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier TEXT NOT NULL,
        model_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'online',
        latency_ms INTEGER DEFAULT 120,
        p95_latency_ms INTEGER DEFAULT 142,
        uptime_pct REAL DEFAULT 99.98,
        cost_per_m_in REAL NOT NULL,
        cost_per_m_out REAL NOT NULL,
        is_local INTEGER NOT NULL DEFAULT 0,
        circuit_breaker_tripped INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        endpoint_url TEXT,
        has_api_key INTEGER DEFAULT 1
    );
    """)

    # Budget Policy table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS budget_policies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        monthly_budget_usd REAL NOT NULL DEFAULT 1200.0,
        current_spend_usd REAL NOT NULL DEFAULT 482.40,
        monthly_token_cap INTEGER NOT NULL DEFAULT 45000000,
        current_tokens_used INTEGER NOT NULL DEFAULT 14820000,
        hard_limit_enforced INTEGER NOT NULL DEFAULT 1,
        auto_throttle_active INTEGER NOT NULL DEFAULT 1,
        alert_threshold_pct REAL DEFAULT 80.0,
        runway_days INTEGER DEFAULT 18
    );
    """)

    # Action Approvals table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS action_approvals (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        command_or_diff TEXT NOT NULL,
        target_resource TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at REAL NOT NULL,
        resolved_at REAL,
        resolved_by TEXT,
        risk_analysis TEXT,
        sandbox_id TEXT DEFAULT 'nx-sandbox-849'
    );
    """)

    # Tasks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        repo_id TEXT NOT NULL,
        branch TEXT NOT NULL,
        prompt TEXT NOT NULL,
        solution_summary TEXT NOT NULL,
        model_used TEXT NOT NULL,
        cascade_chain TEXT NOT NULL, -- JSON list
        is_confidential_routed INTEGER NOT NULL DEFAULT 0,
        tokens_uncompressed INTEGER NOT NULL,
        tokens_compressed INTEGER NOT NULL,
        tokens_saved INTEGER NOT NULL,
        compression_ratio REAL NOT NULL,
        cost_billed_usd REAL NOT NULL,
        cost_saved_usd REAL NOT NULL,
        latency_ms INTEGER NOT NULL,
        status TEXT NOT NULL,
        reasoning_steps TEXT NOT NULL, -- JSON list
        diffs TEXT NOT NULL, -- JSON list
        approval_id TEXT,
        created_at REAL NOT NULL
    );
    """)

    # Audit Logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp REAL NOT NULL,
        event_type TEXT NOT NULL,
        details TEXT NOT NULL,
        signature TEXT NOT NULL
    );
    """)

    conn.commit()

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM repositories")
    if cursor.fetchone()[0] == 0:
        seed_data(conn)

    conn.close()

def seed_data(conn):
    cursor = conn.cursor()

    # 1. Repositories
    repos = [
        ("repo-core", "prod-core-monorepo", "feat/distributed-cache", "Go / Rust / TS", 0, 1, 42, 142500, "internal", None),
        ("repo-auth", "auth-service", "main", "Go", 1, 1, 14, 28400, "confidential", None),
        ("repo-billing", "billing-gateway", "v3-migration", "Rust / WASM", 0, 1, 8, 45200, "internal", None),
        ("repo-ai-search", "ai-search-indexer", "perf/vector-opt", "Python", 0, 1, 19, 36800, "internal", None),
    ]
    cursor.executemany("""
    INSERT INTO repositories (id, name, branch, language, is_confidential, ast_indexed, contributors_count, total_loc, privacy_mode, local_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, repos)

    # 2. Providers
    providers = [
        ("prov-claude", "Anthropic Claude 3.7 Sonnet", "P1 Primary", "claude-3-7-sonnet-20250219", "online", 142, 168, 99.98, 3.00, 15.00, 0, 0, 0, "https://api.anthropic.com/v1", 1),
        ("prov-deepseek", "DeepSeek V3", "P2 Fast-Path", "deepseek-chat-v3", "online", 88, 110, 99.95, 0.14, 0.28, 0, 0, 0, "https://api.deepseek.com/v1", 1),
        ("prov-gpt4o", "OpenAI GPT-4o", "P3 Fallback", "gpt-4o", "standby", 160, 195, 99.99, 2.50, 10.00, 0, 0, 0, "https://api.openai.com/v1", 1),
        ("prov-ollama", "Local Ollama Qwen 2.5 Coder", "P0 Privacy (Air-Gapped)", "qwen2.5-coder:14b", "online", 32, 45, 100.0, 0.00, 0.00, 1, 0, 0, "http://127.0.0.1:11434", 1),
        ("prov-bifrost", "Bifrost Gateway by Maxim AI", "Dynamic Proxy", "bifrost-adaptive-router", "online", 94, 125, 99.99, 1.20, 4.50, 0, 0, 0, "https://gateway.maxim.ai/v1", 1),
    ]
    cursor.executemany("""
    INSERT INTO providers (id, name, tier, model_name, status, latency_ms, p95_latency_ms, uptime_pct, cost_per_m_in, cost_per_m_out, is_local, circuit_breaker_tripped, failure_count, endpoint_url, has_api_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, providers)

    # 3. Budget Policy
    cursor.execute("""
    INSERT INTO budget_policies (id, user_id, monthly_budget_usd, current_spend_usd, monthly_token_cap, current_tokens_used, hard_limit_enforced, auto_throttle_active, alert_threshold_pct, runway_days)
    VALUES ('bgt_elena', 'usr_elena_01', 1200.0, 482.40, 45000000, 14820000, 1, 1, 80.0, 18)
    """)

    # 4. Pending Action Approvals (from Stitch screen 9)
    now = time.time()
    approvals = [
        (
            "appr-8941",
            "task-8941",
            "shell_execution",
            "SHELL COMMAND EXECUTION: Integration Test Matrix",
            "Agent requested containerized integration run requiring destructive directory clean parameter.",
            'docker exec -it nx-sandbox-849 sh -c "rm -rf /tmp/cache_build && go test -tags=integration ./pkg/cache/..."',
            "prod-core-monorepo : feat/distributed-cache",
            "critical",
            "pending",
            now - 240,
            None,
            None,
            "Heuristic tripwire caught destructive command parameter 'rm -rf'. AST execution tracer confirms deletion is strictly isolated within container nx-sandbox-849. Zero host mount leakage detected.",
            "nx-sandbox-849"
        ),
        (
            "appr-8938",
            "task-8938",
            "file_write",
            "PROTECTED FILE MUTATION LEASE: Ed25519 Token Parser",
            "Mutating security authentication critical path file in confidential repo.",
            """--- a/services/jwt_validator.go
+++ b/services/jwt_validator.go
@@ -142,3 +142,3 @@
-	return jwt.ParseWithClaims(tokenStr, &claims, legacyKeyFunc)
+	return jwt.ParseWithClaims(tokenStr, &claims, ed25519Verifier.GetSigningKey)""",
            "auth-service : services/jwt_validator.go",
            "high",
            "pending",
            now - 720,
            None,
            None,
            "Protected path violation: cryptographic verification algorithm upgrade. Requires explicit confirmation under Code Privacy and Action Approval rules.",
            "nx-sandbox-849"
        ),
        (
            "appr-8935",
            "task-8935",
            "git_operation",
            "REMOTE GIT PUSH: Deploy gRPC Proto Stubs",
            "Agent pushing newly generated gRPC proto stubs to upstream branch.",
            "git push origin feature/proto-gen --force-with-lease",
            "prod-core-monorepo : feature/proto-gen",
            "medium",
            "pending",
            now - 1440,
            None,
            None,
            "Remote Git Operation requires human sign-off per Action Approval requirements.",
            "nx-sandbox-849"
        ),
    ]
    cursor.executemany("""
    INSERT INTO action_approvals (id, task_id, action_type, title, description, command_or_diff, target_resource, severity, status, created_at, resolved_at, resolved_by, risk_analysis, sandbox_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, approvals)

    # 5. Seed Tasks (Recent activities from Stitch screens)
    tasks = [
        (
            "task-8941",
            "Refactor Cache Buffer Pool to Sync.Pool",
            "repo-core",
            "feat/distributed-cache",
            "Investigate memory spike in cache_manager.go during high eviction rate. Refactor inner byte buffer to use sync.Pool and supply benchmarks.",
            "Found critical allocation trigger inside EvictExpiredKeys(). Dynamic reallocation caused ~48MB GC spikes under 10k QPS. Replaced dynamic buffer with sync.Pool pre-allocated buffer pool.",
            "DeepSeek V3 (Draft) + Claude 3.7 (Audit)",
            json.dumps(["DeepSeek V3", "Claude 3.7 Sonnet"]),
            0,
            8420,
            340,
            8080,
            96.0,
            0.042,
            0.184,
            1420,
            "pending_approval",
            json.dumps([
                {"step_number": 1, "title": "Indexed repository AST symbols", "description": "Cached in vector memory · 0 tokens billed", "duration_s": 0.12, "tokens_saved": 4200, "status": "completed"},
                {"step_number": 2, "title": "Identified memory allocation bottleneck", "description": "Target locus: cache_manager.go:142 (Unbounded slice grow)", "duration_s": 0.34, "tokens_saved": 0, "status": "completed"},
                {"step_number": 3, "title": "Routed AST snippet to DeepSeek V3 for draft", "description": "Saved 12,400 tokens via partial tree context substitution", "duration_s": 1.08, "tokens_saved": 12400, "status": "completed"},
                {"step_number": 4, "title": "Verification test run passed", "description": "24/24 unit tests OK in isolated sandbox (#nx-849)", "duration_s": 0.82, "tokens_saved": 0, "status": "completed"}
            ]),
            json.dumps([
                {
                    "filename": "pkg/cache/cache_manager.go",
                    "lines_added": 28,
                    "lines_deleted": 14,
                    "diff_text": """@@ -138,10 +138,11 @@
 func (cm *CacheManager) EvictExpiredKeys(ctx context.Context) {
 	cm.mu.Lock()
 	defer cm.mu.Unlock()
-	// Unbounded buffer instantiation on every eviction tick
-	rawBuffer := make([]byte, 0, 65536)
-	buf := bytes.NewBuffer(rawBuffer)
+	// Lease pre-allocated byte slice from sync.Pool
+	bufPtr := bufferPool.Get().(*bytes.Buffer)
+	bufPtr.Reset()
+	defer bufferPool.Put(bufPtr)
 	for _, key := range cm.evictionQueue {
 		if cm.isExpired(key) {
 			bufPtr.WriteString(key)
 			delete(cm.table, key)"""
                },
                {
                    "filename": "pkg/cache/cache_test.go",
                    "lines_added": 65,
                    "lines_deleted": 0,
                    "diff_text": """+func BenchmarkEvictionThroughput(b *testing.B) {
+	cm := NewCacheManager(100000)
+	b.ResetTimer()
+	for i := 0; i < b.N; i++ {
+		cm.EvictExpiredKeys(context.Background())
+	}
+}"""
                }
            ]),
            "appr-8941",
            now - 240
        ),
        (
            "task-8938",
            "Migrate auth JWT parser to Rust WASM",
            "repo-auth",
            "feat/wasm-jwt",
            "Upgrade legacy JWT verification parser to Ed25519 hardware enclave verifier in confidential auth service.",
            "Verified confidential repository policy: routed strictly to Local Air-Gapped Model (Local Qwen 2.5 Coder). Zero third-party network egress.",
            "Local Ollama Qwen 2.5 Coder",
            json.dumps(["Local Ollama Qwen 2.5 Coder"]),
            1,
            116400,
            32400,
            84000,
            72.2,
            0.000,
            0.312,
            620,
            "completed",
            json.dumps([
                {"step_number": 1, "title": "Confidential Air-Gap Verified", "description": "Local model enforced, zero network egress", "duration_s": 0.05, "tokens_saved": 0, "status": "completed"},
                {"step_number": 2, "title": "AST Parser Context Slicing", "description": "Pruned 84k unneeded symbols", "duration_s": 0.22, "tokens_saved": 84000, "status": "completed"},
                {"step_number": 3, "title": "Local Qwen Synthesis", "description": "Patch generated locally", "duration_s": 0.35, "tokens_saved": 0, "status": "completed"}
            ]),
            json.dumps([
                {
                    "filename": "services/jwt_validator.go",
                    "lines_added": 12,
                    "lines_deleted": 4,
                    "diff_text": """@@ -142,4 +142,12 @@
-	return jwt.ParseWithClaims(tokenStr, &claims, legacyKeyFunc)
+	// Ed25519 zero-trust verification key retriever
+	verifierKey := ed25519Verifier.GetSigningKey()
+	return jwt.ParseWithClaims(tokenStr, &claims, verifierKey)"""
                }
            ]),
            None,
            now - 3600
        )
    ]
    cursor.executemany("""
    INSERT INTO tasks (id, title, repo_id, branch, prompt, solution_summary, model_used, cascade_chain, is_confidential_routed, tokens_uncompressed, tokens_compressed, tokens_saved, compression_ratio, cost_billed_usd, cost_saved_usd, latency_ms, status, reasoning_steps, diffs, approval_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, tasks)

    conn.commit()

