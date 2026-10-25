"""Authentication and authorisation dependencies.

Resolution order for a tenant route `/orgs/{org_id}/workspaces/{workspace_id}/...`:
1. Session cookie → user (sessions table, token stored as SHA-256).
2. Tenant context set on the DB transaction (`app.user_id`, `app.org_id`) — RLS now scopes every query.
3. Org membership → org role → permissions. Non-members get 404, not 403, so ids can't be probed.
4. Workspace (not deleted) → workspace role → permissions. Unassigned members get 404.
"""

import ipaddress
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db, set_tenant_context
from .models import ApiKey, Organization, OrgMembership, User, UserSession, Workspace, WorkspaceMembership
from .permissions import P, org_permissions, workspace_permissions
from .security import constant_time_equals, parse_api_key, token_hash

settings = get_settings()

NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


def client_ip(request: Request) -> str | None:
    """Peer address, or None when it is not a valid IP (e.g. test clients, unix sockets)."""
    host = request.client.host if request.client else None
    try:
        return str(ipaddress.ip_address(host)) if host else None
    except ValueError:
        return None


@dataclass
class Principal:
    user: User
    session: UserSession


def current_principal(request: Request, db: Session = Depends(get_db)) -> Principal:
    raw = request.cookies.get(settings.session_cookie_name)
    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    now = datetime.now(UTC)
    sess = db.scalar(select(UserSession).where(UserSession.token_hash == token_hash(raw)))
    if not sess or sess.revoked_at or sess.expires_at <= now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    user = db.get(User, sess.user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account disabled")
    if now - sess.last_seen_at > timedelta(minutes=5):
        sess.last_seen_at = now
    set_tenant_context(db, user_id=user.id)
    return Principal(user=user, session=sess)


def current_user(p: Principal = Depends(current_principal)) -> User:
    return p.user


@dataclass
class OrgContext:
    db: Session
    user: User
    org: Organization
    role: str
    perms: set[P]
    ip: str | None

    def require(self, perm: P) -> None:
        if perm not in self.perms:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Missing permission: {perm.value}")


def org_context(org_id: uuid.UUID, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)) -> OrgContext:
    set_tenant_context(db, org_id=org_id)
    m = db.scalar(select(OrgMembership).where(OrgMembership.org_id == org_id, OrgMembership.user_id == user.id))
    org = db.get(Organization, org_id) if m else None
    if not m or not org:
        raise NOT_FOUND
    return OrgContext(db=db, user=user, org=org, role=m.role, perms=org_permissions(m.role), ip=client_ip(request))


def require_org(perm: P):
    def dep(ctx: OrgContext = Depends(org_context)) -> OrgContext:
        ctx.require(perm)
        return ctx

    return dep


@dataclass
class WorkspaceContext(OrgContext):
    workspace: Workspace = field(default=None)  # type: ignore[assignment]
    workspace_role: str | None = None


def workspace_context(workspace_id: uuid.UUID, ctx: OrgContext = Depends(org_context)) -> WorkspaceContext:
    ws = ctx.db.scalar(select(Workspace).where(Workspace.id == workspace_id, Workspace.deleted_at.is_(None)))
    if not ws or ws.org_id != ctx.org.id:
        raise NOT_FOUND
    wm = ctx.db.scalar(select(WorkspaceMembership).where(WorkspaceMembership.workspace_id == ws.id, WorkspaceMembership.user_id == ctx.user.id))
    perms = workspace_permissions(ctx.role, wm.role if wm else None)
    if P.WS_READ not in perms:
        raise NOT_FOUND
    return WorkspaceContext(
        db=ctx.db, user=ctx.user, org=ctx.org, role=ctx.role, perms=perms | ctx.perms, ip=ctx.ip, workspace=ws, workspace_role=wm.role if wm else None
    )


def require_ws(perm: P):
    def dep(ctx: WorkspaceContext = Depends(workspace_context)) -> WorkspaceContext:
        ctx.require(perm)
        return ctx

    return dep


# ------------------------------------------------------------------ API keys
@dataclass
class ApiKeyContext:
    db: Session
    key: ApiKey
    org: Organization
    workspace: Workspace
    ip: str | None

    def require_scope(self, scope: str) -> None:
        if scope not in self.key.scopes:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"API key lacks scope: {scope}")


def api_key_context(request: Request, db: Session = Depends(get_db)) -> ApiKeyContext:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing API key", headers={"WWW-Authenticate": "Bearer"})
    raw = auth[7:].strip()
    prefix = parse_api_key(raw)
    if not prefix:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
    set_tenant_context(db, api_key_prefix=prefix)
    key = db.scalar(select(ApiKey).where(ApiKey.prefix == prefix))
    now = datetime.now(UTC)
    if not key or not constant_time_equals(key.key_hash, token_hash(raw)) or key.revoked_at or (key.expires_at and key.expires_at <= now):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
    set_tenant_context(db, org_id=key.org_id, api_key_prefix=None)
    ws = db.scalar(select(Workspace).where(Workspace.id == key.workspace_id, Workspace.deleted_at.is_(None)))
    org = db.get(Organization, key.org_id)
    if not ws or not org:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
    if not key.last_used_at or now - key.last_used_at > timedelta(minutes=1):
        db.execute(update(ApiKey).where(ApiKey.id == key.id).values(last_used_at=now))
    return ApiKeyContext(db=db, key=key, org=org, workspace=ws, ip=client_ip(request))
