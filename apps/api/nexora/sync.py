"""Sync orchestration: enqueue, claim, run, retry.

Guarantees:
- Idempotent requests: a run is keyed by (connection, idempotency key); repeating a request returns the same run,
  and a connection never has two active runs at once.
- Idempotent writes: facts are upserted on their natural keys, so re-running a window replaces rather than duplicates.
- Bounded retries: transient provider errors are retried with exponential backoff up to `max_attempts`.
- Tenant safety: the queue holds only routing metadata; every run executes under its organisation's RLS context.
"""

import logging
import socket
import uuid
from collections.abc import Callable, Iterable
from datetime import date, timedelta

from sqlalchemy import delete, func, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from . import audit
from .config import Settings, get_settings
from .connectors import get_adapter
from .connectors.crypto import CredentialsUnavailable, decrypt
from .connectors.http import ProviderError, ProviderHttp
from .connectors.records import AdDaily, Order, WebDaily
from .db import SessionLocal, set_tenant_context
from .models import Connection, FactAdDaily, FactOrder, FactWebDaily, SyncQueue, SyncRun
from .util import now

log = logging.getLogger("nexora.sync")
WORKER_ID = f"{socket.gethostname()}:{uuid.uuid4().hex[:6]}"
ACTIVE = ("queued", "running")
BATCH = 500


class SyncConflict(Exception):
    def __init__(self, run: SyncRun):
        self.run = run


def enqueue(
    db: Session,
    conn: Connection,
    *,
    trigger: str,
    window_days: int | None = None,
    idempotency_key: str | None = None,
    requested_by: uuid.UUID | None = None,
) -> tuple[SyncRun, bool]:
    """Create (or return the existing) run. Returns (run, created)."""
    days = window_days or get_settings().sync_default_window_days
    end = now().date() - timedelta(days=1)
    start = end - timedelta(days=days - 1)
    key = idempotency_key or f"{trigger}:{start.isoformat()}:{end.isoformat()}:{now():%Y%m%d%H%M}"
    existing = db.scalar(select(SyncRun).where(SyncRun.connection_id == conn.id, SyncRun.idempotency_key == key))
    if existing:
        return existing, False
    active = db.scalar(select(SyncRun).where(SyncRun.connection_id == conn.id, SyncRun.status.in_(ACTIVE)))
    if active:
        raise SyncConflict(active)
    run = SyncRun(
        org_id=conn.org_id,
        workspace_id=conn.workspace_id,
        connection_id=conn.id,
        status="queued",
        trigger=trigger,
        idempotency_key=key,
        window_start=start,
        window_end=end,
        requested_by=requested_by,
    )
    db.add(run)
    db.flush()
    db.add(SyncQueue(run_id=run.id, org_id=conn.org_id))
    db.flush()
    return run, True


# ---------------------------------------------------------------- upserts
_TARGET = {AdDaily: FactAdDaily, Order: FactOrder, WebDaily: FactWebDaily}
_KEYS = {
    FactAdDaily: ["connection_id", "date", "campaign_id"],
    FactOrder: ["connection_id", "order_id"],
    FactWebDaily: ["connection_id", "date", "channel_group"],
}


def _upsert(db: Session, model, rows: list[dict]) -> int:
    if not rows:
        return 0
    stmt = insert(model).values(rows)
    keys = _KEYS[model]
    stmt = stmt.on_conflict_do_update(
        index_elements=keys,
        set_={c: getattr(stmt.excluded, c) for c in rows[0] if c not in keys} | {"ingested_at": func.now()},
    )
    db.execute(stmt)
    return len(rows)


def write_records(db: Session, run: SyncRun, conn: Connection, records: Iterable, *, synthetic: bool) -> tuple[int, int]:
    fetched = upserted = 0
    buf: dict[type, list[dict]] = {}
    lineage = {"org_id": run.org_id, "workspace_id": run.workspace_id, "connection_id": conn.id, "sync_run_id": run.id, "is_synthetic": synthetic}
    for rec in records:
        model = _TARGET[type(rec)]
        row = rec.model_dump() | lineage
        if model is FactAdDaily:
            row["provider"] = conn.provider
        buf.setdefault(model, []).append(row)
        fetched += 1
        if len(buf[model]) >= BATCH:
            upserted += _upsert(db, model, buf.pop(model))
    for model, rows in buf.items():
        upserted += _upsert(db, model, rows)
    return fetched, upserted


# ---------------------------------------------------------------- worker
def claim(db: Session) -> tuple[uuid.UUID, uuid.UUID] | None:
    row = db.execute(
        text(
            """
            UPDATE sync_queue SET locked_at = now(), locked_by = :w
            WHERE run_id = (
              SELECT run_id FROM sync_queue
              WHERE available_at <= now() AND (locked_at IS NULL OR locked_at < now() - interval '15 minutes')
              ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1)
            RETURNING run_id, org_id
            """
        ),
        {"w": WORKER_ID},
    ).first()
    db.commit()
    return (row[0], row[1]) if row else None


