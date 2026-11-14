# NEXORA Code — Empirical Token Benchmark & Efficiency Report

**Project:** NEXORA Code  
**Tagline:** *Code Smarter. Spend Fewer Tokens.*  
**Team:** TEAM ARISE  
**Hackathon:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — *Build a Coding Agent That Gets the Job Done on the Fewest Tokens*  
**Technology Partner:** Bifrost by Maxim AI  
**AI Provider:** Google Gemini API (`gemini-3.5-flash`)  
**Benchmark Suite:** `backend/benchmark/run_benchmark.py`  
**Measurement Standard:** OpenAI BPE Tokenizer (`tiktoken`, `cl100k_base` reference baseline)  
**Nature of Fixtures:** Curated representative multi-language benchmark files (not whole-repository production dumps)  

---

## 1. Executive Summary

Problem Statement 01 challenges teams to build an AI coding agent that completes genuine software engineering tasks while consuming the fewest possible tokens.

NEXORA Code addresses this challenge through a multi-tier token optimization architecture:
1. **AST-Aware Syntax Slicing (`ASTOptimizer`):** For Python, extracts AST function and class definitions; for Go, TypeScript, and Rust, applies heuristic structural scope slicing.
2. **Multi-Tier Model Cascade Routing (`ProviderRouter`):** Routes compressed contexts to cost-efficient models (Google Gemini 3.5 Flash at $0.075/1M input tokens vs GPT-4o at $2.50/1M input tokens).
3. **Semantic AST Caching (`SemanticCache`):** Reuses previously verified solutions for recurring tasks, resulting in 100% token savings (0 tokens billed, 0ms model latency).

---

## 2. Empirical Benchmark Results

The benchmark was executed using `python3 backend/benchmark/run_benchmark.py` across curated representative multi-language test fixtures (`backend/benchmark/fixtures/`).

### 2.1 Cold-Run Benchmark Results (Excluding Semantic Cache)

Cold-run benchmarks evaluate prompt context reduction when a task has not been cached:

| Benchmark Fixture | Language | Baseline Tokens (Raw Context) | Compact Tokens (AST Sliced) | Tokens Saved | Token Reduction (%) | Baseline Cost ($) [GPT-4o] | NEXORA Cost ($) [Gemini 3.5 Flash] | Cost Saved ($) |
|---|---|---|---|---|---|---|---|---|
| **CacheManager (`cache_service.go`)** | Go | 2,052 | 364 | 1,688 | **-82.26%** | $0.0073 | $0.000093 | $0.0072 |
| **Gateway Router (`gateway_router.ts`)** | TypeScript | 1,514 | 636 | 878 | **-57.99%** | $0.0060 | $0.000114 | $0.0059 |
| **Auth Session (`auth_service.py`)** | Python | 1,222 | 685 | 537 | **-43.94%** | $0.0053 | $0.000117 | $0.0051 |
| **COLD-RUN AGGREGATE TOTAL** | — | **4,788** | **1,685** | **3,103** | **-64.81%** | **$0.0186** | **$0.000324** | **$0.0182** |

$$\text{Total Baseline} = 2,052 + 1,514 + 1,222 = 4,788 \text{ tokens}$$
$$\text{Total Optimized} = 364 + 636 + 685 = 1,685 \text{ tokens}$$
$$\text{Total Cold-Run Savings} = 4,788 - 1,685 = 3,103 \text{ tokens}$$
$$\text{Aggregate Cold-Run Reduction} = \left(\frac{3,103}{4,788}\right) \times 100 = \mathbf{64.81\%}$$

### 2.2 Warm Cache Benchmark (Reported Separately)

Semantic Cache hits are evaluated on recurring or repeated tasks and are strictly reported separately from the cold-run aggregate:

| Task | Language | Baseline Tokens | Billed Tokens | Tokens Saved | Token Reduction (%) | Model Latency | Cost Billed |
|---|---|---|---|---|---|---|---|
| **Semantic Cache Hit (Repeated Query)** | Go / Any | 2,052 | **0** | **2,052** | **-100.00%** | **0ms** | **$0.0000** |

---

## 3. Mathematical Formulation & Savings Metrics

### 3.1 Token Savings Formula
$$\text{Tokens Saved} = \max(0, \text{Raw Tokens} - \text{Compressed Tokens})$$

$$\text{Compression Ratio (\%)} = \left(\frac{\text{Tokens Saved}}{\max(1, \text{Raw Tokens})}\right) \times 100$$

