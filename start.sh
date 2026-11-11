#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  NEXORA Code — Global AI Hackathon 2026 (Geek Room)"
echo "  PS 01: Coding Agent That Gets the Job Done on Fewest Tokens"
echo "  Tagline: Code Smarter. Spend Fewer Tokens."
echo "=========================================================="

# Ensure dependencies are available
echo "[1/3] Checking Python dependencies..."
python3 -c "import fastapi, uvicorn, tiktoken, httpx" || {
    echo "Installing backend dependencies..."
    python3 -m pip install fastapi uvicorn tiktoken httpx pydantic requests
}

# Run tests
echo "[2/3] Running verification test suite..."
PYTHONPATH=. python3 -m unittest backend/tests/test_full_suite.py

# Launch server
echo "[3/3] Starting NEXORA Code on http://localhost:8000 ..."
echo "API Docs available at: http://localhost:8000/docs"
echo "Press Ctrl+C to stop."

PYTHONPATH=. python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
