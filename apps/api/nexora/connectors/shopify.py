"""Shopify Admin GraphQL adapter (orders → measured revenue).

OAuth: per-shop authorization-code flow with offline (non-expiring) access token.
Callback integrity is verified with the HMAC Shopify appends to the redirect.
Customer identifiers are stored only as SHA-256 hashes; no names, emails or addresses.
"""

import hashlib
import hmac
import re
from collections.abc import Iterator
from datetime import date, datetime, timedelta
from decimal import Decimal
from urllib.parse import urlencode

from ..config import Settings
from . import fixtures
from .base import Adapter, ConfigError, ConfigField, ProviderSpec
from .http import ProviderError, ProviderHttp
from .records import Order

SHOP_RE = r"[a-z0-9][a-z0-9-]{0,60}\.myshopify\.com"

ORDERS_QUERY = """
query Orders($q: String!, $after: String) {
  orders(first: 100, after: $after, query: $q, sortKey: CREATED_AT) {
    edges {
      node {
        id
        createdAt
        displayFinancialStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        customer { id }
        customerJourneySummary { firstVisit { utmParameters { source medium campaign } } }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
"""


def _shop(config: dict) -> str:
    shop = str(config.get("shop", "")).lower()
    # Guards against SSRF: we only ever call *.myshopify.com hosts.
    if not re.fullmatch(SHOP_RE, shop):
        raise ConfigError("Shop domain must look like your-store.myshopify.com")
    return shop


class ShopifyAdapter(Adapter):
    spec = ProviderSpec(
        key="shopify",
        name="Shopify",
        category="Commerce",
        produces="orders",
        scopes=("read_orders",),
        config_fields=(ConfigField("shop", "Shop domain", SHOP_RE, "e.g. your-store.myshopify.com", "lower"),),
        docs_url="https://shopify.dev/docs/api/admin-graphql",
        setup_note="Requires a Shopify app (client id/secret). read_orders covers the last 60 days; older orders need read_all_orders approval.",
    )

    def live_configured(self, s: Settings) -> bool:
        return bool(s.shopify_client_id and s.shopify_client_secret)

    def authorize_url(self, s: Settings, *, state: str, code_challenge: str, redirect_uri: str, config: dict) -> str:
        q = {"client_id": s.shopify_client_id, "scope": ",".join(self.spec.scopes), "redirect_uri": redirect_uri, "state": state}
        return f"https://{_shop(config)}/admin/oauth/authorize?{urlencode(q)}"

    def verify_callback(self, s: Settings, params: dict[str, str]) -> None:
        given = params.get("hmac", "")
        message = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if k not in ("hmac", "signature"))
        expected = hmac.new((s.shopify_client_secret or "").encode(), message.encode(), hashlib.sha256).hexdigest()
        if not given or not hmac.compare_digest(given, expected):
            raise ProviderError("Shopify callback HMAC verification failed.", transient=False)
        if "shop" in params:
            _shop({"shop": params["shop"]})

    def exchange_code(self, s: Settings, http: ProviderHttp, *, code: str, code_verifier: str, redirect_uri: str, config: dict) -> dict:
        r = http.request(
            "POST",
            f"https://{_shop(config)}/admin/oauth/access_token",
            json={"client_id": s.shopify_client_id, "client_secret": s.shopify_client_secret, "code": code},
        )
        return {"access_token": r.json()["access_token"]}

    def fetch(self, s: Settings, http: ProviderHttp, *, credentials: dict, config: dict, start: date, end: date) -> Iterator[Order]:
        url = f"https://{_shop(config)}/admin/api/{s.shopify_api_version}/graphql.json"
        q = f"created_at:>={start.isoformat()} created_at:<{(end + timedelta(days=1)).isoformat()}"
        after = None
        while True:
            data = http.request(
                "POST",
                url,
                headers={"X-Shopify-Access-Token": credentials["access_token"]},
                json={"query": ORDERS_QUERY, "variables": {"q": q, "after": after}},
            ).json()
            if data.get("errors"):
                throttled = any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in data["errors"])
                raise ProviderError(f"Shopify GraphQL error: {str(data['errors'])[:200]}", transient=throttled)
            conn = data["data"]["orders"]
            yield from parse_shopify_orders(conn)
            if not conn["pageInfo"]["hasNextPage"]:
                break
            after = conn["pageInfo"]["endCursor"]

    def sample(self, *, seed: str, start: date, end: date, config: dict) -> Iterator[Order]:
        return fixtures.orders(seed, start, end)

    def account_id(self, config: dict, *, sample: bool) -> str:
        return "sample" if sample else config.get("shop", "")


def parse_shopify_orders(connection: dict) -> Iterator[Order]:
    for edge in connection.get("edges", []):
        n = edge["node"]
        money = n["currentTotalPriceSet"]["shopMoney"]
        utm = ((n.get("customerJourneySummary") or {}).get("firstVisit") or {}).get("utmParameters") or {}
        cust = (n.get("customer") or {}).get("id")
        yield Order(
            order_id=n["id"].rsplit("/", 1)[-1],
            ordered_at=datetime.fromisoformat(n["createdAt"].replace("Z", "+00:00")),
            total_revenue=Decimal(str(money["amount"])),
            currency=money["currencyCode"],
            customer_ref=hashlib.sha256(cust.encode()).hexdigest() if cust else None,
            is_first_order=None,  # not derivable from this query without extra customer history calls
            utm_source=utm.get("source"),
            utm_medium=utm.get("medium"),
            utm_campaign=utm.get("campaign"),
            financial_status=(n.get("displayFinancialStatus") or "").lower() or None,
        )
