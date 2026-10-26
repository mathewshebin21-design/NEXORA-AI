"""Data sources: connector catalog, connections, OAuth, syncs and raw data preview."""

import uuid
from datetime import timedelta
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .. import audit
from ..config import get_settings
from ..connectors import ADAPTERS, get_adapter
from ..connectors.base import ConfigError, pkce_pair
from ..connectors.crypto import CredentialsUnavailable, encrypt, live_storage_available
from ..connectors.http import ProviderError, ProviderHttp
from ..db import get_db, set_tenant_context
from ..deps import Principal, WorkspaceContext, client_ip, current_principal, require_ws
from ..models import Connection, FactAdDaily, FactOrder, FactWebDaily, OAuthState, SyncQueue, SyncRun
from ..permissions import P
from ..plans import limits
from ..security import new_token, token_hash
from ..sync import SyncConflict, enqueue
from ..util import now

router = APIRouter(tags=["data-sources"])
settings = get_settings()
Provider = Literal["google_ads", "meta_ads", "ga4", "shopify"]
FACTS = {"ad_daily": FactAdDaily, "orders": FactOrder, "web_daily": FactWebDaily}
TIME_COL = {FactAdDaily: FactAdDaily.date, FactOrder: FactOrder.ordered_at, FactWebDaily: FactWebDaily.date}


# ------------------------------------------------------------------ schemas
class ConnectIn(BaseModel):
    provider: Provider
    mode: Literal["sample", "live"]
    config: dict[str, str] = Field(default_factory=dict)


class SyncIn(BaseModel):
    window_days: int = Field(default=30, ge=1, le=365)


def _run_out(r: SyncRun) -> dict:
    dur = (r.finished_at - r.started_at).total_seconds() if r.finished_at and r.started_at else None
    return {
        "id": str(r.id), "connection_id": str(r.connection_id), "status": r.status, "trigger": r.trigger,
        "window_start": r.window_start.isoformat(), "window_end": r.window_end.isoformat(), "attempt": r.attempt,
        "max_attempts": r.max_attempts, "records_fetched": r.records_fetched, "records_upserted": r.records_upserted,
        "error": r.error, "created_at": r.created_at.isoformat(), "started_at": r.started_at.isoformat() if r.started_at else None,
        "finished_at": r.finished_at.isoformat() if r.finished_at else None, "duration_s": dur,
    }  # fmt: skip


def _conn_out(db: Session, c: Connection) -> dict:
    model = FACTS[get_adapter(c.provider).spec.produces]
    tcol = TIME_COL[model]
    rows, first, last = db.execute(select(func.count(), func.min(tcol), func.max(tcol)).where(model.connection_id == c.id)).one()
    latest = db.scalar(select(SyncRun).where(SyncRun.connection_id == c.id).order_by(SyncRun.created_at.desc()).limit(1))
    return {
        "id": str(c.id), "provider": c.provider, "mode": c.mode, "status": c.status, "display_name": c.display_name,
        "external_account_id": c.external_account_id, "scopes": c.scopes, "config": c.config,
        "last_sync_at": c.last_sync_at.isoformat() if c.last_sync_at else None, "last_error": c.last_error,
        "created_at": c.created_at.isoformat(), "data": {"table": get_adapter(c.provider).spec.produces, "rows": rows,
        "from": first.isoformat()[:10] if first else None, "to": last.isoformat()[:10] if last else None},
        "latest_run": _run_out(latest) if latest else None,
    }  # fmt: skip


# ------------------------------------------------------------------ catalog
@router.get("/connectors")
def catalog(_: Principal = Depends(current_principal)):
    out = []
    for a in ADAPTERS.values():
        missing = a.missing_settings(settings)
        live = a.live_configured(settings) and live_storage_available()
        reason = None
        if not live:
            reason = "OAuth app not configured on this server" if not a.live_configured(settings) else "Credential encryption key not configured"
        out.append({
            "provider": a.spec.key, "name": a.spec.name, "category": a.spec.category, "produces": a.spec.produces,
            "scopes": list(a.spec.scopes), "docs_url": a.spec.docs_url, "setup_note": a.spec.setup_note,
            "config_fields": [{"key": f.key, "label": f.label, "hint": f.hint} for f in a.spec.config_fields],
            "live_available": live, "live_unavailable_reason": reason, "missing_settings": missing if not live else [],
        })  # fmt: skip
    return out


