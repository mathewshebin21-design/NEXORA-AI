"""API keys, audit trail, workspace configuration, export and deletion."""

import json

from conftest import org_id_of, super_conn


def _ws(signup):
    owner, me = signup(email="owner@example.com")
    org = org_id_of(me)
    ws = owner.post(f"/orgs/{org}/workspaces", json={"name": "Lumen"}).json()["id"]
    return owner, org, ws


def test_api_key_shown_once_scoped_and_revocable(signup, make_client):
    owner, org, ws = _ws(signup)
    r = owner.post(f"/orgs/{org}/workspaces/{ws}/api-keys", json={"name": "BI", "scopes": ["workspace:read", "projects:read"]})
    assert r.status_code == 201
    key = r.json()["key"]
    assert key.startswith("nxk_")
    listed = owner.get(f"/orgs/{org}/workspaces/{ws}/api-keys").json()
    assert "key" not in listed[0] and key not in json.dumps(listed)
    with super_conn() as c:
        assert c.execute("SELECT count(*) FROM api_keys WHERE key_hash = %s", (key,)).fetchone()[0] == 0

    api = make_client()
    api.headers.pop("X-Nexora-CSRF")
    auth = {"Authorization": f"Bearer {key}"}
    assert api.get("/v1/workspace", headers=auth).json()["id"] == ws
    assert api.get("/v1/projects", headers=auth).status_code == 200
    assert api.post("/v1/projects", json={"name": "via api"}, headers=auth).status_code == 403  # lacks projects:write
    assert api.get("/v1/workspace", headers={"Authorization": f"Bearer {key[:-4]}abcd"}).status_code == 401
    assert api.get("/v1/workspace").status_code == 401

    assert owner.delete(f"/orgs/{org}/workspaces/{ws}/api-keys/{r.json()['id']}").status_code == 204
    assert api.get("/v1/workspace", headers=auth).status_code == 401


def test_api_key_writes_are_audited_and_metered(signup, make_client):
    owner, org, ws = _ws(signup)
    key = owner.post(f"/orgs/{org}/workspaces/{ws}/api-keys", json={"name": "Zap", "scopes": ["projects:write"]}).json()["key"]
    api = make_client()
    r = api.post("/v1/projects", json={"name": "From Zapier"}, headers={"Authorization": f"Bearer {key}"})
    assert r.status_code == 201
    logs = owner.get(f"/orgs/{org}/audit-logs?action=project.created").json()["items"]
    assert logs[0]["actor_api_key_id"] and logs[0]["actor_label"] == "API key Zap"
    usage = {m["metric"]: m["used"] for m in owner.get(f"/orgs/{org}/usage").json()["metrics"]}
    assert usage["api_requests_month"] == 1


def test_api_key_cannot_reach_other_workspace(signup, make_client):
    owner, org, ws = _ws(signup)
    other = owner.post(f"/orgs/{org}/workspaces", json={"name": "Other"}).json()["id"]
    owner.post(f"/orgs/{org}/workspaces/{other}/projects", json={"name": "Other's project"})
    key = owner.post(f"/orgs/{org}/workspaces/{ws}/api-keys", json={"name": "k", "scopes": ["projects:read"]}).json()["key"]
    names = [p["name"] for p in make_client().get("/v1/projects", headers={"Authorization": f"Bearer {key}"}).json()]
    assert "Other's project" not in names


def test_workspace_settings_validation_and_audit_diff(signup):
    owner, org, ws = _ws(signup)
    assert owner.patch(f"/orgs/{org}/workspaces/{ws}", json={"settings": {"currency": "usd"}}).status_code == 422
    assert owner.patch(f"/orgs/{org}/workspaces/{ws}", json={"settings": {"unknown": 1}}).status_code == 422
    r = owner.patch(f"/orgs/{org}/workspaces/{ws}", json={"settings": {"currency": "EUR", "default_attribution_model": "linear"}})
    assert r.status_code == 200 and r.json()["settings"]["currency"] == "EUR"
    log = owner.get(f"/orgs/{org}/workspaces/{ws}/audit-logs?action=workspace.updated").json()["items"][0]
    assert log["details"]["settings"]["currency"] == {"from": "USD", "to": "EUR"}


def test_audit_pagination(signup):
    owner, org, ws = _ws(signup)
    for i in range(7):
        owner.post(f"/orgs/{org}/workspaces/{ws}/projects", json={"name": f"P{i}"})
    p1 = owner.get(f"/orgs/{org}/audit-logs?action=project.&limit=5").json()
    assert len(p1["items"]) == 5 and p1["next_cursor"]
    p2 = owner.get(f"/orgs/{org}/audit-logs?action=project.&limit=5&cursor={p1['next_cursor']}").json()
    assert len(p2["items"]) == 2 and p2["next_cursor"] is None
    ids = [i["id"] for i in p1["items"] + p2["items"]]
    assert ids == sorted(ids, reverse=True) and len(set(ids)) == 7


