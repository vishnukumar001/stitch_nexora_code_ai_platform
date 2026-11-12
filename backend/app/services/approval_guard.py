import time
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from backend.app.db.database import get_connection
from backend.app.models.schemas import ActionApproval, ActionType, ApprovalStatus, SeverityLevel

class ApprovalGuard:
    """
    Zero-Trust Security Action Gate & Interceptor.
    Guarantees that NO AI-generated instruction can write files, execute shell commands,
    or perform Git operations without explicit human verification and approval.
    """
    _emergency_kill_switch_engaged: bool = False

    @classmethod
    def is_kill_switch_engaged(cls) -> bool:
        return cls._emergency_kill_switch_engaged

    @classmethod
    def set_kill_switch(cls, engaged: bool) -> bool:
        cls._emergency_kill_switch_engaged = engaged
        if engaged:
            # Revoke all pending approvals in DB
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE action_approvals
            SET status = 'rejected',
                resolved_at = ?,
                resolved_by = 'EMERGENCY_KILL_SWITCH_ACTIVE',
                risk_analysis = 'Automatically cancelled by emergency kill switch engagement.'
            WHERE status = 'pending'
            """, (time.time(),))
            conn.commit()
            conn.close()
        return cls._emergency_kill_switch_engaged

    @classmethod
    def create_approval_gate(
        cls,
        task_id: str,
        action_type: ActionType,
        title: str,
        description: str,
        command_or_diff: str,
        target_resource: str,
        severity: SeverityLevel = SeverityLevel.MEDIUM,
        risk_analysis: str = ""
    ) -> ActionApproval:
        """
        Creates a pending action gate. Execution is halted until approved.
        """
        if cls.is_kill_switch_engaged():
            raise HTTPException(
                status_code=423,
                detail="Security gate locked: Emergency Kill Switch is engaged. Action automatically blocked."
            )

        appr_id = f"appr-{int(time.time()*1000)}"
        now = time.time()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO action_approvals (
            id, task_id, action_type, title, description, command_or_diff,
            target_resource, severity, status, created_at, risk_analysis
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        """, (
            appr_id, task_id, action_type.value, title, description, command_or_diff,
            target_resource, severity.value, now, risk_analysis
        ))
        conn.commit()
        conn.close()

        return ActionApproval(
            id=appr_id,
            task_id=task_id,
            action_type=action_type,
            title=title,
            description=description,
            command_or_diff=command_or_diff,
            target_resource=target_resource,
            severity=severity,
            status=ApprovalStatus.PENDING,
            created_at=now,
            risk_analysis=risk_analysis
        )

    @classmethod
    def resolve_approval(
        cls,
        approval_id: str,
        decision: ApprovalStatus,
        reviewer: str = "Elena Rostova",
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Human reviewer approves, rejects, or requests revision.
        """
        if cls.is_kill_switch_engaged():
            raise HTTPException(
                status_code=423,
                detail="Action cannot be approved: Emergency Kill Switch is active."
            )

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM action_approvals WHERE id = ?", (approval_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Approval gate not found.")

        now = time.time()
        cursor.execute("""
        UPDATE action_approvals
        SET status = ?,
            resolved_at = ?,
            resolved_by = ?
        WHERE id = ?
        """, (decision.value, now, reviewer, approval_id))

        # Also update parent task status if applicable
        task_id = row["task_id"]
        task_status = "completed" if decision == ApprovalStatus.APPROVED else "rejected"
        cursor.execute("""
        UPDATE tasks
        SET status = ?
        WHERE id = ?
        """, (task_status, task_id))

        conn.commit()
        conn.close()

        return {
            "approval_id": approval_id,
            "decision": decision.value,
            "resolved_at": now,
            "resolved_by": reviewer,
            "task_id": task_id,
            "message": f"Action successfully {decision.value}."
        }