# ------------------------------------------------------------------ connections
WS = "/orgs/{org_id}/workspaces/{workspace_id}"


@router.get(WS + "/connections")
def list_connections(ctx: WorkspaceContext = Depends(require_ws(P.DATA_READ))):
    rows = ctx.db.scalars(
        select(Connection).where(Connection.workspace_id == ctx.workspace.id, Connection.revoked_at.is_(None)).order_by(Connection.created_at)
    ).all()
    return [_conn_out(ctx.db, c) for c in rows]


@router.post(WS + "/connections", status_code=201)
def create_connection(body: ConnectIn, ctx: WorkspaceContext = Depends(require_ws(P.CONNECTIONS_MANAGE))):
    db = ctx.db
    adapter = get_adapter(body.provider)
    if db.scalar(
        select(Connection.id).where(
            Connection.workspace_id == ctx.workspace.id, Connection.provider == body.provider, Connection.revoked_at.is_(None)
        )
    ):
        raise HTTPException(409, f"{adapter.spec.name} is already connected to this workspace. Disconnect it first.")
    cap = limits(ctx.org.plan).get("connections")
    active = db.scalar(select(func.count()).select_from(Connection).where(Connection.org_id == ctx.org.id, Connection.revoked_at.is_(None))) or 0
    if cap is not None and active >= cap:
        raise HTTPException(402, f"Data source limit reached for the {ctx.org.plan} plan ({cap}).")
    try:
        config = adapter.validate_config(body.config, required=body.mode == "live")
    except ConfigError as e:
        raise HTTPException(422, str(e)) from e

    if body.mode == "sample":
        conn = Connection(
            org_id=ctx.org.id,
            workspace_id=ctx.workspace.id,
            provider=body.provider,
            mode="sample",
            status="active",
            display_name=f"{adapter.spec.name} · sample data",
            external_account_id="sample",
            scopes=[],
            config={},
            created_by=ctx.user.id,
        )
        db.add(conn)
        db.flush()
        run, _ = enqueue(db, conn, trigger="initial", requested_by=ctx.user.id)
        audit.record(
            db,
            org_id=ctx.org.id,
            workspace_id=ctx.workspace.id,
            action="connection.created",
            actor_user_id=ctx.user.id,
            target_type="connection",
            target_id=conn.id,
            details={"provider": body.provider, "mode": "sample"},
            ip=ctx.ip,
        )
        return {"connection": _conn_out(db, conn), "run": _run_out(run)}

    # live: start OAuth
    if not adapter.live_configured(settings):
        raise HTTPException(409, f"{adapter.spec.name} live connections aren't configured on this server (missing OAuth app credentials).")
    if not live_storage_available():
        raise HTTPException(409, "Live connections need NEXORA_ENCRYPTION_KEY so tokens can be encrypted at rest.")
    state = new_token()
    verifier, challenge = pkce_pair()
    db.add(
        OAuthState(
            state_hash=token_hash(state),
            org_id=ctx.org.id,
            workspace_id=ctx.workspace.id,
            provider=body.provider,
            code_verifier=verifier,
            config=config,
            created_by=ctx.user.id,
            expires_at=now() + timedelta(minutes=10),
        )
    )
    url = adapter.authorize_url(settings, state=state, code_challenge=challenge, redirect_uri=_redirect_uri(body.provider), config=config)
    audit.record(
        db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="connection.oauth_started",
        actor_user_id=ctx.user.id,
        target_type="connection",
        details={"provider": body.provider},
        ip=ctx.ip,
    )
    return JSONResponse({"authorize_url": url}, status_code=202)


def _redirect_uri(provider: str) -> str:
    return f"{settings.public_base_url}/api/oauth/callback/{provider}"


