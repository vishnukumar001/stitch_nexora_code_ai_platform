import time
from typing import Dict, Any, Tuple
from fastapi import HTTPException
from backend.app.db.database import get_connection
from backend.app.services.tokenizer_service import calculate_cost

class BudgetService:
    """
    Real-Time Financial Guardrails & Token Budget Enforcer.
    Tracks spend, enforces pre-flight limits BEFORE model execution,
    and prevents over-budget invocations.
    """

    @staticmethod
    def get_budget_policy(user_id: str = "usr_elena_01") -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM budget_policies WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return {
                "monthly_budget_usd": 1200.0,
                "current_spend_usd": 482.40,
                "monthly_token_cap": 45_000_000,
                "current_tokens_used": 14_820_000,
                "hard_limit_enforced": True,
                "auto_throttle_active": True,
                "alert_threshold_pct": 80.0,
                "runway_days": 18
            }

        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "monthly_budget_usd": float(row["monthly_budget_usd"]),
            "current_spend_usd": float(row["current_spend_usd"]),
            "monthly_token_cap": int(row["monthly_token_cap"]),
            "current_tokens_used": int(row["current_tokens_used"]),
            "hard_limit_enforced": bool(row["hard_limit_enforced"]),
            "auto_throttle_active": bool(row["auto_throttle_active"]),
            "alert_threshold_pct": float(row["alert_threshold_pct"]),
            "runway_days": int(row["runway_days"]),
            "budget_utilized_pct": round((float(row["current_spend_usd"]) / max(1.0, float(row["monthly_budget_usd"]))) * 100, 1),
            "tokens_utilized_pct": round((int(row["current_tokens_used"]) / max(1, int(row["monthly_token_cap"]))) * 100, 1)
        }

    @classmethod
    def validate_pre_flight_budget(
        cls,
        user_id: str,
        target_model: str,
        estimated_input_tokens: int,
        estimated_output_tokens: int = 500
    ) -> float:
        """
        Pre-flight check: Validates budget BEFORE allowing model call.
        Raises HTTPException(403) if invocation would exceed configured limit.
        Returns estimated cost.
        """
        budget = cls.get_budget_policy(user_id)
        est_cost = calculate_cost(target_model, estimated_input_tokens, estimated_output_tokens)

        # Budget hard cap check
        if budget["hard_limit_enforced"]:
            projected_spend = budget["current_spend_usd"] + est_cost
            if projected_spend > budget["monthly_budget_usd"]:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "BUDGET_CAP_EXCEEDED",
                        "message": f"Pre-flight spend check blocked execution: Projected spend ${projected_spend:.2f} exceeds monthly hard budget limit ${budget['monthly_budget_usd']:.2f}.",
                        "current_spend": budget["current_spend_usd"],
                        "hard_limit": budget["monthly_budget_usd"],
                        "estimated_cost": est_cost
                    }
                )

            # Token cap check
            projected_tokens = budget["current_tokens_used"] + estimated_input_tokens + estimated_output_tokens
            if projected_tokens > budget["monthly_token_cap"]:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "TOKEN_CAP_EXCEEDED",
                        "message": f"Pre-flight token check blocked execution: Projected usage {projected_tokens:,} tokens exceeds monthly token cap {budget['monthly_token_cap']:,}.",
                        "current_tokens": budget["current_tokens_used"],
                        "token_cap": budget["monthly_token_cap"]
                    }
                )

        return est_cost

    @classmethod
    def record_usage(
        cls,
        user_id: str,
        cost_billed_usd: float,
        tokens_consumed: int
    ) -> Dict[str, Any]:
        """
        Updates database after model execution to record actual billing and tokens.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE budget_policies
        SET current_spend_usd = current_spend_usd + ?,
            current_tokens_used = current_tokens_used + ?
        WHERE user_id = ?
        """, (cost_billed_usd, tokens_consumed, user_id))
        conn.commit()
        conn.close()

        return cls.get_budget_policy(user_id)
