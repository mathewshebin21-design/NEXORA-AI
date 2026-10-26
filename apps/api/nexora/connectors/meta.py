"""Meta Marketing API adapter (campaign-level daily Insights).

OAuth: Facebook Login code flow → short-lived user token → exchanged for a long-lived
token (~60 days). Meta issues no refresh token; expiry surfaces as a non-transient
"reconnect" error.
"""

import json
import time
from collections.abc import Iterator
from datetime import date
from decimal import Decimal
from urllib.parse import urlencode

from ..config import Settings
from . import fixtures
from .base import Adapter, ConfigField, ProviderSpec
from .http import ProviderError, ProviderHttp
from .records import AdDaily

# Purchase action types in order of preference. Counting only one avoids double counting
# the same purchase reported under several attribution surfaces.
PURCHASE_ACTIONS = ("omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase")


class MetaAdsAdapter(Adapter):
    spec = ProviderSpec(
        key="meta_ads",
        name="Meta Ads",
        category="Advertising",
        produces="ad_daily",
        scopes=("ads_read",),
        config_fields=(ConfigField("ad_account_id", "Ad account ID", r"\d{5,20}", "numeric id without the act_ prefix", "digits"),),
        docs_url="https://developers.facebook.com/docs/marketing-api/insights",
        setup_note="Requires a Meta app with Marketing API access (ads_read needs app review for production).",
    )

    def live_configured(self, s: Settings) -> bool:
        return bool(s.meta_app_id and s.meta_app_secret)

    def authorize_url(self, s: Settings, *, state: str, code_challenge: str, redirect_uri: str, config: dict) -> str:
        q = {"client_id": s.meta_app_id, "redirect_uri": redirect_uri, "state": state, "scope": ",".join(self.spec.scopes), "response_type": "code"}
        return f"https://www.facebook.com/{s.meta_api_version}/dialog/oauth?{urlencode(q)}"

    def exchange_code(self, s: Settings, http: ProviderHttp, *, code: str, code_verifier: str, redirect_uri: str, config: dict) -> dict:
        base = f"https://graph.facebook.com/{s.meta_api_version}/oauth/access_token"
        short = http.request(
            "GET", base, params={"client_id": s.meta_app_id, "client_secret": s.meta_app_secret, "redirect_uri": redirect_uri, "code": code}
        ).json()
        long = http.request(
            "GET",
            base,
            params={
                "grant_type": "fb_exchange_token",
                "client_id": s.meta_app_id,
                "client_secret": s.meta_app_secret,
                "fb_exchange_token": short["access_token"],
            },
        ).json()
        return {"access_token": long["access_token"], "expires_at": int(time.time()) + int(long.get("expires_in", 0) or 0)}

    def fetch(self, s: Settings, http: ProviderHttp, *, credentials: dict, config: dict, start: date, end: date) -> Iterator[AdDaily]:
        if credentials.get("expires_at") and credentials["expires_at"] < time.time():
            raise ProviderError("Meta access token expired — reconnect the account.", transient=False)
        acct = config["ad_account_id"]
        url = f"https://graph.facebook.com/{s.meta_api_version}/act_{acct}/insights"
        params: dict | None = {
            "level": "campaign",
            "time_increment": 1,
            "time_range": json.dumps({"since": start.isoformat(), "until": end.isoformat()}),
            "fields": "campaign_id,campaign_name,impressions,clicks,spend,actions,action_values,account_currency,date_start",
            "limit": 500,
            "access_token": credentials["access_token"],
        }
        while url:
            page = http.request("GET", url, params=params).json()
            yield from parse_meta_insights(page, account_id=acct)
            url = page.get("paging", {}).get("next")
            params = None  # `next` already carries every query parameter

    def sample(self, *, seed: str, start: date, end: date, config: dict) -> Iterator[AdDaily]:
        return fixtures.ad_daily("meta_ads", seed, start, end)


def _action(values: list[dict] | None) -> Decimal:
    by_type = {a.get("action_type"): a.get("value", "0") for a in (values or [])}
    for t in PURCHASE_ACTIONS:
        if t in by_type:
            return Decimal(str(by_type[t]))
    return Decimal(0)


def parse_meta_insights(page: dict, *, account_id: str) -> Iterator[AdDaily]:
    """Insights rows: numeric fields arrive as strings; purchases live in `actions`/`action_values`."""
    for row in page.get("data", []):
        yield AdDaily(
            account_id=account_id,
            date=date.fromisoformat(row["date_start"]),
            campaign_id=str(row["campaign_id"]),
            campaign_name=row.get("campaign_name") or str(row["campaign_id"]),
            impressions=int(row.get("impressions", 0)),
            clicks=int(row.get("clicks", 0)),
            spend=Decimal(str(row.get("spend", "0"))),
            platform_conversions=_action(row.get("actions")),
            platform_conversion_value=_action(row.get("action_values")),
            currency=row.get("account_currency", "USD"),
        )