def _get_conn(ctx: WorkspaceContext, connection_id: uuid.UUID) -> Connection:
    c = ctx.db.scalar(
        select(Connection).where(Connection.id == connection_id, Connection.workspace_id == ctx.workspace.id, Connection.revoked_at.is_(None))
    )
    if not c:
        raise HTTPException(404, "Not found")
    return c


@router.post(WS + "/connections/{connection_id}/sync", status_code=202)
def request_sync(
    connection_id: uuid.UUID,
    body: SyncIn | None = None,
    idempotency_key: str | None = Header(default=None, max_length=120),
    ctx: WorkspaceContext = Depends(require_ws(P.SYNC_RUN)),
):
    conn = _get_conn(ctx, connection_id)
    try:
        run, created = enqueue(
            ctx.db,
            conn,
            trigger="manual",
            window_days=(body or SyncIn()).window_days,
            idempotency_key=f"manual:{idempotency_key}" if idempotency_key else None,
            requested_by=ctx.user.id,
        )
    except SyncConflict as e:
        return JSONResponse({"detail": "A sync is already queued or running for this source.", "run": _run_out(e.run)}, status_code=409)
    if created:
        audit.record(
            ctx.db,
            org_id=ctx.org.id,
            workspace_id=ctx.workspace.id,
            action="sync.requested",
            actor_user_id=ctx.user.id,
            target_type="sync_run",
            target_id=run.id,
            details={"provider": conn.provider, "window_days": (body or SyncIn()).window_days},
            ip=ctx.ip,
        )
    return JSONResponse(_run_out(run), status_code=202 if created else 200)


@router.get(WS + "/connections/{connection_id}/runs")
def list_runs(connection_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_ws(P.DATA_READ))):
    conn = _get_conn(ctx, connection_id)
    runs = ctx.db.scalars(select(SyncRun).where(SyncRun.connection_id == conn.id).order_by(SyncRun.created_at.desc()).limit(25)).all()
    return [_run_out(r) for r in runs]


@router.delete(WS + "/connections/{connection_id}", status_code=204)
def disconnect(connection_id: uuid.UUID, purge_data: bool = False, ctx: WorkspaceContext = Depends(require_ws(P.CONNECTIONS_MANAGE))):
    conn = _get_conn(ctx, connection_id)
    db = ctx.db
    conn.revoked_at, conn.status, conn.credentials = now(), "revoked", None  # tokens are destroyed, not just hidden
    pending = select(SyncRun.id).where(SyncRun.connection_id == conn.id, SyncRun.status == "queued")
    db.execute(delete(SyncQueue).where(SyncQueue.run_id.in_(pending)))
    removed = 0
    if purge_data:
        model = FACTS[get_adapter(conn.provider).spec.produces]
        removed = db.execute(delete(model).where(model.connection_id == conn.id)).rowcount or 0
    audit.record(
        db,
        org_id=ctx.org.id,
        workspace_id=ctx.workspace.id,
        action="connection.revoked",
        actor_user_id=ctx.user.id,
        target_type="connection",
        target_id=conn.id,
        details={"provider": conn.provider, "purged_rows": removed},
        ip=ctx.ip,
    )
    return Response(status_code=204)


# ------------------------------------------------------------------ data preview
@router.get(WS + "/data/{table}")
def preview(
    table: Literal["ad_daily", "orders", "web_daily"],
    limit: int = 50,
    connection_id: uuid.UUID | None = None,
    ctx: WorkspaceContext = Depends(require_ws(P.DATA_READ)),
):
    model = FACTS[table]
    q = select(model).where(model.workspace_id == ctx.workspace.id)
    if connection_id:
        q = q.where(model.connection_id == connection_id)
    rows = ctx.db.scalars(q.order_by(TIME_COL[model].desc()).limit(max(1, min(limit, 200)))).all()
    cols = [c.name for c in model.__table__.columns if c.name not in ("org_id", "workspace_id")]

    def val(v):
        return (
            v.isoformat()
            if hasattr(v, "isoformat")
            else str(v)
            if isinstance(v, uuid.UUID)
            else (float(v) if v.__class__.__name__ == "Decimal" else v)
        )

    return {"table": table, "columns": cols, "rows": [{c: val(getattr(r, c)) for c in cols} for r in rows]}


