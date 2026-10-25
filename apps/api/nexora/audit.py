"""Append-only audit trail. The runtime DB role can INSERT and SELECT only; a trigger blocks UPDATE/DELETE."""

import uuid
from typing import Any

from sqlalchemy.orm import Session

from .models import AuditLog


def record(
    db: Session,
    *,
    org_id: uuid.UUID,
    action: str,
    actor_user_id: uuid.UUID | None = None,
    actor_api_key_id: uuid.UUID | None = None,
    workspace_id: uuid.UUID | None = None,
    target_type: str | None = None,
    target_id: Any = None,
    details: dict | None = None,
    ip: str | None = None,
) -> None:
    db.add(
        AuditLog(
            org_id=org_id,
            workspace_id=workspace_id,
            actor_user_id=actor_user_id,
            actor_api_key_id=actor_api_key_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details=details or {},
            ip=ip,
        )
    )
