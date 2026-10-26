"""API credentials, audit log, usage and data export."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import audit
from ..deps import OrgContext, WorkspaceContext, require_org, require_ws
from ..models import ApiKey, AuditLog, Connection, Invitation, OrgMembership, Project, UsageEvent, User, Workspace, WorkspaceMembership
from ..permissions import P
from ..plans import limits
from ..schemas import ApiKeyCreate, ApiKeyCreated, ApiKeyOut, AuditOut, AuditPage, ProjectOut, UsageMetric, UsageOut, WorkspaceOut
from ..security import new_api_key
from ..util import now
from .orgs import seats_in_use

router = APIRouter(prefix="/orgs/{org_id}", tags=["governance"])


# ------------------------------------------------------------------ API keys
@router.get("/workspaces/{workspace_id}/api-keys", response_model=list[ApiKeyOut])
def list_keys(ctx: WorkspaceContext = Depends(require_ws(P.API_KEYS_MANAGE))):
    return ctx.db.scalars(select(ApiKey).where(ApiKey.workspace_id == ctx.workspace.id).order_by(ApiKey.created_at.desc())).all()


@router.post("/workspaces/{workspace_id}/api-keys", status_code=201, response_model=ApiKeyCreated)
def create_key(body: ApiKeyCreate, ctx: WorkspaceContext = Depends(require_ws(P.API_KEYS_MANAGE))):
    full, prefix, h = new_api_key()
    key = ApiKey(
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        name=body.name,
        prefix=prefix,
        key_hash=h,
        scopes=sorted(set(body.scopes)),
        created_by=ctx.user.id,
        expires_at=now() + timedelta(days=body.expires_in_days) if body.expires_in_days else None,
    )
    ctx.db.add(key)
    ctx.db.flush()
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="api_key.created",
        actor_user_id=ctx.user.id,
        target_type="api_key",
        target_id=key.id,
        details={"name": key.name, "prefix": prefix, "scopes": key.scopes},
        ip=ctx.ip,
    )
    return ApiKeyCreated(**ApiKeyOut.model_validate(key).model_dump(), key=full)


@router.delete("/workspaces/{workspace_id}/api-keys/{key_id}", status_code=204)
def revoke_key(key_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_ws(P.API_KEYS_MANAGE))):
    key = ctx.db.scalar(select(ApiKey).where(ApiKey.id == key_id, ApiKey.workspace_id == ctx.workspace.id))
    if not key:
        raise HTTPException(404, "Not found")
    if not key.revoked_at:
        key.revoked_at = now()
        audit.record(
            ctx.db,
            org_id=ctx.org.id,
            workspace_id=ctx.workspace.id,
            action="api_key.revoked",
            actor_user_id=ctx.user.id,
            target_type="api_key",
            target_id=key.id,
            details={"prefix": key.prefix},
            ip=ctx.ip,
        )
    return Response(status_code=204)


# ------------------------------------------------------------------ audit
def _audit_page(db: Session, q, limit: int, cursor: int | None) -> AuditPage:
    if cursor:
        q = q.where(AuditLog.id < cursor)
    rows = db.scalars(q.order_by(AuditLog.id.desc()).limit(limit + 1)).all()
    page, more = rows[:limit], len(rows) > limit
    user_ids = {r.actor_user_id for r in page if r.actor_user_id}
    key_ids = {r.actor_api_key_id for r in page if r.actor_api_key_id}
    names = {u.id: u.name for u in db.scalars(select(User).where(User.id.in_(user_ids)))} if user_ids else {}
    keys = {k.id: f"API key {k.name}" for k in db.scalars(select(ApiKey).where(ApiKey.id.in_(key_ids)))} if key_ids else {}
    items = []
    for r in page:
        o = AuditOut.model_validate(r)
        o.ip = str(r.ip) if r.ip else None
        o.actor_label = names.get(r.actor_user_id) or keys.get(r.actor_api_key_id) or ("System" if not r.actor_user_id else None)
        items.append(o)
    return AuditPage(items=items, next_cursor=page[-1].id if more and page else None)


@router.get("/audit-logs", response_model=AuditPage)
def org_audit(
    action: str | None = None,
    workspace_id: uuid.UUID | None = None,
    limit: int = Query(50, ge=1, le=200),
    cursor: int | None = None,
    ctx: OrgContext = Depends(require_org(P.AUDIT_READ_ORG)),
):
    q = select(AuditLog).where(AuditLog.org_id == ctx.org.id)
    if action:
        q = q.where(AuditLog.action.startswith(action))
    if workspace_id:
        q = q.where(AuditLog.workspace_id == workspace_id)
    return _audit_page(ctx.db, q, limit, cursor)


@router.get("/workspaces/{workspace_id}/audit-logs", response_model=AuditPage)
def workspace_audit(
    action: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    cursor: int | None = None,
    ctx: WorkspaceContext = Depends(require_ws(P.AUDIT_READ)),
):
    q = select(AuditLog).where(AuditLog.workspace_id == ctx.workspace.id)
    if action:
        q = q.where(AuditLog.action.startswith(action))
    return _audit_page(ctx.db, q, limit, cursor)


# ------------------------------------------------------------------ usage
def month_bounds(t: datetime) -> tuple[datetime, datetime]:
    start = datetime(t.year, t.month, 1, tzinfo=UTC)
    end = datetime(t.year + (t.month == 12), (t.month % 12) + 1, 1, tzinfo=UTC)
    return start, end


def usage_this_month(db: Session, org_id: uuid.UUID, metric: str) -> int:
    start, end = month_bounds(now())
    return int(
        db.scalar(
            select(func.coalesce(func.sum(UsageEvent.quantity), 0)).where(
                UsageEvent.org_id == org_id, UsageEvent.metric == metric, UsageEvent.occurred_at >= start, UsageEvent.occurred_at < end
            )
        )
        or 0
    )


@router.get("/usage", response_model=UsageOut)
def usage(ctx: OrgContext = Depends(require_org(P.USAGE_READ))):
    db, lim = ctx.db, limits(ctx.org.plan)
    start, end = month_bounds(now())
    ws_count = db.scalar(select(func.count()).select_from(Workspace).where(Workspace.org_id == ctx.org.id, Workspace.deleted_at.is_(None))) or 0
    return UsageOut(
        plan=ctx.org.plan,
        period_start=start,
        period_end=end,
        metrics=[
            UsageMetric(metric="seats", used=seats_in_use(db, ctx.org.id), limit=lim["seats"]),
            UsageMetric(metric="workspaces", used=ws_count, limit=lim["workspaces"]),
            UsageMetric(
                metric="connections",
                used=db.scalar(select(func.count()).select_from(Connection).where(Connection.org_id == ctx.org.id, Connection.revoked_at.is_(None)))
                or 0,
                limit=lim.get("connections"),
            ),
            UsageMetric(metric="api_requests_month", used=usage_this_month(db, ctx.org.id, "api_request"), limit=lim["api_requests_month"]),
            UsageMetric(metric="ai_tokens_month", used=usage_this_month(db, ctx.org.id, "ai_tokens"), limit=lim["ai_tokens_month"]),
        ],
    )


# ------------------------------------------------------------------ export
def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else (str(v) if isinstance(v, uuid.UUID) else v)


def _workspace_bundle(db: Session, ws: Workspace) -> dict:
    members = db.execute(
        select(WorkspaceMembership, User).join(User, User.id == WorkspaceMembership.user_id).where(WorkspaceMembership.workspace_id == ws.id)
    ).all()
    projects = db.scalars(select(Project).where(Project.workspace_id == ws.id)).all()
    keys = db.scalars(select(ApiKey).where(ApiKey.workspace_id == ws.id)).all()
    logs = db.scalars(select(AuditLog).where(AuditLog.workspace_id == ws.id).order_by(AuditLog.id)).all()
    return {
        "workspace": WorkspaceOut.model_validate(ws).model_dump(mode="json"),
        "members": [{"user_id": str(u.id), "email": u.email, "name": u.name, "role": wm.role} for wm, u in members],
        "projects": [ProjectOut.model_validate(p).model_dump(mode="json") for p in projects],
        "api_keys": [ApiKeyOut.model_validate(k).model_dump(mode="json") for k in keys],  # metadata only, never hashes
        "audit_logs": [
            {
                "id": r.id,
                "action": r.action,
                "actor_user_id": _iso(r.actor_user_id),
                "actor_api_key_id": _iso(r.actor_api_key_id),
                "target_type": r.target_type,
                "target_id": r.target_id,
                "metadata": r.details,
                "created_at": _iso(r.created_at),
            }
            for r in logs
        ],
    }


@router.get("/workspaces/{workspace_id}/export")
def export_workspace(ctx: WorkspaceContext = Depends(require_ws(P.EXPORT))):
    bundle = {
        "format": "nexora.workspace-export.v1",
        "generated_at": now().isoformat(),
        "org_id": str(ctx.org.id),
        **_workspace_bundle(ctx.db, ctx.workspace),
    }
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="export.workspace",
        actor_user_id=ctx.user.id,
        target_type="workspace",
        target_id=ctx.workspace.id,
        ip=ctx.ip,
    )
    return JSONResponse(bundle, headers={"Content-Disposition": f'attachment; filename="nexora-{ctx.workspace.slug}-export.json"'})


@router.get("/export")
def export_org(ctx: OrgContext = Depends(require_org(P.ORG_EXPORT))):
    db = ctx.db
    workspaces = db.scalars(select(Workspace).where(Workspace.org_id == ctx.org.id)).all()
    members = db.execute(select(OrgMembership, User).join(User, User.id == OrgMembership.user_id).where(OrgMembership.org_id == ctx.org.id)).all()
    invites = db.scalars(select(Invitation).where(Invitation.org_id == ctx.org.id)).all()
    bundle = {
        "format": "nexora.org-export.v1",
        "generated_at": now().isoformat(),
        "organization": {
            "id": str(ctx.org.id),
            "name": ctx.org.name,
            "slug": ctx.org.slug,
            "plan": ctx.org.plan,
            "created_at": _iso(ctx.org.created_at),
        },
        "members": [{"user_id": str(u.id), "email": u.email, "name": u.name, "role": m.role} for m, u in members],
        "invitations": [
            {
                "email": i.email,
                "org_role": i.org_role,
                "created_at": _iso(i.created_at),
                "accepted_at": _iso(i.accepted_at),
                "revoked_at": _iso(i.revoked_at),
            }
            for i in invites
        ],
        "workspaces": [_workspace_bundle(db, w) | {"deleted_at": _iso(w.deleted_at)} for w in workspaces],
    }
    audit.record(db, org_id=ctx.org.id, action="export.org", actor_user_id=ctx.user.id, target_type="org", target_id=ctx.org.id, ip=ctx.ip)
    return JSONResponse(bundle, headers={"Content-Disposition": f'attachment; filename="nexora-{ctx.org.slug}-export.json"'})