def test_workspace_export_contains_data_and_no_secrets(signup):
    owner, org, ws = _ws(signup)
    owner.post(f"/orgs/{org}/workspaces/{ws}/projects", json={"name": "Holiday"})
    key = owner.post(f"/orgs/{org}/workspaces/{ws}/api-keys", json={"name": "k", "scopes": ["projects:read"]}).json()["key"]
    r = owner.get(f"/orgs/{org}/workspaces/{ws}/export")
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    body = r.text
    data = r.json()
    assert data["format"] == "nexora.workspace-export.v1" and data["projects"][0]["name"] == "Holiday"
    assert key not in body and "key_hash" not in body and "password" not in body and "token_hash" not in body
    assert owner.get(f"/orgs/{org}/audit-logs?action=export.").json()["items"][0]["action"] == "export.workspace"


def test_org_export_owner_only(signup, make_client):
    owner, org, ws = _ws(signup)
    r = owner.get(f"/orgs/{org}/export")
    assert r.status_code == 200 and len(r.json()["workspaces"]) == 2


def test_workspace_soft_delete_requires_confirmation_and_revokes_keys(signup, make_client):
    owner, org, ws = _ws(signup)
    key = owner.post(f"/orgs/{org}/workspaces/{ws}/api-keys", json={"name": "k", "scopes": ["workspace:read"]}).json()["key"]
    assert owner.request("DELETE", f"/orgs/{org}/workspaces/{ws}", json={"confirm": "wrong"}).status_code == 422
    assert owner.request("DELETE", f"/orgs/{org}/workspaces/{ws}", json={"confirm": "Lumen"}).status_code == 204
    assert owner.get(f"/orgs/{org}/workspaces/{ws}").status_code == 404
    assert ws not in [w["id"] for w in owner.get(f"/orgs/{org}/workspaces").json()]
    assert make_client().get("/v1/workspace", headers={"Authorization": f"Bearer {key}"}).status_code == 401
    assert owner.get(f"/orgs/{org}/audit-logs?action=workspace.deleted").json()["items"][0]["details"]["mode"] == "soft"


def test_projects_crud(signup):
    owner, org, ws = _ws(signup)
    p = owner.post(f"/orgs/{org}/workspaces/{ws}/projects", json={"name": "  Spring   launch "}).json()
    assert p["name"] == "Spring launch"
    assert owner.patch(f"/orgs/{org}/workspaces/{ws}/projects/{p['id']}", json={"status": "archived"}).json()["status"] == "archived"
    assert owner.get(f"/orgs/{org}/workspaces/{ws}/projects").json() == []
    assert len(owner.get(f"/orgs/{org}/workspaces/{ws}/projects?include_archived=true").json()) == 1
    assert owner.delete(f"/orgs/{org}/workspaces/{ws}/projects/{p['id']}").status_code == 204


def test_purge_removes_org_after_grace_period_only(signup):
    from conftest import DB, SUPER

    from nexora.purge import purge

    owner, org, ws = _ws(signup)
    owner.post(f"/orgs/{org}/workspaces/{ws}/projects", json={"name": "to be purged"})
    slug = owner.get(f"/orgs/{org}").json()["slug"]
    assert owner.post(f"/orgs/{org}/deletion-request", json={"confirm": slug}).status_code == 200
    url = f"{SUPER}/{DB}"
    assert purge(url, grace_days=30) == []  # still inside the grace period
    with super_conn() as c:
        c.execute("UPDATE organizations SET deletion_requested_at = now() - interval '31 days' WHERE id=%s", (org,))
    assert purge(url, grace_days=30) == [org]
    with super_conn() as c:
        for t in ["organizations", "workspaces", "projects", "api_keys", "audit_logs", "org_memberships"]:
            col = "id" if t == "organizations" else "org_id"
            assert c.execute(f"SELECT count(*) FROM {t} WHERE {col}=%s", (org,)).fetchone()[0] == 0, t


def test_real_client_ips_are_recorded_and_serialised():
    """Regression: INET values must serialise in audit and session responses."""
    from fastapi.testclient import TestClient

    from nexora.main import app

    c = TestClient(app, headers={"X-Nexora-CSRF": "1"}, client=("203.0.113.9", 50000))
    me = c.post(
        "/auth/signup", json={"email": "ip@example.com", "password": "correct horse battery staple", "name": "Ip", "org_name": "Ip Co"}
    ).json()
    org = me["memberships"][0]["org_id"]
    logs = c.get(f"/orgs/{org}/audit-logs")
    assert logs.status_code == 200 and logs.json()["items"][0]["ip"] == "203.0.113.9"
    sessions = c.get("/auth/sessions")
    assert sessions.status_code == 200 and sessions.json()[0]["ip"] == "203.0.113.9"
