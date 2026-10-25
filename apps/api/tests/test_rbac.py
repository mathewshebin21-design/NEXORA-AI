"""Roles, permissions, invitations and membership rules."""

from conftest import PASSWORD, org_id_of, super_conn


def _invite_and_accept(owner, make_client, org, email, org_role="member", workspace_id=None, workspace_role=None):
    body = {"email": email, "org_role": org_role}
    if workspace_id:
        body |= {"workspace_id": workspace_id, "workspace_role": workspace_role}
    r = owner.post(f"/orgs/{org}/invitations", json=body)
    assert r.status_code == 201, r.text
    token = r.json()["accept_url"].rsplit("/", 1)[1]
    c = make_client()
    lk = c.get(f"/invitations/lookup?token={token}").json()
    assert lk["email"] == email and lk["status"] == "pending"
    r = c.post("/invitations/accept", json={"token": token, "name": email.split("@")[0], "password": PASSWORD})
    assert r.status_code == 200, r.text
    return c, token


def _setup(signup):
    owner, me = signup(email="owner@example.com")
    org = org_id_of(me)
    ws1 = owner.post(f"/orgs/{org}/workspaces", json={"name": "Client One"}).json()["id"]
    ws2 = owner.post(f"/orgs/{org}/workspaces", json={"name": "Client Two"}).json()["id"]
    return owner, org, ws1, ws2


def test_client_viewer_is_read_only_and_scoped_to_assigned_workspace(signup, make_client):
    owner, org, ws1, ws2 = _setup(signup)
    viewer, _ = _invite_and_accept(owner, make_client, org, "viewer@client.example", workspace_id=ws1, workspace_role="client_viewer")
    assert viewer.get(f"/orgs/{org}/workspaces/{ws1}").status_code == 200
    assert [w["id"] for w in viewer.get(f"/orgs/{org}/workspaces").json()] == [ws1]
    assert viewer.get(f"/orgs/{org}/workspaces/{ws2}").status_code == 404
    assert viewer.post(f"/orgs/{org}/workspaces/{ws1}/projects", json={"name": "x"}).status_code == 403
    assert viewer.get(f"/orgs/{org}/workspaces/{ws1}/projects").status_code == 403
    assert viewer.get(f"/orgs/{org}/workspaces/{ws1}/api-keys").status_code == 403
    assert viewer.get(f"/orgs/{org}/workspaces/{ws1}/export").status_code == 403
    assert viewer.post(f"/orgs/{org}/invitations", json={"email": "z@example.com"}).status_code == 403
    assert viewer.post(f"/orgs/{org}/workspaces", json={"name": "mine"}).status_code == 403
    assert viewer.get(f"/orgs/{org}/audit-logs").status_code == 403


def test_analyst_can_write_projects_and_export_but_not_delete(signup, make_client):
    owner, org, ws1, _ = _setup(signup)
    analyst, _ = _invite_and_accept(owner, make_client, org, "analyst@example.com", workspace_id=ws1, workspace_role="analyst")
    assert analyst.post(f"/orgs/{org}/workspaces/{ws1}/projects", json={"name": "Q4 plan"}).status_code == 201
    assert analyst.get(f"/orgs/{org}/workspaces/{ws1}/export").status_code == 200
    assert analyst.request("DELETE", f"/orgs/{org}/workspaces/{ws1}", json={"confirm": "Client One"}).status_code == 403
    assert analyst.patch(f"/orgs/{org}/workspaces/{ws1}", json={"name": "renamed"}).status_code == 403


def test_workspace_admin_manages_keys_and_members_but_not_deletion(signup, make_client):
    owner, org, ws1, _ = _setup(signup)
    wa, _ = _invite_and_accept(owner, make_client, org, "wa@example.com", workspace_id=ws1, workspace_role="workspace_admin")
    assert wa.post(f"/orgs/{org}/workspaces/{ws1}/api-keys", json={"name": "ci", "scopes": ["projects:read"]}).status_code == 201
    assert wa.patch(f"/orgs/{org}/workspaces/{ws1}", json={"name": "Client One Ltd"}).status_code == 200
    assert wa.request("DELETE", f"/orgs/{org}/workspaces/{ws1}", json={"confirm": "Client One Ltd"}).status_code == 403


