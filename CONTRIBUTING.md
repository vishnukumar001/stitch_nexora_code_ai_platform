# Contributing to NEXORA Code

Thank you for your interest in contributing to **NEXORA Code** (*Code Smarter. Spend Fewer Tokens.*), created by **TEAM ARISE** for the **Global AI Hackathon 2026 (Geek Room)**!

---

## 1. Development Principles

1. **Token Efficiency First (PS 01):** Every feature or PR must prioritize minimizing prompt tokens sent to LLMs. Unreferenced code, boilerplate, and dead imports must be pruned prior to model invocation.
2. **Zero-Trust Security:** Autonomous agents must never write to disk or modify Git trees without passing through an explicit human approval gate.
3. **Fail-Closed Privacy:** Confidential repositories must enforce local-only routing. If local models are unreachable, fail closed with HTTP 503 rather than leaking code to external cloud providers.
4. **Honest Attribution:** Never disguise direct model calls as gateway proxy calls or vice versa. Always preserve and surface upstream token usage metadata.

---

## 2. Setting Up Your Local Environment

### Prerequisites
* Python 3.12+
* Node.js 18+ and npm
* Git

### Quick Setup
```bash
# 1. Clone repository
git clone https://github.com/vishnukumar001/stitch_nexora_code_ai_platform.git
cd stitch_nexora_code_ai_platform

# 2. Copy environment template
cp .env.example .env

# 3. Launch unified application (installs dependencies, builds frontend, runs tests, starts server)
./start.sh
```

---

## 3. Running Tests

Before submitting any code changes, ensure all tests pass:

```bash
# Run all 102 regression tests in offline mode
NEXORA_TEST_MOCK_LLM=1 python3 -m unittest discover -s backend/tests

# Run live integration test suite
PYTHONPATH=. python3 -m unittest backend/tests/test_full_suite.py

# Verify frontend production build
cd frontend && npm run build
```

---

## 4. Coding Standards

* **Backend:** Follow PEP 8 guidelines. Use typing hints (`typing.Dict`, `typing.List`, `typing.Optional`) on all public function signatures.
* **Frontend:** Strict TypeScript types. Use TailwindCSS utility classes matching the design token system (`surface-container`, `primary`, `tertiary`).
* **Git Commits:** Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
