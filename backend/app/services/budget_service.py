import time
import uuid
import threading
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Tuple, Optional
from fastapi import HTTPException
from backend.app.db.database import get_connection
from backend.app.services.tokenizer_service import calculate_cost

PRECISION = Decimal("0.000001")
_budget_lock = threading.Lock()

def to_decimal(val: Any) -> Decimal:
    """Safely converts numerical input into Decimal with exact precision."""
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val))

def quantize_usd(amount: Any) -> Decimal:
    """Quantizes monetary values to 6 decimal places (micro-USD)."""
    return to_decimal(amount).quantize(PRECISION, rounding=ROUND_HALF_UP)

class BudgetService:
    """
    Real-Time Financial Guardrails & Per-User Token Budget Enforcer.
    Tracks spend, enforces pre-flight limits BEFORE model execution,
    atomically reserves budgets to prevent concurrency race conditions,
    and isolates budget policies across distinct users.
    """

    @staticmethod
    def get_budget_policy(user_id: str = "usr_team_arise_01") -> Dict[str, Any]:
        """
        Retrieves user-specific budget policy from SQLite.
        If user does not exist, provisions a dedicated isolated policy.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM budget_policies WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()

        if not row:
            # Auto-provision dedicated, isolated budget policy for new user
            new_id = f"bgt_{user_id}_{uuid.uuid4().hex[:6]}"
            cursor.execute("""
            INSERT INTO budget_policies (
                id, user_id, monthly_budget_usd, current_spend_usd,
                monthly_token_cap, current_tokens_used, hard_limit_enforced,
                auto_throttle_active, alert_threshold_pct, runway_days,
                reserved_spend_usd, reserved_tokens
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_id, user_id, 1200.0, 0.0,
                45_000_000, 0, 1,
                1, 80.0, 30,
                0.0, 0
            ))
            conn.commit()
            cursor.execute("SELECT * FROM budget_policies WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()

        conn.close()

        monthly_budget = quantize_usd(row["monthly_budget_usd"])
        current_spend = quantize_usd(row["current_spend_usd"])
        reserved_spend = quantize_usd(row["reserved_spend_usd"] or 0.0)
        monthly_tokens = int(row["monthly_token_cap"])
        current_tokens = int(row["current_tokens_used"])
        reserved_tokens = int(row["reserved_tokens"] or 0)

        effective_spend = quantize_usd(current_spend + reserved_spend)
        effective_tokens = current_tokens + reserved_tokens

        budget_utilized_pct = float(
            ((effective_spend / max(Decimal("1.0"), monthly_budget)) * Decimal("100")).quantize(
                Decimal("0.1"), rounding=ROUND_HALF_UP
            )
        )
        tokens_utilized_pct = round((effective_tokens / max(1, monthly_tokens)) * 100, 1)

        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "monthly_budget_usd": float(monthly_budget),
            "current_spend_usd": float(current_spend),
            "reserved_spend_usd": float(reserved_spend),
            "monthly_token_cap": monthly_tokens,
            "current_tokens_used": current_tokens,
            "reserved_tokens": reserved_tokens,
            "hard_limit_enforced": bool(row["hard_limit_enforced"]),
            "auto_throttle_active": bool(row["auto_throttle_active"]),
            "alert_threshold_pct": float(row["alert_threshold_pct"]),
            "runway_days": int(row["runway_days"]),
            "budget_utilized_pct": budget_utilized_pct,
            "tokens_utilized_pct": tokens_utilized_pct
        }

    @classmethod
    def update_budget_policy(
        cls,
        user_id: str,
        monthly_budget_usd: Optional[float] = None,
        current_spend_usd: Optional[float] = None,
        monthly_token_cap: Optional[int] = None,
        current_tokens_used: Optional[int] = None,
        hard_limit_enforced: Optional[bool] = None,
        auto_throttle_active: Optional[bool] = None,
        alert_threshold_pct: Optional[float] = None
    ) -> Dict[str, Any]:
        """Provisions or updates a user-specific budget policy."""
        cls.get_budget_policy(user_id)
        updates = []
        params = []
        if monthly_budget_usd is not None:
            updates.append("monthly_budget_usd = ?")
            params.append(float(monthly_budget_usd))
        if current_spend_usd is not None:
            updates.append("current_spend_usd = ?")
            params.append(float(current_spend_usd))
        if monthly_token_cap is not None:
            updates.append("monthly_token_cap = ?")
            params.append(int(monthly_token_cap))
        if current_tokens_used is not None:
            updates.append("current_tokens_used = ?")
            params.append(int(current_tokens_used))
        if hard_limit_enforced is not None:
            updates.append("hard_limit_enforced = ?")
            params.append(1 if hard_limit_enforced else 0)
        if auto_throttle_active is not None:
            updates.append("auto_throttle_active = ?")
            params.append(1 if auto_throttle_active else 0)
        if alert_threshold_pct is not None:
            updates.append("alert_threshold_pct = ?")
            params.append(float(alert_threshold_pct))

        if updates:
            conn = get_connection()
            cursor = conn.cursor()
            params.append(user_id)
            cursor.execute(f"UPDATE budget_policies SET {', '.join(updates)} WHERE user_id = ?", tuple(params))
            conn.commit()
            conn.close()

        return cls.get_budget_policy(user_id)

    @classmethod
    def validate_pre_flight_budget(
        cls,
        user_id: str,
        target_model: str,
        estimated_input_tokens: int,
        estimated_output_tokens: int = 500
    ) -> float:
        """
        Pre-flight check: Validates budget BEFORE allowing model call using Decimal precision.
        Raises HTTPException(403) if invocation would exceed configured limit.
        Returns estimated cost as float.
        """
        with _budget_lock:
            budget = cls.get_budget_policy(user_id)
            est_cost_raw = calculate_cost(target_model, estimated_input_tokens, estimated_output_tokens)
            est_cost = quantize_usd(est_cost_raw)

            if budget["hard_limit_enforced"]:
                current_spend = to_decimal(budget["current_spend_usd"])
                reserved_spend = to_decimal(budget["reserved_spend_usd"])
                monthly_limit = to_decimal(budget["monthly_budget_usd"])

                projected_spend = current_spend + reserved_spend + est_cost
                if projected_spend > monthly_limit:
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "error": "BUDGET_CAP_EXCEEDED",
                            "message": (
                                f"Pre-flight spend check blocked execution: "
                                f"Projected spend ${float(projected_spend):.4f} exceeds monthly hard budget limit "
                                f"${float(monthly_limit):.2f}."
                            ),
                            "current_spend": float(current_spend),
                            "reserved_spend": float(reserved_spend),
                            "hard_limit": float(monthly_limit),
                            "estimated_cost": float(est_cost)
                        }
                    )

                projected_tokens = (
                    budget["current_tokens_used"] +
                    budget["reserved_tokens"] +
                    estimated_input_tokens +
                    estimated_output_tokens
                )
                if projected_tokens > budget["monthly_token_cap"]:
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "error": "TOKEN_CAP_EXCEEDED",
                            "message": (
                                f"Pre-flight token check blocked execution: "
                                f"Projected usage {projected_tokens:,} tokens exceeds monthly token cap "
                                f"{budget['monthly_token_cap']:,}."
                            ),
                            "current_tokens": budget["current_tokens_used"],
                            "reserved_tokens": budget["reserved_tokens"],
                            "token_cap": budget["monthly_token_cap"]
                        }
                    )

            return float(est_cost)

    @classmethod
    def reserve_budget(
        cls,
        user_id: str,
        target_model: str = "gemini-2.5-flash",
        estimated_input_tokens: Optional[int] = None,
        estimated_output_tokens: int = 500,
        reservation_id: Optional[str] = None,
        estimated_tokens: Optional[int] = None,
        estimated_cost_usd: Optional[float] = None
    ) -> Tuple[str, float]:
        """
        Thread-safe, atomic budget reservation.
        Checks budget and locks the estimated spend before dispatching tasks to AI providers.
        Prevents concurrent requests from blowing past the hard ceiling.
        Returns: (reservation_id, estimated_cost_usd)
        """
        if estimated_input_tokens is None:
            if estimated_tokens is not None:
                estimated_input_tokens = int(estimated_tokens)
                estimated_output_tokens = 0
            else:
                estimated_input_tokens = 1000

        with _budget_lock:
            # 1. Validate policy and compute cost using Decimal
            budget = cls.get_budget_policy(user_id)
            if estimated_cost_usd is not None:
                est_cost = quantize_usd(estimated_cost_usd)
            else:
                est_cost_raw = calculate_cost(target_model, estimated_input_tokens, estimated_output_tokens)
                est_cost = quantize_usd(est_cost_raw)
            total_est_tokens = estimated_input_tokens + estimated_output_tokens

            if budget["hard_limit_enforced"]:
                current_spend = to_decimal(budget["current_spend_usd"])
                reserved_spend = to_decimal(budget["reserved_spend_usd"])
                monthly_limit = to_decimal(budget["monthly_budget_usd"])

                projected_spend = current_spend + reserved_spend + est_cost
                if projected_spend > monthly_limit:
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "error": "BUDGET_CAP_EXCEEDED",
                            "message": (
                                f"Atomic budget reservation blocked execution: "
                                f"Projected spend ${float(projected_spend):.4f} exceeds monthly hard budget limit "
                                f"${float(monthly_limit):.2f}."
                            ),
                            "current_spend": float(current_spend),
                            "reserved_spend": float(reserved_spend),
                            "hard_limit": float(monthly_limit),
                            "estimated_cost": float(est_cost)
                        }
                    )

                projected_tokens = (
                    budget["current_tokens_used"] +
                    budget["reserved_tokens"] +
                    total_est_tokens
                )
                if projected_tokens > budget["monthly_token_cap"]:
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "error": "TOKEN_CAP_EXCEEDED",
                            "message": (
                                f"Atomic budget reservation blocked execution: "
                                f"Projected usage {projected_tokens:,} tokens exceeds monthly cap "
                                f"{budget['monthly_token_cap']:,}."
                            ),
                            "current_tokens": budget["current_tokens_used"],
                            "reserved_tokens": budget["reserved_tokens"],
                            "token_cap": budget["monthly_token_cap"]
                        }
                    )

            res_id = reservation_id or f"resv-{int(time.time()*1000)}-{uuid.uuid4().hex[:8]}"

            conn = get_connection()
            cursor = conn.cursor()

            # Record reservation entry
            cursor.execute("""
            INSERT INTO budget_reservations (id, user_id, reserved_cost_usd, reserved_tokens, status, created_at)
            VALUES (?, ?, ?, ?, 'active', ?)
            """, (res_id, user_id, float(est_cost), total_est_tokens, time.time()))

            # Update reserved amounts on user policy
            cursor.execute("""
            UPDATE budget_policies
            SET reserved_spend_usd = reserved_spend_usd + ?,
                reserved_tokens = reserved_tokens + ?
            WHERE user_id = ?
            """, (float(est_cost), total_est_tokens, user_id))

            conn.commit()
            conn.close()

            return res_id, float(est_cost)

    @classmethod
    def reconcile_reservation(
        cls,
        reservation_id: str,
        user_id: str,
        actual_cost_usd: float,
        actual_tokens: int
    ) -> Dict[str, Any]:
        """
        Reconciles active reservation upon successful task completion.
        Releases reserved funds and records actual usage using Decimal precision.
        """
        with _budget_lock:
            conn = get_connection()
            cursor = conn.cursor()

            cursor.execute("""
            SELECT reserved_cost_usd, reserved_tokens, status
            FROM budget_reservations
            WHERE id = ? AND user_id = ?
            """, (reservation_id, user_id))
            res = cursor.fetchone()

            if not res or res["status"] != "active":
                conn.close()
                return cls.get_budget_policy(user_id)

            reserved_cost = quantize_usd(res["reserved_cost_usd"])
            reserved_tokens = int(res["reserved_tokens"])
            actual_cost = quantize_usd(actual_cost_usd)

            # Mark reservation reconciled
            cursor.execute("""
            UPDATE budget_reservations
            SET status = 'reconciled', reconciled_at = ?
            WHERE id = ?
            """, (time.time(), reservation_id))

            # Fetch current policy to perform exact decimal arithmetic
            cursor.execute("SELECT current_spend_usd, reserved_spend_usd, current_tokens_used, reserved_tokens FROM budget_policies WHERE user_id = ?", (user_id,))
            p_row = cursor.fetchone()
            if p_row:
                cur_spend = quantize_usd(p_row["current_spend_usd"])
                cur_resv = quantize_usd(p_row["reserved_spend_usd"] or 0.0)
                new_spend = quantize_usd(cur_spend + actual_cost)
                new_resv = quantize_usd(max(Decimal("0.0"), cur_resv - reserved_cost))
                new_tokens = int(p_row["current_tokens_used"]) + int(actual_tokens)
                new_resv_tokens = max(0, int(p_row["reserved_tokens"] or 0) - reserved_tokens)

                cursor.execute("""
                UPDATE budget_policies
                SET reserved_spend_usd = ?,
                    reserved_tokens = ?,
                    current_spend_usd = ?,
                    current_tokens_used = ?
                WHERE user_id = ?
                """, (float(new_resv), new_resv_tokens, float(new_spend), new_tokens, user_id))

            conn.commit()
            conn.close()

            return cls.get_budget_policy(user_id)

    @classmethod
    def release_reservation(
        cls,
        reservation_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Releases active reservation if task execution fails or times out.
        Prevents phantom charges and leaves the budget intact.
        """
        with _budget_lock:
            conn = get_connection()
            cursor = conn.cursor()

            cursor.execute("""
            SELECT reserved_cost_usd, reserved_tokens, status
            FROM budget_reservations
            WHERE id = ? AND user_id = ?
            """, (reservation_id, user_id))
            res = cursor.fetchone()

            if not res or res["status"] != "active":
                conn.close()
                return cls.get_budget_policy(user_id)

            reserved_cost = quantize_usd(res["reserved_cost_usd"])
            reserved_tokens = int(res["reserved_tokens"])

            cursor.execute("""
            UPDATE budget_reservations
            SET status = 'released', reconciled_at = ?
            WHERE id = ?
            """, (time.time(), reservation_id))

            cursor.execute("SELECT reserved_spend_usd, reserved_tokens FROM budget_policies WHERE user_id = ?", (user_id,))
            p_row = cursor.fetchone()
            if p_row:
                cur_resv = quantize_usd(p_row["reserved_spend_usd"] or 0.0)
                new_resv = quantize_usd(max(Decimal("0.0"), cur_resv - reserved_cost))
                new_resv_tokens = max(0, int(p_row["reserved_tokens"] or 0) - reserved_tokens)

                cursor.execute("""
                UPDATE budget_policies
                SET reserved_spend_usd = ?,
                    reserved_tokens = ?,
                WHERE user_id = ?
                """.replace(",\n                WHERE", "\n                WHERE"), (float(new_resv), new_resv_tokens, user_id))

            conn.commit()
            conn.close()

            return cls.get_budget_policy(user_id)

    @classmethod
    def record_usage(
        cls,
        user_id: str,
        cost_billed_usd: float,
        tokens_consumed: int
    ) -> Dict[str, Any]:
        """
        Directly records actual billing and tokens using Decimal precision.
        Ensures user policy exists before updating.
        """
        with _budget_lock:
            policy = cls.get_budget_policy(user_id)  # Ensure row exists
            cost_billed = quantize_usd(cost_billed_usd)
            cur_spend = quantize_usd(policy["current_spend_usd"])
            new_spend = quantize_usd(cur_spend + cost_billed)
            new_tokens = int(policy["current_tokens_used"]) + int(tokens_consumed)

            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE budget_policies
            SET current_spend_usd = ?,
                current_tokens_used = ?
            WHERE user_id = ?
            """, (float(new_spend), new_tokens, user_id))
            conn.commit()
            conn.close()

            return cls.get_budget_policy(user_id)

    @classmethod
    def reconcile_budget(cls, reservation_id: str, actual_tokens: int = 0, actual_cost_usd: float = 0.0, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Convenience alias for reconcile_reservation with automatic user resolution."""
        if not user_id:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT user_id FROM budget_reservations WHERE id = ?", (reservation_id,))
            row = cursor.fetchone()
            conn.close()
            user_id = row["user_id"] if row else "usr_team_arise_01"
        return cls.reconcile_reservation(reservation_id, user_id, actual_cost_usd, actual_tokens)

    @classmethod
    def release_budget(cls, reservation_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Convenience alias for release_reservation with automatic user resolution."""
        if not user_id:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT user_id FROM budget_reservations WHERE id = ?", (reservation_id,))
            row = cursor.fetchone()
            conn.close()
            user_id = row["user_id"] if row else "usr_team_arise_01"
        return cls.release_reservation(reservation_id, user_id)
