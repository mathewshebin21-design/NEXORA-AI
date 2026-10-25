"""Alembic environment. Migrations run as the table owner, never as the runtime role."""

from alembic import context
from sqlalchemy import create_engine

from nexora.config import get_settings

url = context.config.attributes.get("url") or get_settings().owner_database_url


def run() -> None:
    engine = create_engine(url)
    with engine.connect() as conn:
        context.configure(connection=conn, target_metadata=None)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


run()
