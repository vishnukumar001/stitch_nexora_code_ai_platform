#!/usr/bin/env bash
# ==============================================================================
# NEXORA Code — Unified Startup Script
# Global AI Hackathon 2026 — Geek Room | PS 01
# ==============================================================================
set -e

echo "=========================================================="
echo "  NEXORA Code — Global AI Hackathon 2026 (Geek Room)"
echo "  PS 01: Coding Agent That Gets the Job Done on Fewest Tokens"
echo "  Tagline: Code Smarter. Spend Fewer Tokens."
echo "=========================================================="

# 1. Check Python dependencies
echo "[1/4] Checking Python backend dependencies..."
python3 -c "import fastapi, uvicorn, tiktoken, httpx, dotenv" 2>/dev/null || {
    echo "Installing backend dependencies from backend/requirements.txt..."
    python3 -m pip install -r backend/requirements.txt
}

# 2. Build production frontend assets if missing
if [ ! -d "frontend/dist" ] || [ ! -f "frontend/dist/index.html" ]; then
    echo "[2/4] Building production frontend cockpit..."
    (cd frontend && npm install && npm run build)
else
    echo "[2/4] Production frontend build verified in frontend/dist."
fi

# 3. Run regression test suite in test-safe mode
echo "[3/4] Running automated test verification..."
NEXORA_TEST_MOCK_LLM=1 PYTHONPATH=. python3 -m unittest discover -s backend/tests

# 4. Launch unified server
PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

echo "[4/4] Starting NEXORA Code unified server on http://localhost:${PORT} ..."
echo "Cockpit UI available at: http://localhost:${PORT}"
echo "API Documentation at:    http://localhost:${PORT}/docs"
echo "Health Check at:         http://localhost:${PORT}/api/health"
echo "Press Ctrl+C to stop."

PYTHONPATH=. python3 -m uvicorn backend.app.main:app --host "$HOST" --port "$PORT"
