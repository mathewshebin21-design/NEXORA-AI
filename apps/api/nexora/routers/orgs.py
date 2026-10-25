"""Organisations, members and invitations."""

import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .. import audit
from ..config import get_settings
from ..db import get_db, set_tenant_context
from ..deps import OrgContext, client_ip, current_principal, current_user, org_context, require_org
from ..models import Invitation, Organization, OrgMembership, User, Workspace, WorkspaceMembership
from ..permissions import P
from ..plans import limits
from ..schemas import (
    ConfirmIn,
    InvitationAccept,
    InvitationCreate,
    InvitationCreated,
    InvitationLookup,
    InvitationOut,
    MemberOut,
    MemberRoleUpdate,
    MembershipOut,
    OrgCreate,
    OrgDetail,
    OrgOut,
    OrgUpdate,
)
from ..security import hash_password, new_token, password_problems, token_hash
from ..util import now as _now
from .auth import _start_session, create_org

router = APIRouter(tags=["organizations"])
settings = get_settings()


# ------------------------------------------------------------------ organisations
@router.get("/orgs", response_model=list[MembershipOut])
def list_orgs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(OrgMembership, Organization)
        .join(Organization, Organization.id == OrgMembership.org_id)
        .where(OrgMembership.user_id == user.id)
        .order_by(Organization.name)
    ).all()
    return [MembershipOut(org_id=o.id, org_name=o.name, org_slug=o.slug, role=m.role, deletion_requested_at=o.deletion_requested_at) for m, o in rows]


@router.post("/orgs", status_code=201, response_model=OrgOut)
def create_organization(body: OrgCreate, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return create_org(db, name=body.name, owner=user, with_demo_workspace=False, ip=client_ip(request))


@router.get("/orgs/{org_id}", response_model=OrgDetail)
def get_org(ctx: OrgContext = Depends(org_context)):
    return OrgDetail(**OrgOut.model_validate(ctx.org).model_dump(), role=ctx.role, permissions=sorted(p.value for p in ctx.perms))


@router.patch("/orgs/{org_id}", response_model=OrgOut)
def update_org(body: OrgUpdate, ctx: OrgContext = Depends(require_org(P.ORG_UPDATE))):
    before = ctx.org.name
    ctx.org.name = body.name
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        action="org.updated",
        actor_user_id=ctx.user.id,
        target_type="org",
        target_id=ctx.org.id,
        details={"name": {"from": before, "to": body.name}},
        ip=ctx.ip,
    )
    return ctx.org


@router.post("/orgs/{org_id}/deletion-request", response_model=OrgOut)
def request_org_deletion(body: ConfirmIn, ctx: OrgContext = Depends(require_org(P.ORG_DELETE))):
    if body.confirm != ctx.org.slug:
        raise HTTPException(422, "Type the organisation slug to confirm.")
    ctx.org.deletion_requested_at = _now()
    ctx.org.deletion_requested_by = ctx.user.id
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        action="org.deletion_requested",
        actor_user_id=ctx.user.id,
        target_type="org",
        target_id=ctx.org.id,
        details={"grace_days": settings.deletion_grace_days},
        ip=ctx.ip,
    )
    return ctx.org


@router.delete("/orgs/{org_id}/deletion-request", response_model=OrgOut)
def cancel_org_deletion(ctx: OrgContext = Depends(require_org(P.ORG_DELETE))):
    ctx.org.deletion_requested_at = None
    ctx.org.deletion_requested_by = None
    audit.record(
        ctx.db, org_id=ctx.org.id, action="org.deletion_cancelled", actor_user_id=ctx.user.id, target_type="org", target_id=ctx.org.id, ip=ctx.ip
    )
    return ctx.org


# ------------------------------------------------------------------ members
@router.get("/orgs/{org_id}/members", response_model=list[MemberOut])
def list_members(ctx: OrgContext = Depends(org_context)):
    db = ctx.db
    rows = db.execute(
        select(OrgMembership, User).join(User, User.id == OrgMembership.user_id).where(OrgMembership.org_id == ctx.org.id).order_by(User.name)
    ).all()
    wms = db.execute(
        select(WorkspaceMembership, Workspace.name)
        .join(Workspace, Workspace.id == WorkspaceMembership.workspace_id)
        .where(WorkspaceMembership.org_id == ctx.org.id, Workspace.deleted_at.is_(None))
    ).all()
    by_user: dict[uuid.UUID, list[dict]] = {}
    for wm, wname in wms:
        by_user.setdefault(wm.user_id, []).append({"workspace_id": str(wm.workspace_id), "workspace_name": wname, "role": wm.role})
    return [
        MemberOut(user_id=u.id, email=u.email, name=u.name, role=m.role, joined_at=m.created_at, workspaces=by_user.get(u.id, [])) for m, u in rows
    ]


def _owner_count(db: Session, org_id: uuid.UUID) -> int:
    return db.scalar(select(func.count()).select_from(OrgMembership).where(OrgMembership.org_id == org_id, OrgMembership.role == "owner")) or 0


