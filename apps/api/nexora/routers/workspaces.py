"""Client workspaces, workspace membership and projects."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from .. import audit
from ..deps import OrgContext, WorkspaceContext, org_context, require_org, require_ws, workspace_context
from ..models import ApiKey, OrgMembership, Project, User, Workspace, WorkspaceMembership
from ..permissions import P, workspace_permissions
from ..plans import limits
from ..schemas import (
    ConfirmIn,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    WorkspaceCreate,
    WorkspaceDetail,
    WorkspaceMemberAdd,
    WorkspaceMemberOut,
    WorkspaceMemberUpdate,
    WorkspaceOut,
    WorkspaceSettings,
    WorkspaceUpdate,
)
from ..util import now, slugify, with_suffix

router = APIRouter(prefix="/orgs/{org_id}/workspaces", tags=["workspaces"])


def _active_count(db: Session, org_id: uuid.UUID) -> int:
    return db.scalar(select(func.count()).select_from(Workspace).where(Workspace.org_id == org_id, Workspace.deleted_at.is_(None))) or 0


@router.get("", response_model=list[WorkspaceDetail])
def list_workspaces(ctx: OrgContext = Depends(org_context)):
    rows = ctx.db.execute(
        select(Workspace, WorkspaceMembership.role)
        .outerjoin(WorkspaceMembership, (WorkspaceMembership.workspace_id == Workspace.id) & (WorkspaceMembership.user_id == ctx.user.id))
        .where(Workspace.deleted_at.is_(None))
        .order_by(Workspace.is_demo.desc(), Workspace.name)
    ).all()
    out = []
    for ws, role in rows:
        perms = workspace_permissions(ctx.role, role)
        if P.WS_READ in perms:
            out.append(WorkspaceDetail(**WorkspaceOut.model_validate(ws).model_dump(), role=role, permissions=sorted(p.value for p in perms)))
    return out


@router.post("", status_code=201, response_model=WorkspaceOut)
def create_workspace(body: WorkspaceCreate, ctx: OrgContext = Depends(require_org(P.WORKSPACES_CREATE))):
    db = ctx.db
    cap = limits(ctx.org.plan)["workspaces"]
    if cap is not None and _active_count(db, ctx.org.id) >= cap:
        raise HTTPException(402, f"Workspace limit reached for the {ctx.org.plan} plan ({cap}).")
    slug = slugify(body.name)
    if db.scalar(select(Workspace.id).where(Workspace.org_id == ctx.org.id, Workspace.slug == slug)):
        slug = with_suffix(slug)
    ws = Workspace(org_id=ctx.org.id, name=body.name, slug=slug, settings=body.settings.model_dump())
    db.add(ws)
    db.flush()
    audit.record(
        db,
        org_id=ctx.org.id,
        workspace_id=ws.id,
        action="workspace.created",
        actor_user_id=ctx.user.id,
        target_type="workspace",
        target_id=ws.id,
        details={"name": ws.name},
        ip=ctx.ip,
    )
    return ws


@router.get("/{workspace_id}", response_model=WorkspaceDetail)
def get_workspace(ctx: WorkspaceContext = Depends(workspace_context)):
    return WorkspaceDetail(
        **WorkspaceOut.model_validate(ctx.workspace).model_dump(), role=ctx.workspace_role, permissions=sorted(p.value for p in ctx.perms)
    )


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace(body: WorkspaceUpdate, ctx: WorkspaceContext = Depends(require_ws(P.WS_UPDATE))):
    ws = ctx.workspace
    changes: dict = {}
    if body.name is not None:
        name = " ".join(body.name.split())
        if not name:
            raise HTTPException(422, "Name must not be blank.")
        changes["name"] = {"from": ws.name, "to": name}
        ws.name = name
    if body.settings is not None:
        new = body.settings.model_dump()
        old = WorkspaceSettings(**{k: v for k, v in (ws.settings or {}).items() if k in WorkspaceSettings.model_fields}).model_dump()
        diff = {k: {"from": old.get(k), "to": v} for k, v in new.items() if old.get(k) != v}
        if diff:
            changes["settings"] = diff
        ws.settings = new
    if changes:
        audit.record(
            ctx.db,
            org_id=ctx.org.id,
            workspace_id=ws.id,
            action="workspace.updated",
            actor_user_id=ctx.user.id,
            target_type="workspace",
            target_id=ws.id,
            details=changes,
            ip=ctx.ip,
        )
    return ws


@router.delete("/{workspace_id}", status_code=204)
def delete_workspace(body: ConfirmIn, ctx: WorkspaceContext = Depends(require_ws(P.WS_DELETE))):
    ws = ctx.workspace
    if body.confirm != ws.name:
        raise HTTPException(422, "Type the workspace name to confirm deletion.")
    ws.deleted_at = now()
    ctx.db.execute(update(ApiKey).where(ApiKey.workspace_id == ws.id, ApiKey.revoked_at.is_(None)).values(revoked_at=now()))
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        workspace_id=ws.id,
        action="workspace.deleted",
        actor_user_id=ctx.user.id,
        target_type="workspace",
        target_id=ws.id,
        details={"name": ws.name, "mode": "soft", "api_keys_revoked": True},
        ip=ctx.ip,
    )
    return Response(status_code=204)


# ------------------------------------------------------------------ workspace members
@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberOut])
def list_workspace_members(ctx: WorkspaceContext = Depends(workspace_context)):
    rows = ctx.db.execute(
        select(WorkspaceMembership, User, OrgMembership.role)
        .join(User, User.id == WorkspaceMembership.user_id)
        .join(OrgMembership, (OrgMembership.user_id == User.id) & (OrgMembership.org_id == WorkspaceMembership.org_id))
        .where(WorkspaceMembership.workspace_id == ctx.workspace.id)
        .order_by(User.name)
    ).all()
    return [WorkspaceMemberOut(user_id=u.id, email=u.email, name=u.name, role=wm.role, org_role=orole) for wm, u, orole in rows]


@router.post("/{workspace_id}/members", status_code=201, response_model=list[WorkspaceMemberOut])
def add_workspace_member(body: WorkspaceMemberAdd, ctx: WorkspaceContext = Depends(require_ws(P.WS_MEMBERS_MANAGE))):
    db = ctx.db
    if not db.scalar(select(OrgMembership.id).where(OrgMembership.org_id == ctx.org.id, OrgMembership.user_id == body.user_id)):
        raise HTTPException(404, "User is not a member of this organisation. Invite them first.")
    if db.scalar(
        select(WorkspaceMembership.id).where(WorkspaceMembership.workspace_id == ctx.workspace.id, WorkspaceMembership.user_id == body.user_id)
    ):
        raise HTTPException(409, "Already assigned to this workspace.")
    db.add(WorkspaceMembership(org_id=ctx.org.id, workspace_id=ctx.workspace.id, user_id=body.user_id, role=body.role))
    audit.record(
        db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="workspace_member.added",
        actor_user_id=ctx.user.id,
        target_type="user",
        target_id=body.user_id,
        details={"role": body.role},
        ip=ctx.ip,
    )
    db.flush()
    return list_workspace_members(ctx)


@router.patch("/{workspace_id}/members/{user_id}", response_model=list[WorkspaceMemberOut])
def update_workspace_member(user_id: uuid.UUID, body: WorkspaceMemberUpdate, ctx: WorkspaceContext = Depends(require_ws(P.WS_MEMBERS_MANAGE))):
    wm = ctx.db.scalar(
        select(WorkspaceMembership).where(WorkspaceMembership.workspace_id == ctx.workspace.id, WorkspaceMembership.user_id == user_id)
    )
    if not wm:
        raise HTTPException(404, "Not found")
    before, wm.role = wm.role, body.role
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="workspace_member.role_changed",
        actor_user_id=ctx.user.id,
        target_type="user",
        target_id=user_id,
        details={"from": before, "to": body.role},
        ip=ctx.ip,
    )
    ctx.db.flush()
    return list_workspace_members(ctx)


@router.delete("/{workspace_id}/members/{user_id}", status_code=204)
def remove_workspace_member(user_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_ws(P.WS_MEMBERS_MANAGE))):
    wm = ctx.db.scalar(
        select(WorkspaceMembership).where(WorkspaceMembership.workspace_id == ctx.workspace.id, WorkspaceMembership.user_id == user_id)
    )
    if not wm:
        raise HTTPException(404, "Not found")
    ctx.db.delete(wm)
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="workspace_member.removed",
        actor_user_id=ctx.user.id,
        target_type="user",
        target_id=user_id,
        ip=ctx.ip,
    )
    return Response(status_code=204)


# ------------------------------------------------------------------ projects
@router.get("/{workspace_id}/projects", response_model=list[ProjectOut])
def list_projects(include_archived: bool = False, ctx: WorkspaceContext = Depends(require_ws(P.PROJECTS_READ))):
    q = select(Project).where(Project.workspace_id == ctx.workspace.id)
    if not include_archived:
        q = q.where(Project.status != "archived")
    return ctx.db.scalars(q.order_by(Project.updated_at.desc())).all()


@router.post("/{workspace_id}/projects", status_code=201, response_model=ProjectOut)
def create_project(body: ProjectCreate, ctx: WorkspaceContext = Depends(require_ws(P.PROJECTS_WRITE))):
    p = Project(org_id=ctx.org.id, workspace_id=ctx.workspace.id, name=body.name, description=body.description, created_by=ctx.user.id)
    ctx.db.add(p)
    ctx.db.flush()
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="project.created",
        actor_user_id=ctx.user.id,
        target_type="project",
        target_id=p.id,
        details={"name": p.name},
        ip=ctx.ip,
    )
    return p


def _project(ctx: WorkspaceContext, project_id: uuid.UUID) -> Project:
    p = ctx.db.scalar(select(Project).where(Project.id == project_id, Project.workspace_id == ctx.workspace.id))
    if not p:
        raise HTTPException(404, "Not found")
    return p


@router.get("/{workspace_id}/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_ws(P.PROJECTS_READ))):
    return _project(ctx, project_id)


@router.patch("/{workspace_id}/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: uuid.UUID, body: ProjectUpdate, ctx: WorkspaceContext = Depends(require_ws(P.PROJECTS_WRITE))):
    p = _project(ctx, project_id)
    changes = {}
    for field in ("name", "description", "status"):
        v = getattr(body, field)
        if v is not None and v != getattr(p, field):
            if field == "name":
                v = " ".join(v.split())
                if not v:
                    raise HTTPException(422, "Name must not be blank.")
            changes[field] = {"from": getattr(p, field), "to": v}
            setattr(p, field, v)
    if changes:
        p.updated_at = now()
        audit.record(
            ctx.db,
            org_id=ctx.org.id,
            workspace_id=ctx.workspace.id,
            action="project.updated",
            actor_user_id=ctx.user.id,
            target_type="project",
            target_id=p.id,
            details=changes,
            ip=ctx.ip,
        )
    return p


@router.delete("/{workspace_id}/projects/{project_id}", status_code=204)
def delete_project(project_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_ws(P.PROJECTS_WRITE))):
    p = _project(ctx, project_id)
    ctx.db.delete(p)
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="project.deleted",
        actor_user_id=ctx.user.id,
        target_type="project",
        target_id=project_id,
        details={"name": p.name},
        ip=ctx.ip,
    )
    return Response(status_code=204)
