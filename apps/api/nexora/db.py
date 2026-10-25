"""Database engine, sessions and per-transaction tenant context.

Tenant isolation is enforced by PostgreSQL row-level security. The runtime
role cannot bypass RLS; every transaction carries `app.*` settings that the
policies read. Context is stored on the Session and re-applied at the start
of every transaction, so it survives commits within a request.
"""

from collections.abc import Iterator
from uuid import UUID

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from .config import get_settings

_settings = get_settings()
engine = create_engine(_settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

CONTEXT_KEYS = ("user_id", "org_id", "invite_token_hash", "api_key_prefix")


def _apply_context(session: Session, connection) -> None:
    ctx = session.info.get("tenant", {})
    params = {k: str(ctx[k]) if ctx.get(k) is not None else "" for k in CONTEXT_KEYS}
    connection.execute(
        text(
            "SELECT set_config('app.user_id', :user_id, true), set_config('app.org_id', :org_id, true), "
            "set_config('app.invite_token_hash', :invite_token_hash, true), "
            "set_config('app.api_key_prefix', :api_key_prefix, true)"
        ),
        params,
    )


@event.listens_for(Session, "after_begin")
def _after_begin(session: Session, transaction, connection) -> None:
    _apply_context(session, connection)


def set_tenant_context(session: Session, **values: UUID | str | None) -> None:
    """Update tenant context and apply it to the current transaction immediately.

    Pending writes are flushed first so each row is written under the context it was created in.
    """
    if session.new or session.dirty or session.deleted:
        session.flush()
    ctx = dict(session.info.get("tenant", {}))
    for k, v in values.items():
        if k not in CONTEXT_KEYS:
            raise ValueError(f"unknown context key {k}")
        ctx[k] = v
    session.info["tenant"] = ctx
    if session.in_transaction():
        _apply_context(session, session.connection())


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
