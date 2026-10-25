"""Tenant isolation: cross-organisation access must be impossible through the API and through SQL."""

import uuid

import psycopg
import pytest
from conftest import app_conn, org_id_of, owner_conn, super_conn


@pytest.fixture
def two_orgs(signup):
    a, me_a = signup(email="a@agency-a.example", org="Agency A")
    b, me_b = signup(email="b@agency-b.example", org="Agency B")
    org_a, org_b = org_id_of(me_a), org_id_of(me_b)
    ws_a = a.post(f"/orgs/{org_a}/workspaces", json={"name": "Client A1"}).json()["id"]
    ws_b = b.post(f"/orgs/{org_b}/workspaces", json={"name": "Client B1"}).json()["id"]
    proj_a = a.post(f"/orgs/{org_a}/workspaces/{ws_a}/projects", json={"name": "Secret A"}).json()["id"]
    b.post(f"/orgs/{org_b}/workspaces/{ws_b}/projects", json={"name": "Secret B"})
    return {"a": a, "b": b, "org_a": org_a, "org_b": org_b, "ws_a": ws_a, "ws_b": ws_b, "proj_a": proj_a}


def test_api_denies_cross_org_reads_with_404(two_orgs):
    b, org_a, ws_a, proj_a = two_orgs["b"], two_orgs["org_a"], two_orgs["ws_a"], two_orgs["proj_a"]
    for path in [
        f"/orgs/{org_a}",
        f"/orgs/{org_a}/members",
        f"/orgs/{org_a}/workspaces",
        f"/orgs/{org_a}/workspaces/{ws_a}",
        f"/orgs/{org_a}/workspaces/{ws_a}/projects",
        f"/orgs/{org_a}/workspaces/{ws_a}/projects/{proj_a}",
        f"/orgs/{org_a}/audit-logs",
        f"/orgs/{org_a}/usage",
        f"/orgs/{org_a}/export",
        f"/orgs/{org_a}/workspaces/{ws_a}/export",
        f"/orgs/{org_a}/workspaces/{ws_a}/api-keys",
    ]:
        assert b.get(path).status_code == 404, path


def test_api_denies_cross_org_writes(two_orgs):
    b, org_a, ws_a, proj_a = two_orgs["b"], two_orgs["org_a"], two_orgs["ws_a"], two_orgs["proj_a"]
    assert b.post(f"/orgs/{org_a}/workspaces/{ws_a}/projects", json={"name": "inject"}).status_code == 404
    assert b.patch(f"/orgs/{org_a}/workspaces/{ws_a}/projects/{proj_a}", json={"name": "pwned"}).status_code == 404
    assert b.post(f"/orgs/{org_a}/invitations", json={"email": "x@example.com"}).status_code == 404
    assert b.patch(f"/orgs/{org_a}", json={"name": "pwned"}).status_code == 404


def test_cannot_smuggle_foreign_ids_through_own_org_path(two_orgs):
    b, org_b, ws_a, proj_a, ws_b = two_orgs["b"], two_orgs["org_b"], two_orgs["ws_a"], two_orgs["proj_a"], two_orgs["ws_b"]
    assert b.get(f"/orgs/{org_b}/workspaces/{ws_a}").status_code == 404
    assert b.get(f"/orgs/{org_b}/workspaces/{ws_b}/projects/{proj_a}").status_code == 404
    assert b.get(f"/orgs/{org_b}/audit-logs?workspace_id={ws_a}").json()["items"] == []


def _count(conn, table):
    return conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]


def test_rls_scopes_raw_sql_to_current_org(two_orgs):
    org_a = two_orgs["org_a"]
    with app_conn() as c:
        c.execute("SELECT set_config('app.org_id', %s, false)", (org_a,))
        names = [r[0] for r in c.execute("SELECT name FROM projects").fetchall()]
        assert names == ["Secret A"]
        assert all(r[0] == uuid.UUID(org_a) for r in c.execute("SELECT org_id FROM workspaces").fetchall())
        assert _count(c, "organizations") == 1


def test_rls_without_context_returns_nothing(two_orgs):
    with app_conn() as c:
        for t in [
            "organizations",
            "org_memberships",
            "workspaces",
            "workspace_memberships",
            "projects",
            "api_keys",
            "invitations",
            "audit_logs",
            "usage_events",
        ]:
            assert _count(c, t) == 0, t


def test_rls_with_check_blocks_cross_org_insert(two_orgs):
    with app_conn() as c:
        c.execute("SELECT set_config('app.org_id', %s, false)", (two_orgs["org_a"],))
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            c.execute(
                "INSERT INTO projects (id, org_id, workspace_id, name) VALUES (%s, %s, %s, 'x')",
                (uuid.uuid4(), two_orgs["org_b"], two_orgs["ws_b"]),
            )


def test_runtime_role_cannot_bypass_rls():
    with owner_conn() as c:
        (sup, bypass) = c.execute("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname='nexora_app'").fetchone()
        assert sup is False and bypass is False
        forced = c.execute(
            "SELECT count(*) FROM pg_class WHERE relname IN ('projects','workspaces','audit_logs') AND relforcerowsecurity"
        ).fetchone()[0]
        assert forced == 3


def test_audit_log_is_append_only(two_orgs):
    with app_conn() as c:
        c.execute("SELECT set_config('app.org_id', %s, false)", (two_orgs["org_a"],))
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            c.execute("UPDATE audit_logs SET action='tampered'")
    with app_conn() as c:
        c.execute("SELECT set_config('app.org_id', %s, false)", (two_orgs["org_a"],))
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            c.execute("DELETE FROM audit_logs")
    # Even a superuser (who bypasses RLS) is stopped by the append-only trigger.
    with super_conn() as c:
        assert c.execute("SELECT count(*) FROM audit_logs").fetchone()[0] > 0
        with pytest.raises(psycopg.errors.RaiseException):
            c.execute("UPDATE audit_logs SET action='tampered'")
        with pytest.raises(psycopg.errors.RaiseException):
            c.execute("DELETE FROM audit_logs")
    # The owner role sees nothing without tenant context (FORCE RLS applies to owners too).
    with owner_conn() as c:
        assert c.execute("SELECT count(*) FROM audit_logs").fetchone()[0] == 0