@router.get(WS + "/data-summary")
def data_summary(ctx: WorkspaceContext = Depends(require_ws(P.DATA_READ))):
    out = {}
    for name, model in FACTS.items():
        tcol = TIME_COL[model]
        n, synth, first, last = ctx.db.execute(
            select(func.count(), func.count().filter(model.is_synthetic), func.min(tcol), func.max(tcol)).where(
                model.workspace_id == ctx.workspace.id
            )
        ).one()
        out[name] = {
            "rows": n,
            "synthetic_rows": synth,
            "from": first.isoformat()[:10] if first else None,
            "to": last.isoformat()[:10] if last else None,
        }
    return out


# ------------------------------------------------------------------ OAuth callback
@router.get("/oauth/callback/{provider}")
def oauth_callback(provider: Provider, request: Request, p: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    params = dict(request.query_params)
    ui = settings.public_base_url

    def back(org_id=None, ws_id=None, error: str | None = None, ok: bool = False):
        path = f"/app/{org_id}/w/{ws_id}/data" if org_id and ws_id else "/app"
        q = f"?connected={provider}" if ok else f"?error={quote((error or 'Connection failed')[:200])}"
        return RedirectResponse(f"{ui}{path}{q}", status_code=303)

    raw_state = params.get("state", "")
    set_tenant_context(db, oauth_state_hash=token_hash(raw_state) if raw_state else None)
    st = db.scalar(select(OAuthState).where(OAuthState.state_hash == token_hash(raw_state))) if raw_state else None
    if not st or st.provider != provider or st.used_at or st.expires_at < now():
        return back(error="This connection link is invalid or expired. Start again from Data sources.")
    if st.created_by != p.user.id:
        return back(error="The connection was started by a different user.")
    set_tenant_context(db, org_id=st.org_id, oauth_state_hash=None)
    st.used_at = now()
    if params.get("error"):
        return back(st.org_id, st.workspace_id, error=f"Provider declined: {params.get('error_description') or params['error']}")
    adapter = get_adapter(provider)
    http = ProviderHttp(provider=provider)
    try:
        adapter.verify_callback(settings, params)
        if provider == "shopify" and params.get("shop", "").lower() != st.config.get("shop"):
            raise ProviderError("Shop in callback does not match the requested shop.", transient=False)
        creds = adapter.exchange_code(
            settings, http, code=params.get("code", ""), code_verifier=st.code_verifier, redirect_uri=_redirect_uri(provider), config=st.config
        )
        conn = Connection(
            org_id=st.org_id,
            workspace_id=st.workspace_id,
            provider=provider,
            mode="live",
            status="active",
            display_name=f"{adapter.spec.name} · {adapter.account_id(st.config, sample=False)}",
            external_account_id=adapter.account_id(st.config, sample=False),
            scopes=list(adapter.spec.scopes),
            credentials=encrypt(creds),
            config=st.config,
            created_by=p.user.id,
        )
        db.add(conn)
        db.flush()
        enqueue(db, conn, trigger="initial", requested_by=p.user.id)
        audit.record(
            db,
            org_id=st.org_id,
            workspace_id=st.workspace_id,
            action="connection.created",
            actor_user_id=p.user.id,
            target_type="connection",
            target_id=conn.id,
            details={"provider": provider, "mode": "live", "account": conn.external_account_id},
            ip=client_ip(request),
        )
        return back(st.org_id, st.workspace_id, ok=True)
    except (ProviderError, CredentialsUnavailable, KeyError, ValueError) as e:
        audit.record(
            db,
            org_id=st.org_id,
            workspace_id=st.workspace_id,
            action="connection.failed",
            actor_user_id=p.user.id,
            target_type="connection",
            details={"provider": provider, "error": str(e)[:300]},
            ip=client_ip(request),
        )
        return back(st.org_id, st.workspace_id, error=str(e))
    finally:
        http.close()
