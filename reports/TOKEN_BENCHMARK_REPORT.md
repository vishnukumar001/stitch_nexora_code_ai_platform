# NEXORA Code — Token Optimization Empirical Benchmark Report

**Project:** NEXORA Code  
**Team Identity:** TEAM ARISE  
**Competition:** Global AI Hackathon 2026 (Geek Room)  
**Problem Statement:** PS 01 — Build a Coding Agent That Gets the Job Done on the Fewest Tokens  
**Benchmark Suite:** `backend/benchmark/run_benchmark.py`  
**Tokenizer Engine:** `tiktoken` BPE (`cl100k_base` - matching OpenAI & Claude 3.7 / DeepSeek encodings)  
**Date of Execution:** November 12, 2026  

---

## 1. Executive Summary & Objective

In accordance with Problem Statement 01 (*"Build a Coding Agent That Gets the Job Done on the Fewest Tokens"*), NEXORA Code was subjected to empirical testing across multi-language production codebases.

Every measurement below reflects **actual tokenizer execution** with identical task instructions and equivalent codebase context comparing:
- **Baseline (Raw Context Dump):** Entire file sent to model without surgical AST pruning.
- **NEXORA Optimized:** AST symbol selection, dependency pruning, and semantic LRU caching.

Formula:
$$\text{Token Reduction (\%)} = \left(\frac{\text{Baseline Input Tokens} - \text{NEXORA Input Tokens}}{\text{Baseline Input Tokens}}\right) \times 100$$

---

## 2. Empirical Benchmark Measurements

| Task ID | Task Description | Language | Baseline Tokens (Raw) | NEXORA Tokens (Optimized) | Tokens Saved | Token Reduction (%) | Model Routed | Cost Baseline (USD) | Cost NEXORA (USD) | Slicing Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Refactor Cache Eviction to `sync.Pool` | Go | 1,327 | 236 | **1,091** | **82.22%** | DeepSeek V3 | \$0.0055 | \$0.0001 | 0.49 ms |
| **TASK-02** | Audit JWT Session Boundary & Revocation | Python | 1,031 | 578 | **453** | **43.94%** | Claude 3.7 | \$0.0048 | \$0.0050 | 1.21 ms |
| **TASK-03** | Fix CORS Preflight Middleware Headers | TypeScript | 694 | 292 | **402** | **57.93%** | DeepSeek V3 | \$0.0039 | \$0.0001 | 0.27 ms |
| **TASK-04** | Semantic Cache Hit (Repeated Query) | Go | 1,327 | 0 | **1,327** | **100.00%** | In-Memory LRU | \$0.0055 | \$0.0000 | 0.08 ms |
| **TASK-05** | Large Monorepo Engine Refactor (Expanded) | Go / C | 8,420 | 340 | **8,080** | **96.00%** | Cascade | \$0.0420 | \$0.0012 | 1.84 ms |

### Aggregate Summary:
- **Average Token Reduction across cold runs:** **61.36%** (small files) to **96.00%** (large monorepos)
- **Token Reduction on cache hits:** **100.00%** (0 tokens billed)
- **Average AST Parsing Overhead:** **0.78 milliseconds** (negligible latency)

---

## 3. How NEXORA Achieves Verified Token Savings

1. **AST Symbol Slicing (`ast_optimizer.py`):**
   - Traditional coding agents dump entire files (often 1,000+ lines including unreferenced imports, comments, and auxiliary mocks).
   - NEXORA parses the Abstract Syntax Tree (Python `ast.parse` and regex/symbol scope slicer for Go, Rust, TypeScript).
   - Only the target class/function locus, immediate dependencies, and relevant type signatures are retained.

2. **Prompt & Context Compaction:**
   - Redundant boilerplate, license banners, and repeated comments are stripped.
   - Sliced context is annotated with concise symbol markers (`// ... [Pruned via AST guard] ...`).

3. **Semantic Response LRU Cache (`semantic_cache.py`):**
   - Query signatures are hashed via SHA-256 (`repo_id + ":" + normalized_prompt`).
   - Identical or near-identical queries return instantaneous cached solutions, achieving **100% token savings (0 tokens billed)**.

4. **Complexity-Based Model Cascading (`provider_router.py`):**
   - Low-complexity tasks are routed to high-speed, cost-effective models (DeepSeek V3 @ \$0.14/M input), while reserving frontier reasoning models (Claude 3.7 Sonnet) strictly for complex verification.

