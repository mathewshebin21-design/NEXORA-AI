"""Connectors: sample sync, idempotency, OAuth (mocked providers), live fetch, retries, parsers, guards, isolation, permissions."""

import json
import uuid
from datetime import date
from decimal import Decimal
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from conftest import org_id_of, super_conn
from cryptography.fernet import Fernet

from nexora.config import get_settings
from nexora.connectors.base import ConfigError
from nexora.connectors.google import parse_ga4, parse_google_ads
from nexora.connectors.http import ProviderError, ProviderHttp
from nexora.connectors.meta import parse_meta_insights
from nexora.connectors.records import AdDaily
from nexora.connectors.shopify import ShopifyAdapter, parse_shopify_orders
from nexora.sync import process_available


@pytest.fixture
def ws(signup):
    owner, me = signup(email="owner@agency.example")
    org = org_id_of(me)
    wid = owner.post(f"/orgs/{org}/workspaces", json={"name": "Client"}).json()["id"]
    return owner, org, wid, f"/orgs/{org}/workspaces/{wid}"


@pytest.fixture
def live_settings(monkeypatch):
    s = get_settings()
    for k, v in {
        "google_client_id": "cid.apps.googleusercontent.com",
        "google_client_secret": "gsecret",
        "google_ads_developer_token": "devtoken",
        "encryption_key": Fernet.generate_key().decode(),
        "shopify_client_id": "shopid",
        "shopify_client_secret": "shopsecret",
    }.items():
        monkeypatch.setattr(s, k, v)
    return s


def _count(sql, *args):
    with super_conn() as c:
        return c.execute(sql, args).fetchone()[0]


# ------------------------------------------------------------------ catalog & sample mode
def test_catalog_lists_providers_and_reports_live_unavailable(ws):
    owner, *_ = ws
    cat = {c["provider"]: c for c in owner.get("/connectors").json()}
    assert set(cat) == {"google_ads", "meta_ads", "ga4", "shopify"}
    assert all(not c["live_available"] and c["live_unavailable_reason"] for c in cat.values())


def test_sample_connection_syncs_synthetic_rows_with_lineage(ws):
    owner, org, wid, base = ws
    r = owner.post(f"{base}/connections", json={"provider": "google_ads", "mode": "sample"})
    assert r.status_code == 201 and r.json()["run"]["status"] == "queued"
    assert process_available() == 1
    conns = owner.get(f"{base}/connections").json()
    assert conns[0]["latest_run"]["status"] == "succeeded"
    assert conns[0]["data"]["rows"] == 90 * 4  # 90-day window × 4 sample campaigns
    assert _count("SELECT count(*) FROM fact_ad_daily WHERE NOT is_synthetic") == 0
    preview = owner.get(f"{base}/data/ad_daily?limit=5").json()
    assert {"sync_run_id", "connection_id", "is_synthetic"} <= set(preview["columns"])
    assert all(row["is_synthetic"] for row in preview["rows"])
    summary = owner.get(f"{base}/data-summary").json()
    assert summary["ad_daily"]["rows"] == summary["ad_daily"]["synthetic_rows"] == 360
    assert owner.get(f"/orgs/{org}/audit-logs?action=sync.succeeded").json()["items"]


def test_all_sample_providers_sync(ws):
    owner, _, _, base = ws
    for p in ("meta_ads", "ga4", "shopify"):
        assert owner.post(f"{base}/connections", json={"provider": p, "mode": "sample"}).status_code == 201
    assert process_available() == 3
    summary = owner.get(f"{base}/data-summary").json()
    assert summary["ad_daily"]["rows"] == 90 * 3 and summary["web_daily"]["rows"] == 90 * 7 and summary["orders"]["rows"] > 3000
    with super_conn() as c:
        assert c.execute("SELECT count(*) FROM fact_orders WHERE customer_ref !~ '^[0-9a-f]{64}$'").fetchone()[0] == 0


