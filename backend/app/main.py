import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.db.database import init_db
from backend.app.api.endpoints import router as api_router

# Initialize SQLite database schema and seed data
init_db()

app = FastAPI(
    title="NEXORA Code — Intelligent Token-Efficient AI Coding Agent Platform",
    description="Backend API for Global AI Hackathon 2026 PS 01: 'Build a Coding Agent That Gets the Job Done on the Fewest Tokens.'",
    version="3.4.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API endpoints
app.include_router(api_router, prefix="/api")

# Serve frontend build in production mode if dist directory exists
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../frontend/dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "platform": "NEXORA Code",
            "tagline": "Code Smarter. Spend Fewer Tokens.",
            "hackathon": "Global AI Hackathon 2026 — Geek Room",
            "problem_statement": "PS 01: Build a Coding Agent That Gets the Job Done on the Fewest Tokens",
            "docs_url": "/docs",
            "health_check": "/api/health"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
