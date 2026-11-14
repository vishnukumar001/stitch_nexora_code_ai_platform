# NEXORA Code — Setup & Execution Guide

**Project:** NEXORA Code  
**Tagline:** *Code Smarter. Spend Fewer Tokens.*  
**Team:** TEAM ARISE  
**Hackathon:** Global AI Hackathon 2026 — Geek Room  
**Problem Statement:** PS 01 — *Build a Coding Agent That Gets the Job Done on the Fewest Tokens*  
**Technology Partner:** Bifrost by Maxim AI  
**AI Provider:** Google Gemini API (`gemini-3.5-flash`) through Bifrost by Maxim AI  

---

## 1. System Requirements

* **Operating System:** macOS (Apple Silicon / Intel), Linux (Ubuntu 20.04+), or Windows 11 (WSL2 recommended).
* **Python:** 3.10, 3.11, 3.12, or 3.13.
* **Node.js:** 18.0.0 or higher (v20+ LTS recommended).
* **Package Managers:** `pip` (Python), `npm` (Node.js).
* **Optional Local Model Daemon:** [Ollama](https://ollama.ai) with `qwen2.5-coder:14b` for 100% offline air-gapped confidential mode.

---

## 2. Repository & Environment Setup

### 2.1 Clone and Enter Directory
```bash
cd stitch_nexora_code_ai_platform
```

### 2.2 Configure Environment Variables
Copy `.env.example` to `.env` (and optionally `backend/.env`):
```bash
cp .env.example .env
```

Configure your credentials in `.env`:
```env
# AI Provider: Google Gemini API (via Bifrost by Maxim AI)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# Technology Partner: Bifrost Gateway by Maxim AI
BIFROST_BASE_URL=https://api.maxim.ai/bifrost/v1
BIFROST_API_KEY=

# Local Privacy Engine (Air-Gapped Confidential Repositories)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:14b

# Test execution flag (set to 1 to bypass paid API calls in automated test suites)
NEXORA_TEST_MOCK_LLM=1
```

> **Security Note:** `.env` and `*.env` files are strictly excluded in `.gitignore`. Never commit API keys or secret credentials to Git.

---

## 3. Dependency Installation

### 3.1 Backend Dependencies
Install the required Python packages:
```bash
pip install -r backend/requirements.txt
```

Key packages installed:
* `fastapi` — High-performance API framework.
* `uvicorn[standard]` — ASGI server.
* `pydantic` — Data validation and settings management.
* `httpx` — Asynchronous and synchronous HTTP client for provider routing.
* `tiktoken` — OpenAI BPE tokenizer for exact mathematical token counting.
* `python-dotenv` — Secure environment loading.

### 3.2 Frontend Dependencies
Install the frontend React dependencies:
```bash
cd frontend
npm install
cd ..
```

Key frontend packages:
* `react`, `react-dom` (v18.3.1)
* `vite` (v5.4.21)
* `tailwindcss` (v3.4.15)
* `lucide-react` (iconography)

---

## 4. Running the Application

### 4.1 Start the FastAPI Backend
From the repository root:
```bash
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend API root: `http://127.0.0.1:8000`
* Interactive API Docs (Swagger): `http://127.0.0.1:8000/docs`
* OpenAPI JSON Specification: `http://127.0.0.1:8000/openapi.json`

### 4.2 Start the React Frontend
In a separate terminal window:
```bash
cd frontend
npm run dev
```
* Frontend Dashboard: `http://localhost:5173`

The frontend automatically proxies `/api` calls to the FastAPI backend running on port 8000.

---

## 5. Running Automated Verification Suites

### 5.1 Run Complete Backend Unit & Security Test Suite
NEXORA Code includes 41 comprehensive backend unit, security, and integration tests:
```bash
NEXORA_TEST_MOCK_LLM=1 PYTHONPATH=. python3 -m unittest discover backend/tests
```
**Expected Outcome:**
```
Ran 41 tests in ~0.7s
OK (41/41 passing, 100%)
```

### 5.2 Run Sandbox Security Tests Individually
```bash
PYTHONPATH=. python3 -m unittest backend/tests/test_sandbox_security.py
```
**Tests verified:**
1. Valid relative path modification inside sandbox.
2. Parent traversal (`../../`) rejection.
3. Absolute path outside sandbox rejection.
4. Deeply nested traversal rejection.
5. Symlink escape rejection.
6. Valid nested sandbox directory creation and modification.
7. Safe containment check (`os.path.commonpath`).
8. Patch staging verification.

### 5.3 Run Provider Routing & Gemini Mock Tests
```bash
PYTHONPATH=. python3 -m unittest backend/tests/test_gemini_live_and_mock.py
```

### 5.4 Run Empirical Token Optimization Benchmark
Measure actual AST context reduction across Go, TypeScript, Python, and Semantic Cache:
```bash
python3 backend/benchmark/run_benchmark.py
```
**Empirical Results:**
* **Go CacheManager:** -82.26% reduction (2,052 tokens -> 364 tokens)
* **TypeScript Gateway Router:** -57.99% reduction (1,514 tokens -> 636 tokens)
* **Python Auth Service:** -43.94% reduction (1,222 tokens -> 685 tokens)
* **Cold-Run Aggregate Total:** **-64.81% reduction** (4,788 baseline -> 1,685 compact tokens, 3,103 tokens saved)
* **Semantic AST Cache (Warm Repeat):** 100% reduction (0 tokens billed, 0ms model latency, reported separately)

### 5.5 Build Frontend for Production
Verify production bundle compilation:
```bash
cd frontend && npm run build
```
**Expected Outcome:**
```
✓ built in ~530ms (0 errors, 0 warnings)
```

---

## 6. Live AI Demonstration (Judge Walkthrough)

To execute a genuine end-to-end coding task using live Google Gemini API via Bifrost:

1. Open `http://localhost:5173` in your browser.
2. Ensure `GEMINI_API_KEY` is present in `.env`.
3. Navigate to **New Coding Task** (Workspace).
4. Select `repo-core` (`prod-core-monorepo`).
5. Enter instruction:
   ```
   Add sync.Pool buffer allocation reuse to CacheManager in cache_manager.go to eliminate allocations
   ```
6. Click **Analyze Task**: Observe AST token reduction (e.g. ~589 raw tokens pruned to ~162 tokens, ~72.5% savings).
7. Click **Execute Task**:
   - The cascade router dispatches a live prompt to `prov-gemini` (`gemini-3.5-flash`).
   - Observe **LIVE PROVIDER EXECUTION** badge with actual prompt and candidate tokens.
   - Unified diff preview renders in real time.
8. The task enters **Step 8: Action Approval Required** (Human-in-the-Loop Safe Mode).
9. Click **Approve & Apply**:
   - Patch is validated and confined to `backend/sandboxes/nx-sandbox-849`.
   - Sandbox verification tests run (5/5 passing).
   - Real Git commit is created with SHA-256 cryptographic audit digest.

