# NEXORA Code — Data Integrity & Telemetry Provenance Report

**Project:** NEXORA Code  
**Team Identity:** TEAM ARISE  
**Competition:** Global AI Hackathon 2026 (Geek Room)  
**Problem Statement:** PS 01 — Build a Coding Agent That Gets the Job Done on the Fewest Tokens  
**Date of Audit:** November 12, 2026  

---

## 1. Metric Audit & Provenance Matrix

Every numerical value displayed on the NEXORA Code dashboard and analytics views is strictly audited below:

| Displayed Metric | Backend Endpoint | Database Table & Columns | Calculation Method | Data Provenance |
| :--- | :--- | :--- | :--- | :--- |
| **Today's Token Usage** | `GET /api/dashboard` (`kpis.tokens_consumed`) | `tasks.tokens_compressed` (where `is_demo = 0`) | `SUM(tokens_compressed)` measured via `tiktoken` BPE | **Real Execution** (If 0 live runs, explicitly labeled `14.8k (Seed)`) |
| **Gross Tokens Saved** | `GET /api/dashboard` (`kpis.token_savings`) | `tasks.tokens_saved` (where `is_demo = 0`) | `SUM(tokens_saved)` = `SUM(tokens_uncompressed - tokens_compressed)` | **Real Execution** (If 0 live runs, explicitly labeled `80.8k (Seed)`) |
| **AST Reduction Ratio** | `GET /api/dashboard` (`kpis.token_savings_pct`) | `tasks` table live rows | `(live_saved / (live_consumed + live_saved)) * 100` | **Real Execution** (Calculated dynamically) |
| **Current Spend (USD)** | `GET /api/dashboard` (`kpis.current_spend_usd`) | `budget_policies.current_spend_usd` | Incremented by `calculate_cost(model, in_tok, out_tok)` | **Real Database Value** |
| **Budget Limit (USD)** | `GET /api/dashboard` (`kpis.budget_cap_usd`) | `budget_policies.monthly_budget_usd` | Configurable user limit set via `PUT /api/budget` | **Real Database Value** |
| **Provider Health** | `GET /api/dashboard` (`providers`) | `providers` table (`status`, `latency_ms`, `circuit_breaker_tripped`) | Updated via live network probe or failure counter (`>= 3` trips) | **Real State Machine** (`connected`, `disconnected`, `degraded`, `not_configured`) |
| **Recent Tasks Table** | `GET /api/dashboard` (`recent_activities`) | `tasks` table (`id`, `title`, `diffs`, `tokens_saved`, `is_demo`) | Ordered by `created_at DESC LIMIT 6` | **Tagged with DEMO DATA or LIVE EXECUTION badges** |

---

## 2. Elimination of Fabricated Data

1. **Database Column Migration (`is_demo`):**
   - The SQLite database schema has been migrated to include `is_demo INTEGER NOT NULL DEFAULT 0` on the `tasks` table.
   - The initial seed tasks imported from the design screens are explicitly marked with `is_demo = 1`.
   - Every coding agent task invoked through the platform (`POST /api/tasks/execute`) is recorded with `is_demo = 0`.

2. **Frontend Provenance Badges:**
   - On the **Main Dashboard** (`DashboardView.tsx`) and **Task History** (`TaskHistoryView.tsx`), each task row displays a clear visual badge:
     - `DEMO DATA` (in gray/amber outline): For seeded design reference tasks.
     - `LIVE EXECUTION` (in vibrant emerald/tertiary): For genuine agent runs executed by the user.

3. **Dynamic KPI Recalculation:**
   - If no live tasks have executed yet, the dashboard KPI card displays:
     - Today's Token Usage: `14.8k (Seed)`
     - Provenance pill: `DEMO SEED`
   - As soon as a user runs an actual coding task, the dashboard automatically recalculates:
     - Live tokens consumed: e.g. `236 tok`
     - Live tokens saved: e.g. `1,091 tok`
     - Provenance pill: `LIVE METRICS`

4. **Action Approval & Git Commit Truthfulness:**
   - A task is never marked as `Approved & Merged` until an explicit HTTP POST request to `/api/approvals/{id}/resolve` with `{"decision": "approved"}` is completed.
   - If an action is rejected, the status changes to `Rejected & Reverted`, and no code changes are staged.

