from conftest import PASSWORD, org_id_of, super_conn


def test_signup_creates_org_owner_and_demo_workspace(signup):
    c, me = signup(email="Owner@Example.com", org="Halcyon Growth")
    assert me["user"]["email"] == "owner@example.com"
    assert me["memberships"][0]["role"] == "owner"
    org = org_id_of(me)
    ws = c.get(f"/orgs/{org}/workspaces").json()
    assert len(ws) == 1 and ws[0]["is_demo"] is True
    assert c.get("/auth/me").status_code == 200


def test_session_cookie_is_httponly_and_lax(make_client):
    c = make_client()
    r = c.post("/auth/signup", json={"email": "a@example.com", "password": PASSWORD, "name": "A", "org_name": "A Co"})
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie and "nx_session=" in cookie


def test_password_stored_as_argon2_and_sessions_hashed(signup):
    c, me = signup(email="hash@example.com")
    raw = c.cookies.get("nx_session")
    with super_conn() as conn:
        (h,) = conn.execute("SELECT password_hash FROM users WHERE email='hash@example.com'").fetchone()
        assert h.startswith("$argon2id$") and PASSWORD not in h
        rows = conn.execute("SELECT token_hash FROM sessions").fetchall()
        assert raw not in [r[0] for r in rows] and all(len(r[0]) == 64 for r in rows)


def test_weak_password_and_duplicate_email(make_client, signup):
    c = make_client()
    r = c.post("/auth/signup", json={"email": "w@example.com", "password": "short", "name": "W", "org_name": "W"})
    assert r.status_code == 422
    signup(email="dup@example.com")
    r = make_client().post("/auth/signup", json={"email": "DUP@example.com", "password": PASSWORD, "name": "D", "org_name": "D"})
    assert r.status_code == 409


def test_login_logout_and_generic_errors(signup, make_client):
    signup(email="log@example.com")
    c = make_client()
    assert c.post("/auth/login", json={"email": "log@example.com", "password": "wrong password!!"}).json()["detail"] == "Incorrect email or password."
    assert (
        c.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong password!!"}).json()["detail"] == "Incorrect email or password."
    )
    r = c.post("/auth/login", json={"email": "LOG@example.com", "password": PASSWORD})
    assert r.status_code == 200
    assert c.get("/auth/me").status_code == 200
    assert c.post("/auth/logout").status_code == 204
    assert c.get("/auth/me").status_code == 401


def test_lockout_after_repeated_failures_and_audit(signup, make_client):
    owner, me = signup(email="lock@example.com")
    c = make_client()
    for _ in range(5):
        assert c.post("/auth/login", json={"email": "lock@example.com", "password": "nope nope nope"}).status_code == 401
    # Correct password is refused while locked
    assert c.post("/auth/login", json={"email": "lock@example.com", "password": PASSWORD}).status_code == 429
    logs = owner.get(f"/orgs/{org_id_of(me)}/audit-logs?action=auth.login_failed").json()["items"]
    assert len(logs) == 5 and logs[0]["details"]["locked"] is True


def test_csrf_header_and_origin_required_for_cookie_writes(signup):
    c, me = signup()
    org = org_id_of(me)
    r = c.post(f"/orgs/{org}/workspaces", json={"name": "X"}, headers={"X-Nexora-CSRF": ""})
    assert r.status_code == 403
    r = c.post(f"/orgs/{org}/workspaces", json={"name": "X"}, headers={"Origin": "https://evil.example"})
    assert r.status_code == 403
    r = c.post(f"/orgs/{org}/workspaces", json={"name": "X"}, headers={"Origin": "http://localhost:3000"})
    assert r.status_code == 201


def test_sessions_list_and_revoke_other_device(signup, make_client):
    c1, _ = signup(email="multi@example.com")
    c2 = make_client()
    c2.post("/auth/login", json={"email": "multi@example.com", "password": PASSWORD})
    sessions = c1.get("/auth/sessions").json()
    assert len(sessions) == 2 and sum(s["current"] for s in sessions) == 1
    other = next(s for s in sessions if not s["current"])
    assert c1.delete(f"/auth/sessions/{other['id']}").status_code == 204
    assert c2.get("/auth/me").status_code == 401
    assert c1.get("/auth/me").status_code == 200


def test_security_headers(make_client):
    r = make_client().get("/health")
    assert r.status_code == 200
    assert r.headers["x-frame-options"] == "DENY" and r.headers["x-content-type-options"] == "nosniff" and r.headers["x-request-id"]
