# ==============================================================================
# NEXORA Code — Production Container Multi-Stage Dockerfile
# Global AI Hackathon 2026 — Geek Room | PS 01
# ==============================================================================

# Stage 1: Build production React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python runtime
FROM python:3.12-slim AS runner
WORKDIR /app

# Install system dependencies (git is needed for sandbox operations)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy application backend, benchmark fixtures, and startup scripts
COPY backend ./backend
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Copy compiled frontend distribution from Stage 1
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Configure environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV PYTHONPATH=/app

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Launch unified server
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
