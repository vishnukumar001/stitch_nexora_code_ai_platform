# NEXORA Code — Production Deployment Guide

**Project:** NEXORA Code — *Code Smarter. Spend Fewer Tokens.*  
**Team Identity:** TEAM ARISE  
**Competition:** Global AI Hackathon 2026 — Geek Room (PS 01)  
**Architecture:** Unified Single-Port Full-Stack Deployment (FastAPI + React/Vite Static Mount)  

---

## 1. Production Architecture Overview

NEXORA Code is designed for zero-friction full-stack deployment. Rather than requiring distinct hosting domains and managing CORS between separate frontend and backend deployments, NEXORA Code compiles the React frontend into static production assets (`frontend/dist`) and mounts them directly on root (`/`) within FastAPI.

```
Internet / Client Requests
           │
           ▼ (Port 8000 / $PORT)
  FastAPI Unified Server
     ├──► /api/*          ──► Backend Endpoints, AST Engine, Provider Router
     ├──► /docs           ──► Interactive OpenAPI / Swagger Documentation
     └──► /*              ──► Static React Cockpit UI (frontend/dist/index.html)
```

### Key Advantages:
1. **Zero CORS Friction:** Frontend calls use relative pathing (`/api/tasks/analyze`), avoiding cross-origin preflight latency and CORS misconfigurations.
2. **Atomic Upgrades:** Deploying a container updates frontend code, backend endpoints, and SQLite schema simultaneously.
3. **Single Port:** Works out-of-the-box on platforms that assign a dynamic `$PORT` (Render, Railway, Fly.io, Heroku, AWS App Runner).

---

## 2. Environment Variables Configuration

Configure the following variables in your hosting provider's secure dashboard:

| Variable | Description | Required? | Default / Example |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio Gemini API Key | **Yes** (for live AI) | `AIzaSy...` |
| `GEMINI_MODEL` | Target Google Gemini model identifier | No | `gemini-3.5-flash` |
| `BIFROST_API_KEY` | Maxim AI Bifrost Gateway API Key | Optional | `bifrost-...` |
| `BIFROST_BASE_URL` | Maxim AI Bifrost Gateway endpoint URL | Optional | `https://api.maxim.ai/bifrost/v1` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key for secondary failover | Optional | `sk-...` |
| `OLLAMA_HOST` | Local Ollama endpoint for confidential mode | Optional | `http://localhost:11434` |
| `PORT` | Server listening port | No | `8000` (auto-assigned by host) |
| `HOST` | Server bind host address | No | `0.0.0.0` |

> [!CAUTION]
> **Credential Protection:**
> Never commit real API keys into version control. Set them strictly via the hosting provider's environment variables console.

---

## 3. Deployment Options

### Option A: Turnkey Docker Deployment (Recommended)
The multi-stage `Dockerfile` handles installing Node dependencies, compiling the React bundle, installing Python requirements, and launching the unified server.

```bash
# 1. Build Docker image
docker build -t nexora-code:latest .

# 2. Run container with persistent volume for SQLite
docker run -d \
  --name nexora-code \
  -p 8000:8000 \
  -e GEMINI_API_KEY="your-gemini-key" \
  -v nexora-data:/app/backend/app/db \
  nexora-code:latest

# 3. Verify health
curl http://localhost:8000/api/health
```

---

### Option B: Deploying to Render

Render provides one-click repository deployment using the included `render.yaml`:

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository: `stitch_nexora_code_ai_platform`.
4. Render will parse `render.yaml` and configure:
   - Environment: `docker`
   - Health Check Path: `/api/health`
   - Persistent Disk: `1 GB` mounted at `/app/backend/app/db` (preserves SQLite between deploys).
5. Add `GEMINI_API_KEY` under the service's **Environment** tab.
6. Click **Apply Blueprint** to launch.

---

### Option C: Deploying to Railway

Railway natively detects the `Dockerfile` and `railway.toml`:

1. Log in to [Railway](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select `stitch_nexora_code_ai_platform`.
4. Under **Variables**, add:
   - `GEMINI_API_KEY`
5. Under **Volumes**, add a persistent volume mounted to `/app/backend/app/db`.
6. Railway automatically deploys and assigns an active HTTPS domain.

---

## 4. Database Persistence (SQLite)

* **Location:** `backend/app/db/nexora.db`.
* **Important:** Containers on Render and Railway have ephemeral filesystems by default. To preserve user budgets, approval audit receipts, and task histories across restarts, you **must attach a persistent volume** mounted to `/app/backend/app/db`.
* If a persistent volume is omitted, the application will initialize a fresh database upon every container restart via `init_db()`.

---

## 5. Post-Deployment Verification Checklist

Verify your production deployment with these steps:
- [ ] **1. Health Check:** Request `https://<your-app-domain>/api/health` — must return HTTP 200 with `status: "healthy"`.
- [ ] **2. Web Cockpit:** Open `https://<your-app-domain>/` in browser — must render the dark-themed cockpit UI.
- [ ] **3. OpenAPI Docs:** Open `https://<your-app-domain>/docs` — must show interactive Swagger UI.
- [ ] **4. Context Slicing Test:** Run a test task in the Workspace — must slice AST context and calculate token savings.
- [ ] **5. Action Gate Test:** Approve an AI patch — must apply to the path-confined sandbox and execute tests.