HttpFactory = Callable[[str], ProviderHttp]


def run_one(run_id: uuid.UUID, org_id: uuid.UUID, *, settings: Settings | None = None, http_factory: HttpFactory | None = None) -> str:
    """Execute a claimed run. Returns the final status for this attempt."""
    settings = settings or get_settings()
    http_factory = http_factory or (lambda provider: ProviderHttp(provider=provider))
    with SessionLocal() as db:
        set_tenant_context(db, org_id=org_id)
        run = db.get(SyncRun, run_id)
        conn = db.get(Connection, run.connection_id) if run else None
        if not run or not conn or conn.revoked_at:
            db.execute(delete(SyncQueue).where(SyncQueue.run_id == run_id))
            if run:
                run.status, run.error, run.finished_at = "failed", "Connection was removed before the run started.", now()
            db.commit()
            return "failed"
        if run.attempt >= run.max_attempts:  # a previous attempt crashed mid-run; don't loop forever
            run.status, run.finished_at = "failed", now()
            run.error = run.error or "Run abandoned after repeated interruptions."
            db.execute(delete(SyncQueue).where(SyncQueue.run_id == run.id))
            db.commit()
            return "failed"
        run.status, run.started_at, run.attempt = "running", now(), run.attempt + 1
        db.commit()

        adapter = get_adapter(conn.provider)
        http = None
        try:
            if conn.mode == "sample":
                records = adapter.sample(seed=str(conn.id), start=run.window_start, end=run.window_end, config=conn.config)
            else:
                http = http_factory(conn.provider)
                creds = decrypt(conn.credentials or b"")
                records = adapter.fetch(settings, http, credentials=creds, config=conn.config, start=run.window_start, end=run.window_end)
            fetched, upserted = write_records(db, run, conn, records, synthetic=conn.mode == "sample")
            run.status, run.records_fetched, run.records_upserted, run.finished_at, run.error = "succeeded", fetched, upserted, now(), None
            conn.status, conn.last_sync_at, conn.last_error = "active", now(), None
            db.execute(delete(SyncQueue).where(SyncQueue.run_id == run.id))
            audit.record(
                db,
                org_id=org_id,
                workspace_id=run.workspace_id,
                action="sync.succeeded",
                target_type="sync_run",
                target_id=run.id,
                details={"provider": conn.provider, "mode": conn.mode, "records": upserted, "window": [str(run.window_start), str(run.window_end)]},
            )
            db.commit()
            return "succeeded"
        except Exception as e:  # provider, credential, validation or unexpected errors all end this attempt cleanly
            if not isinstance(e, ProviderError | CredentialsUnavailable | ValueError):
                log.exception("unexpected error in sync run %s", run_id)
            db.rollback()
            set_tenant_context(db, org_id=org_id)
            run, conn = db.get(SyncRun, run_id), db.get(Connection, conn.id)
            transient = isinstance(e, ProviderError) and e.transient
            msg = str(e)[:500]
            if transient and run.attempt < run.max_attempts:
                delay = 30 * (2 ** (run.attempt - 1))
                run.status, run.error = "queued", f"Attempt {run.attempt} failed (will retry in {delay}s): {msg}"
                db.execute(
                    update(SyncQueue)
                    .where(SyncQueue.run_id == run.id)
                    .values(locked_at=None, locked_by=None, available_at=now() + timedelta(seconds=delay))
                )
                db.commit()
                return "retrying"
            run.status, run.error, run.finished_at = "failed", msg, now()
            conn.status, conn.last_error = "error", msg
            db.execute(delete(SyncQueue).where(SyncQueue.run_id == run.id))
            audit.record(
                db,
                org_id=org_id,
                workspace_id=run.workspace_id,
                action="sync.failed",
                target_type="sync_run",
                target_id=run.id,
                details={"provider": conn.provider, "error": msg, "attempts": run.attempt},
            )
            db.commit()
            return "failed"
        finally:
            if http:
                http.close()


def process_available(limit: int = 50, **kw) -> int:
    """Claim and run up to `limit` due jobs. Returns how many were processed."""
    n = 0
    while n < limit:
        with SessionLocal() as db:
            job = claim(db)
        if not job:
            break
        try:
            run_one(*job, **kw)
        except Exception:  # never let one bad job kill the worker
            log.exception("sync run %s crashed", job[0])
        n += 1
    return n


def window_for(days: int) -> tuple[date, date]:
    end = now().date() - timedelta(days=1)
    return end - timedelta(days=days - 1), end