### 3.2 Distinguishing Context Compression vs. Actual Billed Usage

It is essential to distinguish between **AST Context Compression** and **Actual Provider Token Usage**:

1. **AST Context Compression (Pre-Flight Local Estimation):**
   * **Raw Context Tokens:** Number of tokens contained in the full, unpruned file or module dump.
   * **Compact Context Tokens:** Number of tokens sent to the LLM prompt after AST pruning and symbol slicing.
   * **Local Estimator:** Calculated using `tiktoken cl100k_base` as a standardized local reference baseline. (Note: `cl100k_base` is NOT Google's SentencePiece tokenizer; it is a reproducible local reference).
   * **Estimated Savings:** The percentage of input prompt tokens pruned before network dispatch.

2. **Actual Provider Usage (Post-Execution Truth):**
   * **Provider Input Tokens (`usageMetadata.promptTokenCount`):** Actual input prompt tokens counted by Google Gemini. Includes system instructions, context, and task prompt.
   * **Provider Output Tokens (`usageMetadata.candidatesTokenCount`):** Actual generated patch/diff tokens produced by the model.
   * **Actual Billed Tokens:** Sum of `promptTokenCount` + `candidatesTokenCount`.

NEXORA Code displays both values transparently in the workspace:
* **AST Context Compression:** Shows how much prompt bloat was eliminated.
* **Telemetry Badge:** Shows actual provider token counts and execution mode (`LIVE PROVIDER EXECUTION`).

---

## 4. Financial Impact Analysis & Enterprise Projections

### 4.1 Current Model Pricing Rates

| Model Tier | Provider | Input Cost / 1M Tokens | Output Cost / 1M Tokens | Source |
|---|---|---|---|---|
| **Frontier Baseline** | OpenAI GPT-4o | $2.50 | $10.00 | Official OpenAI API pricing |
| **Frontier Primary** | Anthropic Claude 3.7 Sonnet | $3.00 | $15.00 | Official Anthropic API pricing |
| **Fast-Path Secondary** | DeepSeek V3 | $0.14 | $0.28 | Official DeepSeek API pricing |
| **Primary Cloud Engine** | **Google Gemini 3.5 Flash** | **$0.075** | **$0.30** | Official Google AI Studio pricing (prompts $\le$ 128k) |
| **Local Air-Gapped** | Local Ollama (Qwen 2.5 Coder) | $0.00 | $0.00 | Local Hardware (Free) |

### 4.2 Hypothetical 10,000-Task Enterprise Projection

> **Disclaimer:** The following calculation is a **hypothetical projection** illustrating theoretical cost scaling for an engineering organization executing 10,000 coding tasks per month. It does not represent historical customer billing records.

**Assumptions:**
* Monthly tasks: 10,000 tasks.
* Average baseline context: 2,052 input tokens + 220 output tokens.
* NEXORA cold-run optimization: 722 compact input tokens (64.81% reduction) + 220 output tokens.

**Calculations:**
1. **Unoptimized Frontier Agent (GPT-4o Baseline):**
   * Input: $10,000 \times 2,052 = 20,520,000 \text{ tokens} \times \$2.50 / \text{M} = \$51.30$
   * Output: $10,000 \times 220 = 2,200,000 \text{ tokens} \times \$10.00 / \text{M} = \$22.00$
   * **Monthly Baseline Cost: \$73.30**

2. **NEXORA Code (AST Compression + Google Gemini 3.5 Flash):**
   * Input: $10,000 \times 722 = 7,220,000 \text{ tokens} \times \$0.075 / \text{M} = \$0.5415$
   * Output: $10,000 \times 220 = 2,200,000 \text{ tokens} \times \$0.30 / \text{M} = \$0.6600$
   * **Monthly NEXORA Cost: \$1.20**

3. **Projected Monthly Savings:**
   $$\$73.30 - \$1.20 = \mathbf{\$72.10 \text{ / month}} \quad (\mathbf{98.36\% \text{ cost reduction}})$$
   $$\text{Projected Annual Savings} = \$72.10 \times 12 = \mathbf{\$865.20 \text{ / year}}$$

---

## 5. Verification Command
To reproduce these benchmark numbers locally:
```bash
python3 backend/benchmark/run_benchmark.py
```
Benchmark outputs are persisted to `backend/benchmark/benchmark_results.json`.
