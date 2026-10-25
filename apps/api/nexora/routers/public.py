"""Public API v1 — authenticated with workspace-scoped API keys (Bearer)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from .. import audit
from ..deps import ApiKeyContext, api_key_context
from ..models import Project, UsageEvent
from ..plans import limits
from ..schemas import ProjectCreate, ProjectOut, WorkspaceOut
from .governance import usage_this_month

router = APIRouter(prefix="/v1", tags=["public-api"])


def metered(ctx: ApiKeyContext = Depends(api_key_context)) -> ApiKeyContext:
    cap = limits(ctx.org.plan)["api_requests_month"]
    if cap is not None and usage_this_month(ctx.db, ctx.org.id, "api_request") >= cap:
        raise HTTPException(429, "Monthly API request limit reached for this plan.")
    ctx.db.add(UsageEvent(org_id=ctx.org.id, workspace_id=ctx.workspace.id, metric="api_request", quantity=1))
    return ctx


@router.get("/workspace", response_model=WorkspaceOut)
def get_workspace(ctx: ApiKeyContext = Depends(metered)):
    ctx.require_scope("workspace:read")
    return ctx.workspace


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(ctx: ApiKeyContext = Depends(metered)):
    ctx.require_scope("projects:read")
    return ctx.db.scalars(select(Project).where(Project.workspace_id == ctx.workspace.id).order_by(Project.created_at.desc())).all()


@router.post("/projects", status_code=201, response_model=ProjectOut)
def create_project(body: ProjectCreate, ctx: ApiKeyContext = Depends(metered)):
    ctx.require_scope("projects:write")
    p = Project(org_id=ctx.org.id, workspace_id=ctx.workspace.id, name=body.name, description=body.description)
    ctx.db.add(p)
    ctx.db.flush()
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="project.created",
        actor_api_key_id=ctx.key.id,
        target_type="project",
        target_id=p.id,
        details={"name": p.name, "via": "api"},
        ip=ctx.ip,
    )
    return p
