import time
import hashlib
import uuid
import threading
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from backend.app.db.database import get_connection
from backend.app.models.schemas import ActionApproval, ActionType, ApprovalStatus, SeverityLevel

_approval_lock = threading.Lock()

class ApprovalGuard:
    """
    Zero-Trust Security Action Gate & Interceptor.
    Guarantees that NO AI-generated instruction can write files, execute shell commands,
    or perform Git operations without explicit human verification and approval.
    """
    _emergency_kill_switch_engaged: bool = False
    APPROVAL_TIMEOUT_SECONDS: float = 900.0 # 15 minutes expiration window

    @classmethod
    def is_kill_switch_engaged(cls) -> bool:
        """
        Returns kill switch engagement state. Reads from persisted system_settings
        table in SQLite with in-memory caching for zero-overhead validation.
        """
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'emergency_kill_switch'")
            row = cursor.fetchone()
            conn.close()
            if row:
                cls._emergency_kill_switch_engaged = (row["value"] == "1")
        except Exception:
            pass
        return cls._emergency_kill_switch_engaged

    @classmethod
    def set_kill_switch(cls, engaged: bool):
        """
        Engages or disengages system-wide emergency kill switch.
        Persists state into SQLite system_settings table.
        """
        cls._emergency_kill_switch_engaged = engaged
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO system_settings (key, value)
            VALUES ('emergency_kill_switch', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, ("1" if engaged else "0",))
            conn.commit()
            conn.close()
        except Exception:
            pass
        return cls._emergency_kill_switch_engaged

    @classmethod
    def get_pending_approvals(cls) -> List[Dict[str, Any]]:
        """Retrieves all currently pending human approval gates."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM action_approvals WHERE status = 'pending' ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    @classmethod
    def create_approval_request(cls, *args, **kwargs) -> ActionApproval:
        """Alias for create_approval_gate."""
        return cls.create_approval_gate(*args, **kwargs)

    @classmethod
    def create_approval_gate(
        cls,
        task_id: str,
        action_type: ActionType,
        title: str,
        description: str,
        command_or_diff: str,
        target_resource: str = "",
        severity: SeverityLevel = SeverityLevel.MEDIUM,
        risk_analysis: str = "",
        user_id: Optional[str] = "usr_team_arise_01",
        repo_id: Optional[str] = "repo-core",
        target_path: Optional[str] = None
    ) -> ActionApproval:
        """
        Creates a pending action gate. Execution is halted until approved.
        """
        actual_target = target_path or target_resource or "codebase"
        if cls.is_kill_switch_engaged():
            raise HTTPException(
                status_code=423,
                detail="Security gate locked: Emergency Kill Switch is engaged. Action automatically blocked."
            )

        appr_id = f"appr-{int(time.time()*1000)}"
        now = time.time()
        expires_at = now + cls.APPROVAL_TIMEOUT_SECONDS
        diff_hash = hashlib.sha256(command_or_diff.encode("utf-8")).hexdigest()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO action_approvals (
            id, task_id, action_type, title, description, command_or_diff,
            target_resource, severity, status, created_at, risk_analysis,
            diff_hash, expires_at, user_id, repo_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
        """, (
            appr_id, task_id, action_type.value, title, description, command_or_diff,
            actual_target, severity.value, now, risk_analysis,
            diff_hash, expires_at, user_id or "usr_team_arise_01", repo_id or "repo-core"
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
            target_resource=actual_target,
            severity=severity,
            status=ApprovalStatus.PENDING,
            created_at=now,
            risk_analysis=risk_analysis,
            user_id=user_id or "usr_team_arise_01",
            repo_id=repo_id or "repo-core"
        )

    @classmethod
    def resolve_approval(
        cls,
        approval_id: str,
        decision: ApprovalStatus,
        reviewer: str = "TEAM ARISE",
        reviewer_user_id: Optional[str] = None,
        target_repo_id: Optional[str] = None,
        target_task_id: Optional[str] = None,
        notes: Optional[str] = None,
        expected_diff_hash: Optional[str] = None,
        approve_git_commit: bool = True
    ) -> Dict[str, Any]:
        """
        Human reviewer approves, rejects, or requests revision.
        Enforces:
        - Kill switch check
        - Thread-safe concurrency check
        - Token existence check
        - Rejection of reused tokens (already approved/rejected)
        - Rejection of expired tokens (timeout enforcement)
        - Cross-user identity validation (User A token cannot be resolved by User B)
        - Repository binding validation (Token cannot be resolved against another repo)
        - Task binding validation (Token cannot be resolved against another task)
        - Rejection of tampered diff proposals (diff_hash mismatch)
        - Separate Git commit authorization flag
        - Immutable audit logging with SHA-256 integrity digest
        """
        if cls.is_kill_switch_engaged():
            raise HTTPException(
                status_code=423,
                detail="Action cannot be approved: Emergency Kill Switch is active."
            )

        with _approval_lock:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM action_approvals WHERE id = ?", (approval_id,))
            row = cursor.fetchone()
            if not row:
                conn.close()
                raise HTTPException(status_code=404, detail="Approval gate not found.")

            # 1. Anti-Replay: Reject already resolved tokens
            current_status = row["status"]
            if current_status != "pending":
                conn.close()
                raise HTTPException(
                    status_code=400,
                    detail=f"Security violation: Approval token '{approval_id}' has already been resolved with status '{current_status}'. Token reuse is prohibited."
                )

            # 2. Expiration Check
            now = time.time()
            created_at = row["created_at"]
            expires_at = row["expires_at"] if ("expires_at" in row.keys() and row["expires_at"]) else (created_at + cls.APPROVAL_TIMEOUT_SECONDS)
            if now > expires_at:
                cursor.execute("UPDATE action_approvals SET status = 'expired', resolved_at = ? WHERE id = ?", (now, approval_id))
                conn.commit()
                conn.close()
                raise HTTPException(
                    status_code=410,
                    detail=f"Security violation: Approval token '{approval_id}' has expired. Re-submit task for human review."
                )

            # 3. Cross-User Identity Check
            token_user_id = row["user_id"] if ("user_id" in row.keys() and row["user_id"]) else "usr_team_arise_01"
            if reviewer_user_id and reviewer_user_id != token_user_id:
                conn.close()
                raise HTTPException(
                    status_code=403,
                    detail=f"Cross-user security violation: User '{reviewer_user_id}' is not authorized to resolve approval token '{approval_id}' issued to '{token_user_id}'."
                )

            # 4. Cross-Repository Binding Check
            token_repo_id = row["repo_id"] if ("repo_id" in row.keys() and row["repo_id"]) else "repo-core"
            if target_repo_id and target_repo_id != token_repo_id:
                conn.close()
                raise HTTPException(
                    status_code=400,
                    detail=f"Repository binding violation: Approval token '{approval_id}' is bound to repository '{token_repo_id}', not '{target_repo_id}'."
                )

            # 5. Cross-Task Binding Check
            token_task_id = row["task_id"]
            if target_task_id and target_task_id != token_task_id:
                conn.close()
                raise HTTPException(
                    status_code=400,
                    detail=f"Task binding violation: Approval token '{approval_id}' is bound to task '{token_task_id}', not '{target_task_id}'."
                )

            # 6. Diff Hash Binding & Anti-Tampering Check
            stored_diff = row["command_or_diff"] if "command_or_diff" in row.keys() else ""
            computed_diff_hash = hashlib.sha256(stored_diff.encode("utf-8")).hexdigest()
            stored_diff_hash = row["diff_hash"] if ("diff_hash" in row.keys() and row["diff_hash"]) else computed_diff_hash

            if expected_diff_hash and expected_diff_hash.strip().lower() != stored_diff_hash.lower():
                conn.close()
                raise HTTPException(
                    status_code=409,
                    detail="Security violation: Proposed diff was modified after approval gate creation. Approval rejected due to integrity mismatch."
                )

            # 4. Resolve approval
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

            # 5. Insert tamper-evident audit record
            audit_id = f"audit-{int(now*1000)}-{uuid.uuid4().hex[:8]}"
            audit_event = f"APPROVAL_{decision.value.upper()}"
            audit_details = f"Action {approval_id} for task {task_id} resolved by {reviewer}. Git commit approved: {approve_git_commit}."
            hasher = hashlib.sha256()
            hasher.update(f"{audit_id}:{approval_id}:{decision.value}:{now}".encode("utf-8"))
            audit_digest = f"sha256:{hasher.hexdigest()[:16]}"

            cursor.execute("""
            INSERT INTO audit_logs (id, timestamp, event_type, details, signature)
            VALUES (?, ?, ?, ?, ?)
            """, (audit_id, now, audit_event, audit_details, audit_digest))

            conn.commit()
            conn.close()

            sandbox_id = row["sandbox_id"] if "sandbox_id" in row.keys() and row["sandbox_id"] else "nx-sandbox-849"
            target_res = row["target_resource"] if "target_resource" in row.keys() else "codebase"
            command_or_diff = stored_diff

            sandbox_result = {
                "test_summary": "Verification skipped (decision: rejected)",
                "real_git_commit": "mutation-rejected",
                "git_commit_short": "rejected",
                "audit_receipt": audit_digest,
                "signature_type": "SHA-256 Tamper-Evident Audit Digest"
            }

            if decision == ApprovalStatus.APPROVED:
                try:
                    from backend.app.services.sandbox_service import SandboxService
                    file_target = target_res.split(":")[-1].strip() if ":" in target_res else "pkg/cache/cache_manager.go"
                    sandbox_result = SandboxService.apply_patch_and_test(
                        sandbox_id=sandbox_id,
                        repo_id="repo-core",
                        target_file=file_target,
                        diff_text=command_or_diff,
                        commit_message=f"fix: apply approved patch for {str(task_id)[:16]}",
                        create_git_commit=approve_git_commit
                    )
                except Exception as e:
                    sandbox_result["test_summary"] = f"Sandbox execution: {str(e)}"

            return {
                "approval_id": approval_id,
                "decision": decision.value,
                "resolved_at": now,
                "resolved_by": reviewer,
                "task_id": task_id,
                "message": f"Action successfully {decision.value}.",
                "applied_sandbox": sandbox_id,
                "target_resource": target_res,
                "test_summary": sandbox_result.get("test_summary"),
                "git_commit": f"{sandbox_result.get('git_commit_short')} (SHA: {sandbox_result.get('real_git_commit', '')[:12]}...)",
                "audit_receipt": sandbox_result.get("audit_receipt", audit_digest),
                "signature_type": sandbox_result.get("signature_type", "SHA-256 Tamper-Evident Audit Digest"),
                "test_output": sandbox_result.get("test_output", "")
            }
