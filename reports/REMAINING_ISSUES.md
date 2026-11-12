# NEXORA Code — Known Limitations & Remaining Work

**Project:** NEXORA Code  
**Team Identity:** TEAM ARISE  
**Competition:** Global AI Hackathon 2026 (Geek Room)  
**Problem Statement:** PS 01 — Build a Coding Agent That Gets the Job Done on the Fewest Tokens  
**Date of Audit:** November 12, 2026  

---

## 1. Known Technical Limitations

1. **Live Cloud API Keys Dependency:**
   - The platform includes complete, tested HTTP routing for Claude 3.7 Sonnet, DeepSeek V3, OpenAI GPT-4o, and Bifrost by Maxim AI.
   - For live end-to-end cloud generation without simulation, valid API keys (`BIFROST_API_KEY`, `ANTHROPIC_API_KEY`, etc.) must be entered in the **Settings Vault** or set in the local environment. When keys are absent, the platform safely flags the provider as `Not Configured` or operates in deterministic sandbox synthesis mode.

2. **Local Ollama Daemon on Host Machine:**
   - Zero-Egress Air-Gap privacy enforcement relies on a locally reachable Ollama daemon running on `http://localhost:11434` with the `qwen2.5-coder:14b` model.
   - If the daemon is not running on the evaluator's machine, the platform enforces safety by blocking execution with `HTTP 503` rather than leaking code to cloud providers. Evaluators should run `ollama serve` prior to testing live offline local inference.

3. **AST Grammar Coverage:**
   - Full Abstract Syntax Tree traversal and node regeneration is natively implemented using Python's `ast` standard library for Python codebases.
   - Go, TypeScript, and Rust codebases use NEXORA's universal lexical scope slicer. Integrating native WebAssembly Tree-sitter grammars will expand syntactic slicing to niche languages (e.g. Zig, Erlang).

4. **Approval Quorum Topology:**
   - The current action approval gate requires single-reviewer authorization (`TEAM ARISE`).
   - The database schema supports `multi_party_quorum_authorization` (as designed in Stitch Screen 9), which can be toggled on for multi-developer enterprise deployments.

---

## 2. Recommended Next Steps for Team Arise

1. **Pitch Deck / Presentation Alignment:**
   - Emphasize the empirical **61%–96% token reduction** numbers from `reports/TOKEN_BENCHMARK_REPORT.md` in the hackathon presentation deck.
   - Highlight the **Zero-Egress Air-Gap Invariant** proving confidential repos never touch remote cloud APIs.
2. **Hackathon Live Demo Rehearsal:**
   - Demonstrate the 9-step workflow starting from `http://localhost:8000`.
   - Show the simulated failover test in Settings to illustrate automatic circuit breaker protection.
   - Engage the Emergency Kill Switch live to demonstrate security containment.