def test_resync_is_idempotent_and_requests_are_deduplicated(ws):
    owner, _, _, base = ws
    cid = owner.post(f"{base}/connections", json={"provider": "google_ads", "mode": "sample"}).json()["connection"]["id"]
    process_available()
    with super_conn() as c:
        before = c.execute("SELECT sum(spend), count(*) FROM fact_ad_daily").fetchone()
    r1 = owner.post(f"{base}/connections/{cid}/sync", json={"window_days": 30}, headers={"Idempotency-Key": "abc-1"})
    assert r1.status_code == 202
    r2 = owner.post(f"{base}/connections/{cid}/sync", json={"window_days": 30}, headers={"Idempotency-Key": "abc-1"})
    assert r2.status_code == 200 and r2.json()["id"] == r1.json()["id"]
    r3 = owner.post(f"{base}/connections/{cid}/sync", json={"window_days": 7})
    assert r3.status_code == 409 and r3.json()["run"]["id"] == r1.json()["id"]
    assert process_available() == 1
    with super_conn() as c:
        after = c.execute("SELECT sum(spend), count(*) FROM fact_ad_daily").fetchone()
    assert before == after  # same window re-synced: rows replaced, not duplicated
    runs = owner.get(f"{base}/connections/{cid}/runs").json()
    assert [r["status"] for r in runs] == ["succeeded", "succeeded"] and runs[0]["records_upserted"] == 30 * 4


def test_one_connection_per_provider_and_disconnect_with_purge(ws):
    owner, org, _, base = ws
    cid = owner.post(f"{base}/connections", json={"provider": "shopify", "mode": "sample"}).json()["connection"]["id"]
    assert owner.post(f"{base}/connections", json={"provider": "shopify", "mode": "sample"}).status_code == 409
    process_available()
    assert _count("SELECT count(*) FROM fact_orders") > 0
    assert owner.delete(f"{base}/connections/{cid}?purge_data=true").status_code == 204
    assert _count("SELECT count(*) FROM fact_orders") == 0
    assert owner.get(f"{base}/connections").json() == []
    assert owner.post(f"{base}/connections", json={"provider": "shopify", "mode": "sample"}).status_code == 201
    log = owner.get(f"/orgs/{org}/audit-logs?action=connection.revoked").json()["items"][0]
    assert log["details"]["purged_rows"] > 0


# ------------------------------------------------------------------ live mode / OAuth
def test_live_connect_refused_without_configuration(ws):
    owner, _, _, base = ws
    r = owner.post(f"{base}/connections", json={"provider": "google_ads", "mode": "live", "config": {"customer_id": "123-456-7890"}})
    assert r.status_code == 409 and "aren't configured" in r.json()["detail"]


def _start_google(owner, base):
    r = owner.post(f"{base}/connections", json={"provider": "google_ads", "mode": "live", "config": {"customer_id": "123-456-7890"}})
    assert r.status_code == 202, r.text
    url = urlparse(r.json()["authorize_url"])
    q = parse_qs(url.query)
    assert url.netloc == "accounts.google.com" and q["code_challenge_method"] == ["S256"] and q["access_type"] == ["offline"]
    return q["state"][0]