def test_owner_rules(signup, make_client):
    owner, me = signup(email="owner@example.com")
    org = org_id_of(me)
    admin, _ = _invite_and_accept(owner, make_client, org, "admin@example.com", org_role="admin")
    owner_id = me["user"]["id"]
    admin_id = admin.get("/auth/me").json()["user"]["id"]
    # admin cannot touch the owner, nor mint owners
    assert admin.patch(f"/orgs/{org}/members/{owner_id}", json={"role": "member"}).status_code == 403
    assert admin.patch(f"/orgs/{org}/members/{admin_id}", json={"role": "owner"}).status_code == 403
    assert admin.delete(f"/orgs/{org}/members/{owner_id}").status_code == 403
    # last owner cannot demote or leave
    assert owner.patch(f"/orgs/{org}/members/{owner_id}", json={"role": "admin"}).status_code == 409
    assert owner.delete(f"/orgs/{org}/members/{owner_id}").status_code == 409
    # promote, then the original owner may step down
    assert owner.patch(f"/orgs/{org}/members/{admin_id}", json={"role": "owner"}).status_code == 200
    assert owner.patch(f"/orgs/{org}/members/{owner_id}", json={"role": "admin"}).status_code == 200
    # admin (now) cannot request deletion; owner can
    assert owner.post(f"/orgs/{org}/deletion-request", json={"confirm": me["memberships"][0]["org_slug"]}).status_code == 403
    assert admin.post(f"/orgs/{org}/deletion-request", json={"confirm": "wrong"}).status_code == 422
    assert admin.post(f"/orgs/{org}/deletion-request", json={"confirm": me["memberships"][0]["org_slug"]}).status_code == 200
    assert admin.delete(f"/orgs/{org}/deletion-request").json()["deletion_requested_at"] is None


def test_removing_member_drops_workspace_access(signup, make_client):
    owner, org, ws1, _ = _setup(signup)
    m, _ = _invite_and_accept(owner, make_client, org, "m@example.com", workspace_id=ws1, workspace_role="strategist")
    mid = m.get("/auth/me").json()["user"]["id"]
    assert owner.delete(f"/orgs/{org}/members/{mid}").status_code == 204
    assert m.get(f"/orgs/{org}/workspaces/{ws1}").status_code == 404
    with super_conn() as c:
        assert c.execute("SELECT count(*) FROM workspace_memberships WHERE user_id=%s", (mid,)).fetchone()[0] == 0


def test_invitation_lifecycle_rules(signup, make_client):
    owner, me = signup(email="owner@example.com")
    org = org_id_of(me)
    r = owner.post(f"/orgs/{org}/invitations", json={"email": "invitee@example.com"})
    token = r.json()["accept_url"].rsplit("/", 1)[1]
    # someone signed in as a different email cannot accept
    other, _ = signup(email="other@example.com", org="Other")
    assert other.post("/invitations/accept", json={"token": token}).status_code == 403
    # revoked invitations are dead
    assert owner.delete(f"/orgs/{org}/invitations/{r.json()['id']}").status_code == 204
    assert make_client().post("/invitations/accept", json={"token": token, "name": "I", "password": PASSWORD}).status_code == 410
    # expired invitations are dead
    r2 = owner.post(f"/orgs/{org}/invitations", json={"email": "late@example.com"})
    with super_conn() as c:
        c.execute("UPDATE invitations SET expires_at = now() - interval '1 day' WHERE id=%s", (r2.json()["id"],))
    t2 = r2.json()["accept_url"].rsplit("/", 1)[1]
    assert make_client().post("/invitations/accept", json={"token": t2, "name": "L", "password": PASSWORD}).status_code == 410
    assert make_client().get("/invitations/lookup?token=not-a-real-token-value").status_code == 404
    # invitations never reveal the raw token after creation
    assert all("accept_url" not in i for i in owner.get(f"/orgs/{org}/invitations").json())


def test_existing_account_must_sign_in_to_accept(signup, make_client):
    owner, me = signup(email="owner@example.com")
    org = org_id_of(me)
    existing, _ = signup(email="exists@example.com", org="Elsewhere")
    token = owner.post(f"/orgs/{org}/invitations", json={"email": "exists@example.com"}).json()["accept_url"].rsplit("/", 1)[1]
    assert make_client().post("/invitations/accept", json={"token": token, "name": "x", "password": PASSWORD}).status_code == 409
    assert existing.post("/invitations/accept", json={"token": token}).status_code == 200
    assert {m["org_id"] for m in existing.get("/orgs").json()} >= {org}


def test_plan_limits_on_seats_and_workspaces(signup):
    owner, me = signup()
    org = org_id_of(me)
    for i in range(4):  # trial: 5 seats incl. owner
        assert owner.post(f"/orgs/{org}/invitations", json={"email": f"s{i}@example.com"}).status_code == 201
    assert owner.post(f"/orgs/{org}/invitations", json={"email": "s9@example.com"}).status_code == 402
    # trial: 3 workspaces (signup created the demo one)
    assert owner.post(f"/orgs/{org}/workspaces", json={"name": "W2"}).status_code == 201
    assert owner.post(f"/orgs/{org}/workspaces", json={"name": "W3"}).status_code == 201
    assert owner.post(f"/orgs/{org}/workspaces", json={"name": "W4"}).status_code == 402
    usage = {m["metric"]: m for m in owner.get(f"/orgs/{org}/usage").json()["metrics"]}
    assert usage["seats"]["used"] == 5 and usage["workspaces"]["used"] == 3
