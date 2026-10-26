"""Test harness: a dedicated PostgreSQL database, migrated as the owner role,
with the app connecting as the RLS-restricted runtime role — the same split as production.

Env:
  NEXORA_TEST_SUPERUSER_URL  default postgresql://postgres@localhost:5433
"""

import os
import subprocess
import uuid
from pathlib import Path

import psycopg
import pytest

SUPER = os.environ.get("NEXORA_TEST_SUPERUSER_URL", "postgresql://postgres@localhost:5433")
DB = "nexora_test"
HOSTPART = SUPER.split("@", 1)[1]
OWNER_URL = f"postgresql+psycopg://nexora_owner:nexora_owner@{HOSTPART}/{DB}"
APP_URL = f"postgresql+psycopg://nexora_app:nexora_app@{HOSTPART}/{DB}"
os.environ["NEXORA_DATABASE_URL"] = APP_URL
os.environ["NEXORA_OWNER_DATABASE_URL"] = OWNER_URL

ROOT = Path(__file__).resolve().parents[1]
TABLES = (
    "fact_ad_daily, fact_orders, fact_web_daily, sync_queue, sync_runs, oauth_states, connections, "
    "usage_events, audit_logs, api_keys, projects, invitations, workspace_memberships, workspaces, org_memberships, organizations, sessions, users"
)


def _bootstrap() -> None:
    with psycopg.connect(f"{SUPER}/postgres", autocommit=True) as c:
        c.execute((ROOT / "scripts/bootstrap_db.sql").read_text())
        c.execute(f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)")
        c.execute(f"CREATE DATABASE {DB} OWNER nexora_owner")
    with psycopg.connect(f"{SUPER}/{DB}", autocommit=True) as c:
        c.execute("REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT ALL ON SCHEMA public TO nexora_owner;")
    env = {**os.environ, "NEXORA_OWNER_DATABASE_URL": OWNER_URL}
    subprocess.run(["alembic", "upgrade", "head"], cwd=ROOT, env=env, check=True, capture_output=True)


_bootstrap()


def super_conn():
    """Superuser on the test DB: bypasses RLS (for fixtures/assertions) but still fires triggers."""
    return psycopg.connect(f"{SUPER}/{DB}", autocommit=True)


def owner_conn():
    """Table owner. Note FORCE ROW LEVEL SECURITY applies to it as well."""
    return psycopg.connect(OWNER_URL.replace("+psycopg", ""), autocommit=True)


def app_conn():
    return psycopg.connect(APP_URL.replace("+psycopg", ""))


@pytest.fixture(autouse=True)
def _clean():
    from nexora.ratelimit import limiter

    limiter.reset()
    with owner_conn() as c:
        c.execute(f"TRUNCATE {TABLES} RESTART IDENTITY CASCADE")
    yield


@pytest.fixture
def make_client():
    from fastapi.testclient import TestClient

    from nexora.main import app

    def _make():
        return TestClient(app, headers={"X-Nexora-CSRF": "1"})

    return _make


PASSWORD = "correct horse battery staple"


@pytest.fixture
def signup(make_client):
    """Create a user + org via the API. Returns (client, me_json)."""

    def _signup(email: str | None = None, org: str = "Acme Agency", name: str = "Test User"):
        c = make_client()
        email = email or f"{uuid.uuid4().hex[:8]}@example.com"
        r = c.post("/auth/signup", json={"email": email, "password": PASSWORD, "name": name, "org_name": org})
        assert r.status_code == 201, r.text
        return c, r.json()

    return _signup


def org_id_of(me: dict) -> str:
    return me["memberships"][0]["org_id"]