def test_oauth_callback_creates_encrypted_live_connection(ws, live_settings, monkeypatch, make_client):
    owner, org, wid, base = ws
    from nexora.connectors.google import GoogleAdsAdapter

    monkeypatch.setattr(GoogleAdsAdapter, "exchange_code", lambda self, *a, **k: {"refresh_token": "1//secret-refresh-token"})
    state = _start_google(owner, base)
    r = owner.get(f"/oauth/callback/google_ads?code=abc&state={state}", follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"].endswith(f"/app/{org}/w/{wid}/data?connected=google_ads")
    conns = owner.get(f"{base}/connections").json()
    assert conns[0]["mode"] == "live" and conns[0]["external_account_id"] == "1234567890" and conns[0]["latest_run"]["status"] == "queued"
    with super_conn() as c:
        blob = bytes(c.execute("SELECT credentials FROM connections").fetchone()[0])
    assert b"secret-refresh-token" not in blob
    # states are single-use
    r = owner.get(f"/oauth/callback/google_ads?code=abc&state={state}", follow_redirects=False)
    assert "error=" in r.headers["location"]


def test_oauth_state_is_bound_to_the_initiating_user(ws, live_settings, signup):
    owner, _, _, base = ws
    state = _start_google(owner, base)
    intruder, _ = signup(email="intruder@example.com", org="Other")
    r = intruder.get(f"/oauth/callback/google_ads?code=abc&state={state}", follow_redirects=False)
    assert "different%20user" in r.headers["location"]
    assert owner.get(f"{base}/connections").json() == []


def _mock_google(handler_extra):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "oauth2.googleapis.com":
            return httpx.Response(200, json={"access_token": "ya29.token", "expires_in": 3599})
        return handler_extra(request)

    return handler


GADS_PAYLOAD = [
    {
        "results": [
            {
                "campaign": {"id": "111", "name": "Brand"},
                "customer": {"currencyCode": "EUR"},
                "segments": {"date": "2026-10-01"},
                "metrics": {"impressions": "1000", "clicks": "50", "costMicros": "12345678", "conversions": 3.5, "conversionsValue": 420.0},
            }
        ]
    }
]


def _live_conn(owner, base, monkeypatch):
    from nexora.connectors.google import GoogleAdsAdapter

    monkeypatch.setattr(GoogleAdsAdapter, "exchange_code", lambda self, *a, **k: {"refresh_token": "rt"})
    state = _start_google(owner, base)
    owner.get(f"/oauth/callback/google_ads?code=abc&state={state}", follow_redirects=False)
    return owner.get(f"{base}/connections").json()[0]["id"]


def test_live_sync_fetches_parses_and_stores_real_rows(ws, live_settings, monkeypatch):
    owner, _, _, base = ws
    _live_conn(owner, base, monkeypatch)
    seen = {}

    def ads(request):
        seen["auth"] = request.headers["authorization"]
        seen["dev"] = request.headers["developer-token"]
        seen["path"] = request.url.path
        seen["query"] = json.loads(request.content)["query"]
        return httpx.Response(200, json=GADS_PAYLOAD)

    factory = lambda p: ProviderHttp(provider=p, transport=httpx.MockTransport(_mock_google(ads)), min_interval_s=0, sleep=lambda s: None)  # noqa: E731
    assert process_available(http_factory=factory) == 1
    assert seen["auth"] == "Bearer ya29.token" and seen["dev"] == "devtoken" and seen["path"] == "/v26/customers/1234567890/googleAds:searchStream"
    assert "FROM campaign" in seen["query"]
    with super_conn() as c:
        row = c.execute("SELECT spend, currency, is_synthetic, platform_conversions FROM fact_ad_daily").fetchone()
    assert row == (Decimal("12.3457"), "EUR", False, Decimal("3.5000"))


def test_transient_errors_retry_with_backoff_then_fail(ws, live_settings, monkeypatch):
    owner, org, _, base = ws
    _live_conn(owner, base, monkeypatch)
    factory = lambda p: ProviderHttp(
        provider=p, transport=httpx.MockTransport(_mock_google(lambda r: httpx.Response(503))), max_retries=0, sleep=lambda s: None
    )  # noqa: E731
    assert process_available(http_factory=factory) == 1
    run = owner.get(f"{base}/connections").json()[0]["latest_run"]
    assert run["status"] == "queued" and run["attempt"] == 1 and "will retry" in run["error"]
    assert process_available(http_factory=factory) == 0  # backoff: not yet due
    for _ in range(2):
        with super_conn() as c:
            c.execute("UPDATE sync_queue SET available_at = now() - interval '1 second'")
        process_available(http_factory=factory)
    conn = owner.get(f"{base}/connections").json()[0]
    assert conn["latest_run"]["status"] == "failed" and conn["latest_run"]["attempt"] == 3 and conn["status"] == "error"
    assert _count("SELECT count(*) FROM sync_queue") == 0
    assert owner.get(f"/orgs/{org}/audit-logs?action=sync.failed").json()["items"][0]["details"]["attempts"] == 3


def test_permanent_errors_fail_without_retry(ws, live_settings, monkeypatch):
    owner, _, _, base = ws
    _live_conn(owner, base, monkeypatch)
    factory = lambda p: ProviderHttp(
        provider=p, transport=httpx.MockTransport(_mock_google(lambda r: httpx.Response(401, text="bad token"))), sleep=lambda s: None
    )  # noqa: E731
    process_available(http_factory=factory)
    run = owner.get(f"{base}/connections").json()[0]["latest_run"]
    assert run["status"] == "failed" and run["attempt"] == 1 and "HTTP 401" in run["error"]


def test_http_client_honours_retry_after():
    calls, sleeps = [], []

    def handler(request):
        calls.append(1)
        return httpx.Response(429, headers={"retry-after": "7"}) if len(calls) < 3 else httpx.Response(200, json={"ok": True})

    http = ProviderHttp(provider="t", transport=httpx.MockTransport(handler), min_interval_s=0, sleep=sleeps.append)
    assert http.request("GET", "https://example.test/x").json() == {"ok": True}
    assert sleeps == [7.0, 7.0]


# ------------------------------------------------------------------ parsers (documented response shapes)
def test_parse_google_ads_converts_micros_and_strings():
    (r,) = list(parse_google_ads(GADS_PAYLOAD, account_id="1"))
    assert r.spend == Decimal("12.3457") and r.impressions == 1000 and r.date == date(2026, 10, 1) and r.currency == "EUR"


def test_parse_ga4_rows():
    report = {"rows": [{"dimensionValues": [{"value": "20261002"}, {"value": "Paid Search"}],
                        "metricValues": [{"value": "120"}, {"value": "80"}, {"value": "4"}, {"value": "512.5"}]}], "rowCount": 1}  # fmt: skip
    (r,) = list(parse_ga4(report))
    assert (r.date, r.channel_group, r.sessions, r.purchase_revenue) == (date(2026, 10, 2), "Paid Search", 120, Decimal("512.5"))


def test_parse_meta_counts_one_purchase_type_only():
    page = {"data": [{"campaign_id": "9", "campaign_name": "Hearth", "date_start": "2026-10-03", "impressions": "5000", "clicks": "70", "spend": "48.10",
                      "account_currency": "USD",
                      "actions": [{"action_type": "purchase", "value": "4"}, {"action_type": "omni_purchase", "value": "5"},
                                  {"action_type": "link_click", "value": "70"}],
                      "action_values": [{"action_type": "omni_purchase", "value": "600"}, {"action_type": "purchase", "value": "480"}]}]}  # fmt: skip
    (r,) = list(parse_meta_insights(page, account_id="1"))
    assert r.platform_conversions == Decimal(5) and r.platform_conversion_value == Decimal(600) and r.spend == Decimal("48.10")


def test_parse_shopify_hashes_customer_and_reads_utm():
    conn = {"edges": [{"node": {"id": "gid://shopify/Order/555", "createdAt": "2026-10-04T10:00:00Z", "displayFinancialStatus": "PAID",
                                "currentTotalPriceSet": {"shopMoney": {"amount": "149.00", "currencyCode": "USD"}},
                                "customer": {"id": "gid://shopify/Customer/77"},
                                "customerJourneySummary": {"firstVisit": {"utmParameters": {"source": "google", "medium": "cpc", "campaign": "brand"}}}}}],
            "pageInfo": {"hasNextPage": False, "endCursor": None}}  # fmt: skip
    (o,) = list(parse_shopify_orders(conn))
    assert o.order_id == "555" and o.total_revenue == Decimal("149.00") and o.utm_medium == "cpc" and o.financial_status == "paid"
    assert len(o.customer_ref) == 64 and "77" not in o.customer_ref and o.is_first_order is None


def test_records_reject_invalid_values():
    with pytest.raises(ValueError):
        AdDaily(account_id="1", date=date(2026, 1, 1), campaign_id="c", campaign_name="n", impressions=1, clicks=1,
                spend=Decimal("-1"), platform_conversions=Decimal(0), platform_conversion_value=Decimal(0), currency="USD")  # fmt: skip
    with pytest.raises(ValueError):
        AdDaily(account_id="1", date=date(2026, 1, 1), campaign_id="c", campaign_name="n", impressions=1, clicks=1,
                spend=Decimal(1), platform_conversions=Decimal(0), platform_conversion_value=Decimal(0), currency="usd")  # fmt: skip


# ------------------------------------------------------------------ security guards
def test_shopify_domain_guard_blocks_ssrf_and_hmac_is_verified(ws, live_settings):
    owner, _, _, base = ws
    for bad in ["evil.com", "x.myshopify.com.evil.com", "169.254.169.254", "a.myshopify.com/../x"]:
        r = owner.post(f"{base}/connections", json={"provider": "shopify", "mode": "live", "config": {"shop": bad}})
        assert r.status_code == 422, bad
    a = ShopifyAdapter()
    import hashlib
    import hmac as hm

    params = {"code": "c", "shop": "store.myshopify.com", "state": "s", "timestamp": "1"}
    msg = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    good = hm.new(b"shopsecret", msg.encode(), hashlib.sha256).hexdigest()
    a.verify_callback(live_settings, params | {"hmac": good})
    with pytest.raises(ProviderError):
        a.verify_callback(live_settings, params | {"hmac": "0" * 64})
    with pytest.raises(ConfigError):
        a.validate_config({"shop": "store.myshopify.com.attacker.io"}, required=True)


def test_connector_data_is_tenant_isolated(ws, signup):
    owner, org, wid, base = ws
    owner.post(f"{base}/connections", json={"provider": "ga4", "mode": "sample"})
    process_available()
    other, me_b = signup(email="b@other.example", org="Other")
    for path in [f"{base}/connections", f"{base}/data/web_daily", f"{base}/data-summary"]:
        assert other.get(path).status_code == 404
    from conftest import app_conn

    with app_conn() as c:
        c.execute("SELECT set_config('app.org_id', %s, false)", (org_id_of(me_b),))
        for t in ["connections", "sync_runs", "fact_web_daily", "oauth_states"]:
            assert c.execute(f"SELECT count(*) FROM {t}").fetchone()[0] == 0, t
    cols = {r[0] for r in super_conn().execute("SELECT column_name FROM information_schema.columns WHERE table_name='sync_queue'").fetchall()}
    assert cols == {"run_id", "org_id", "available_at", "locked_at", "locked_by"}  # routing metadata only


def test_connector_permissions(ws, make_client):
    owner, org, wid, base = ws
    from test_rbac import _invite_and_accept

    viewer, _ = _invite_and_accept(owner, make_client, org, "v@client.example", workspace_id=wid, workspace_role="client_viewer")
    strategist, _ = _invite_and_accept(owner, make_client, org, "s@agency.example", workspace_id=wid, workspace_role="strategist")
    assert viewer.get(f"{base}/connections").status_code == 403
    assert viewer.get(f"{base}/data/orders").status_code == 403
    assert strategist.post(f"{base}/connections", json={"provider": "shopify", "mode": "sample"}).status_code == 403
    cid = owner.post(f"{base}/connections", json={"provider": "shopify", "mode": "sample"}).json()["connection"]["id"]
    process_available()
    assert strategist.post(f"{base}/connections/{cid}/sync", json={"window_days": 3}).status_code == 202
    assert strategist.delete(f"{base}/connections/{cid}").status_code == 403


def test_unknown_connection_ids_404(ws):
    owner, _, _, base = ws
    assert owner.post(f"{base}/connections/{uuid.uuid4()}/sync").status_code == 404


def test_deleting_workspace_revokes_connections_and_tokens(ws, live_settings, monkeypatch):
    owner, org, wid, base = ws
    _live_conn(owner, base, monkeypatch)
    assert owner.request("DELETE", base, json={"confirm": "Client"}).status_code == 204
    with super_conn() as c:
        status, creds = c.execute("SELECT status, credentials FROM connections").fetchone()
    assert status == "revoked" and creds is None