@router.patch("/orgs/{org_id}/members/{user_id}", response_model=list[MemberOut])
def update_member_role(user_id: uuid.UUID, body: MemberRoleUpdate, ctx: OrgContext = Depends(require_org(P.MEMBERS_MANAGE))):
    m = ctx.db.scalar(select(OrgMembership).where(OrgMembership.org_id == ctx.org.id, OrgMembership.user_id == user_id))
    if not m:
        raise HTTPException(404, "Not found")
    if (m.role == "owner" or body.role == "owner") and ctx.role != "owner":
        raise HTTPException(403, "Only an owner can grant or change the owner role.")
    if m.role == "owner" and body.role != "owner" and _owner_count(ctx.db, ctx.org.id) <= 1:
        raise HTTPException(409, "An organisation must keep at least one owner.")
    before = m.role
    m.role = body.role
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        action="member.role_changed",
        actor_user_id=ctx.user.id,
        target_type="user",
        target_id=user_id,
        details={"from": before, "to": body.role},
        ip=ctx.ip,
    )
    ctx.db.flush()
    return list_members(ctx)


@router.delete("/orgs/{org_id}/members/{user_id}", status_code=204)
def remove_member(user_id: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    leaving_self = user_id == ctx.user.id
    if not leaving_self:
        ctx.require(P.MEMBERS_MANAGE)
    m = ctx.db.scalar(select(OrgMembership).where(OrgMembership.org_id == ctx.org.id, OrgMembership.user_id == user_id))
    if not m:
        raise HTTPException(404, "Not found")
    if m.role == "owner" and not leaving_self and ctx.role != "owner":
        raise HTTPException(403, "Only an owner can remove an owner.")
    if m.role == "owner" and _owner_count(ctx.db, ctx.org.id) <= 1:
        raise HTTPException(409, "An organisation must keep at least one owner.")
    ctx.db.execute(delete(WorkspaceMembership).where(WorkspaceMembership.org_id == ctx.org.id, WorkspaceMembership.user_id == user_id))
    ctx.db.delete(m)
    audit.record(
        ctx.db,
        org_id=ctx.org.id,
        action="member.left" if leaving_self else "member.removed",
        actor_user_id=ctx.user.id,
        target_type="user",
        target_id=user_id,
        ip=ctx.ip,
    )
    return Response(status_code=204)


# ------------------------------------------------------------------ invitations
def _status(inv: Invitation) -> str:
    if inv.accepted_at:
        return "accepted"
    if inv.revoked_at:
        return "revoked"
    if inv.expires_at <= _now():
        return "expired"
    return "pending"


def _inv_out(inv: Invitation) -> InvitationOut:
    o = InvitationOut.model_validate(inv)
    o.status = _status(inv)
    return o


def seats_in_use(db: Session, org_id: uuid.UUID) -> int:
    members = db.scalar(select(func.count()).select_from(OrgMembership).where(OrgMembership.org_id == org_id)) or 0
    pending = (
        db.scalar(
            select(func.count())
            .select_from(Invitation)
            .where(Invitation.org_id == org_id, Invitation.accepted_at.is_(None), Invitation.revoked_at.is_(None), Invitation.expires_at > _now())
        )
        or 0
    )
    return members + pending


@router.get("/orgs/{org_id}/invitations", response_model=list[InvitationOut])
def list_invitations(ctx: OrgContext = Depends(require_org(P.INVITATIONS_MANAGE))):
    rows = ctx.db.scalars(select(Invitation).where(Invitation.org_id == ctx.org.id).order_by(Invitation.created_at.desc())).all()
    return [_inv_out(i) for i in rows]


@router.post("/orgs/{org_id}/invitations", status_code=201, response_model=InvitationCreated)
def create_invitation(body: InvitationCreate, ctx: OrgContext = Depends(require_org(P.INVITATIONS_MANAGE))):
    db = ctx.db
    if (body.workspace_id is None) != (body.workspace_role is None):
        raise HTTPException(422, "workspace_id and workspace_role must be provided together.")
    if body.workspace_id and not db.scalar(select(Workspace.id).where(Workspace.id == body.workspace_id, Workspace.deleted_at.is_(None))):
        raise HTTPException(404, "Workspace not found")
    email = body.email.lower()
    existing_member = db.scalar(
        select(OrgMembership.id)
        .join(User, User.id == OrgMembership.user_id)
        .where(OrgMembership.org_id == ctx.org.id, func.lower(User.email) == email)
    )
    if existing_member:
        raise HTTPException(409, "This person is already a member.")
    seat_limit = limits(ctx.org.plan)["seats"]
    if seat_limit is not None and seats_in_use(db, ctx.org.id) >= seat_limit:
        raise HTTPException(402, f"Seat limit reached for the {ctx.org.plan} plan ({seat_limit}).")
    # Supersede any pending invite for the same email
    for old in db.scalars(
        select(Invitation).where(
            Invitation.org_id == ctx.org.id, func.lower(Invitation.email) == email, Invitation.accepted_at.is_(None), Invitation.revoked_at.is_(None)
        )
    ):
        old.revoked_at = _now()
    raw = new_token()
    inv = Invitation(
        org_id=ctx.org.id,
        email=email,
        org_role=body.org_role,
        workspace_id=body.workspace_id,
        workspace_role=body.workspace_role,
        token_hash=token_hash(raw),
        invited_by=ctx.user.id,
        expires_at=_now() + timedelta(days=settings.invitation_ttl_days),
    )
    db.add(inv)
    db.flush()
    audit.record(
        db,
        org_id=ctx.org.id,
        action="invitation.created",
        actor_user_id=ctx.user.id,
        target_type="invitation",
        target_id=inv.id,
        workspace_id=body.workspace_id,
        details={"email": email, "org_role": body.org_role, "workspace_role": body.workspace_role},
        ip=ctx.ip,
    )
    return InvitationCreated(**_inv_out(inv).model_dump(), accept_url=f"{settings.public_base_url}/invite/{raw}")


@router.delete("/orgs/{org_id}/invitations/{invitation_id}", status_code=204)
def revoke_invitation(invitation_id: uuid.UUID, ctx: OrgContext = Depends(require_org(P.INVITATIONS_MANAGE))):
    inv = ctx.db.scalar(select(Invitation).where(Invitation.id == invitation_id, Invitation.org_id == ctx.org.id))
    if not inv:
        raise HTTPException(404, "Not found")
    if _status(inv) == "pending":
        inv.revoked_at = _now()
        audit.record(
            ctx.db, org_id=ctx.org.id, action="invitation.revoked", actor_user_id=ctx.user.id, target_type="invitation", target_id=inv.id, ip=ctx.ip
        )
    return Response(status_code=204)


def _find_invitation(db: Session, raw: str) -> Invitation:
    th = token_hash(raw)
    set_tenant_context(db, invite_token_hash=th)
    inv = db.scalar(select(Invitation).where(Invitation.token_hash == th))
    if not inv:
        raise HTTPException(404, "Invitation not found")
    set_tenant_context(db, org_id=inv.org_id)
    return inv


@router.get("/invitations/lookup", response_model=InvitationLookup)
def lookup_invitation(token: str, db: Session = Depends(get_db)):
    inv = _find_invitation(db, token)
    org = db.get(Organization, inv.org_id)
    return InvitationLookup(org_name=org.name if org else "", email=inv.email, org_role=inv.org_role, expires_at=inv.expires_at, status=_status(inv))


@router.post("/invitations/accept", response_model=MembershipOut)
def accept_invitation(body: InvitationAccept, request: Request, response: Response, db: Session = Depends(get_db)):
    inv = _find_invitation(db, body.token)
    if _status(inv) != "pending":
        raise HTTPException(410, f"This invitation is {_status(inv)}.")
    signed_in: User | None = None
    if request.cookies.get(settings.session_cookie_name):
        try:
            signed_in = current_principal(request, db).user
        except HTTPException:
            signed_in = None
    set_tenant_context(db, org_id=inv.org_id)
    existing = db.scalar(select(User).where(func.lower(User.email) == inv.email.lower()))
    if signed_in:
        if signed_in.email.lower() != inv.email.lower():
            raise HTTPException(403, "This invitation was sent to a different email address.")
        user = signed_in
    elif existing:
        raise HTTPException(409, "An account exists for this email. Sign in, then open the invitation link again.")
    else:
        if not body.name or not body.password:
            raise HTTPException(422, "Name and password are required to create your account.")
        problems = password_problems(body.password, inv.email)
        if problems:
            raise HTTPException(422, {"password": problems})
        user = User(email=inv.email.lower(), name=" ".join(body.name.split()), password_hash=hash_password(body.password), email_verified_at=_now())
        db.add(user)
        db.flush()
        _start_session(db, user, request, response)
    set_tenant_context(db, user_id=user.id, org_id=inv.org_id)
    if not db.scalar(select(OrgMembership.id).where(OrgMembership.org_id == inv.org_id, OrgMembership.user_id == user.id)):
        db.add(OrgMembership(org_id=inv.org_id, user_id=user.id, role=inv.org_role))
    if inv.workspace_id and not db.scalar(
        select(WorkspaceMembership.id).where(WorkspaceMembership.workspace_id == inv.workspace_id, WorkspaceMembership.user_id == user.id)
    ):
        db.add(WorkspaceMembership(org_id=inv.org_id, workspace_id=inv.workspace_id, user_id=user.id, role=inv.workspace_role))
    inv.accepted_at = _now()
    audit.record(
        db,
        org_id=inv.org_id,
        action="invitation.accepted",
        actor_user_id=user.id,
        target_type="invitation",
        target_id=inv.id,
        workspace_id=inv.workspace_id,
        ip=client_ip(request),
    )
    org = db.get(Organization, inv.org_id)
    return MembershipOut(org_id=org.id, org_name=org.name, org_slug=org.slug, role=inv.org_role, deletion_requested_at=org.deletion_requested_at)
