import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import audit
from ..config import get_settings
from ..db import get_db, set_tenant_context
from ..deps import Principal, client_ip, current_principal
from ..models import Organization, OrgMembership, User, UserSession, Workspace
from ..ratelimit import limiter
from ..schemas import LoginIn, MembershipOut, MeOut, SessionOut, SignupIn, UserOut
from ..security import hash_password, needs_rehash, new_token, password_problems, token_hash, verify_password
from ..util import now, slugify, with_suffix

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

DEMO_WORKSPACE_SETTINGS = {
    "currency": "USD",
    "timezone": "America/New_York",
    "fiscal_year_start_month": 2,
    "default_attribution_model": "position_based",
    "data_retention_months": 25,
    "brand_name": "Lumen & Oak",
}


def _start_session(db: Session, user: User, request: Request, response: Response) -> None:
    raw = new_token()
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=token_hash(raw),
            expires_at=now() + timedelta(hours=settings.session_ttl_hours),
            ip=client_ip(request),
            user_agent=(request.headers.get("user-agent") or "")[:400],
        )
    )
    response.set_cookie(
        settings.session_cookie_name,
        raw,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def _audit_for_user_orgs(db: Session, user: User, action: str, ip: str | None, details: dict | None = None) -> None:
    set_tenant_context(db, user_id=user.id)
    org_ids = db.scalars(select(OrgMembership.org_id).where(OrgMembership.user_id == user.id)).all()
    for oid in org_ids:
        set_tenant_context(db, org_id=oid)
        audit.record(db, org_id=oid, action=action, actor_user_id=user.id, target_type="user", target_id=user.id, ip=ip, details=details)
        db.flush()
    set_tenant_context(db, org_id=None)


def create_org(db: Session, *, name: str, owner: User, with_demo_workspace: bool, ip: str | None) -> Organization:
    org_id = uuid.uuid4()
    set_tenant_context(db, org_id=org_id)
    base = slugify(name)
    for attempt in range(5):
        slug = base if attempt == 0 else with_suffix(base)
        try:
            with db.begin_nested():
                org = Organization(id=org_id, name=name, slug=slug)
                db.add(org)
                db.flush()
            break
        except IntegrityError:
            continue
    else:  # pragma: no cover - astronomically unlikely
        raise HTTPException(status.HTTP_409_CONFLICT, "Could not allocate an organisation slug")
    db.add(OrgMembership(org_id=org.id, user_id=owner.id, role="owner"))
    if with_demo_workspace:
        ws = Workspace(org_id=org.id, name="Demo · Lumen & Oak", slug="demo-lumen-oak", is_demo=True, settings=DEMO_WORKSPACE_SETTINGS)
        db.add(ws)
        db.flush()
        audit.record(
            db,
            org_id=org.id,
            workspace_id=ws.id,
            action="workspace.created",
            actor_user_id=owner.id,
            target_type="workspace",
            target_id=ws.id,
            details={"demo": True},
            ip=ip,
        )
    audit.record(db, org_id=org.id, action="org.created", actor_user_id=owner.id, target_type="org", target_id=org.id, ip=ip)
    db.flush()
    return org


@router.post("/signup", status_code=201, response_model=MeOut)
def signup(body: SignupIn, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    if not limiter.allow(f"signup:{ip}", settings.login_rate_per_minute):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Try again shortly.")
    problems = password_problems(body.password, body.email)
    if problems:
        raise HTTPException(422, {"password": problems})
    email = body.email.lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        # Don't reveal more than necessary; the UI suggests signing in or resetting.
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists. Sign in instead.")
    user = User(email=email, name=body.name, password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    set_tenant_context(db, user_id=user.id)
    org = create_org(db, name=body.org_name, owner=user, with_demo_workspace=True, ip=ip)
    audit.record(db, org_id=org.id, action="auth.signup", actor_user_id=user.id, target_type="user", target_id=user.id, ip=ip)
    _start_session(db, user, request, response)
    return _me(db, user)


@router.post("/login", response_model=MeOut)
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    email = body.email.lower()
    if not limiter.allow(f"login-ip:{ip}", settings.login_rate_per_minute) or not limiter.allow(
        f"login-email:{email}", settings.login_max_failures * 2
    ):
        return JSONResponse({"detail": "Too many attempts. Try again shortly."}, status_code=429)
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    t = now()
    if user and user.locked_until and user.locked_until > t:
        verify_password(body.password, None)  # keep timing uniform
        return JSONResponse({"detail": "Account temporarily locked after repeated failures. Try again later."}, status_code=429)
    ok = verify_password(body.password, user.password_hash if user else None)
    if not user or not ok or not user.is_active:
        if user:
            failures = user.failed_logins + 1
            locked = t + timedelta(minutes=settings.login_lockout_minutes) if failures >= settings.login_max_failures else None
            db.execute(update(User).where(User.id == user.id).values(failed_logins=0 if locked else failures, locked_until=locked))
            _audit_for_user_orgs(db, user, "auth.login_failed", ip, {"locked": bool(locked)})
        # Returned (not raised) so the failure counter and audit entry are committed.
        return JSONResponse({"detail": "Incorrect email or password."}, status_code=401)
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)
    user.failed_logins = 0
    user.locked_until = None
    _start_session(db, user, request, response)
    _audit_for_user_orgs(db, user, "auth.login", ip)
    return _me(db, user)


@router.post("/logout", status_code=204)
def logout(response: Response, p: Principal = Depends(current_principal)):
    p.session.revoked_at = now()
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.status_code = 204
    return response


def _me(db: Session, user: User) -> MeOut:
    set_tenant_context(db, user_id=user.id, org_id=None)
    rows = db.execute(
        select(OrgMembership, Organization)
        .join(Organization, Organization.id == OrgMembership.org_id)
        .where(OrgMembership.user_id == user.id)
        .order_by(Organization.name)
    ).all()
    return MeOut(
        user=UserOut.model_validate(user),
        memberships=[
            MembershipOut(org_id=o.id, org_name=o.name, org_slug=o.slug, role=m.role, deletion_requested_at=o.deletion_requested_at) for m, o in rows
        ],
    )


@router.get("/me", response_model=MeOut)
def me(p: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    return _me(db, p.user)


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(p: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(UserSession)
        .where(UserSession.user_id == p.user.id, UserSession.revoked_at.is_(None), UserSession.expires_at > now())
        .order_by(UserSession.last_seen_at.desc())
    ).all()
    out = []
    for s in rows:
        o = SessionOut.model_validate(s)
        o.ip = str(s.ip) if s.ip else None
        o.current = s.id == p.session.id
        out.append(o)
    return out


@router.delete("/sessions/{session_id}", status_code=204)
def revoke_session(session_id: uuid.UUID, p: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    s = db.scalar(select(UserSession).where(UserSession.id == session_id, UserSession.user_id == p.user.id))
    if not s:
        raise HTTPException(404, "Not found")
    s.revoked_at = now()
    return Response(status_code=204)
