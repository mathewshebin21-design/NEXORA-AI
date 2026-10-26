"""Google Ads (GAQL searchStream) and Google Analytics 4 (Data API runReport) adapters.

Both use Google's OAuth 2.0 authorization-code flow with PKCE and offline access
(refresh token). Access tokens are minted from the stored refresh token per sync.
"""

from collections.abc import Iterator
from datetime import date, datetime
from decimal import Decimal
from urllib.parse import urlencode

from ..config import Settings
from . import fixtures
from .base import Adapter, ConfigField, ProviderSpec
from .http import ProviderError, ProviderHttp
from .records import AdDaily, WebDaily

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105 - endpoint, not a secret


class _GoogleOAuth(Adapter):
    def live_configured(self, s: Settings) -> bool:
        return bool(s.google_client_id and s.google_client_secret) and not self.missing_settings(s)

    def authorize_url(self, s: Settings, *, state: str, code_challenge: str, redirect_uri: str, config: dict) -> str:
        q = {
            "client_id": s.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.spec.scopes),
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        return f"{AUTH_URL}?{urlencode(q)}"

    def exchange_code(self, s: Settings, http: ProviderHttp, *, code: str, code_verifier: str, redirect_uri: str, config: dict) -> dict:
        r = http.request(
            "POST",
            TOKEN_URL,
            data={
                "code": code,
                "client_id": s.google_client_id,
                "client_secret": s.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
                "code_verifier": code_verifier,
            },
        )
        tok = r.json()
        if not tok.get("refresh_token"):
            raise ProviderError(
                "Google did not return a refresh token; remove the app's access in your Google account and reconnect.", transient=False
            )
        return {"refresh_token": tok["refresh_token"], "scope": tok.get("scope", "")}

    @staticmethod
    def access_token(s: Settings, http: ProviderHttp, credentials: dict) -> str:
        r = http.request(
            "POST",
            TOKEN_URL,
            data={
                "client_id": s.google_client_id,
                "client_secret": s.google_client_secret,
                "refresh_token": credentials["refresh_token"],
                "grant_type": "refresh_token",
            },
        )
        return r.json()["access_token"]


class GoogleAdsAdapter(_GoogleOAuth):
    spec = ProviderSpec(
        key="google_ads",
        name="Google Ads",
        category="Advertising",
        produces="ad_daily",
        scopes=("https://www.googleapis.com/auth/adwords",),
        config_fields=(ConfigField("customer_id", "Customer ID", r"\d{10}", "10 digits, e.g. 123-456-7890", "digits"),),
        docs_url="https://developers.google.com/google-ads/api/docs/start",
        setup_note="Requires a Google Cloud OAuth client and an approved Google Ads developer token.",
    )

    def missing_settings(self, s: Settings) -> list[str]:
        return [] if s.google_ads_developer_token else ["NEXORA_GOOGLE_ADS_DEVELOPER_TOKEN"]

    QUERY = (
        "SELECT segments.date, campaign.id, campaign.name, customer.currency_code, metrics.impressions, metrics.clicks, "
        "metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign "
        "WHERE segments.date BETWEEN '{start}' AND '{end}'"
    )

    def fetch(self, s: Settings, http: ProviderHttp, *, credentials: dict, config: dict, start: date, end: date) -> Iterator[AdDaily]:
        token = self.access_token(s, http, credentials)
        cid = config["customer_id"]
        headers = {"Authorization": f"Bearer {token}", "developer-token": s.google_ads_developer_token or ""}
        if s.google_ads_login_customer_id:
            headers["login-customer-id"] = s.google_ads_login_customer_id
        url = f"https://googleads.googleapis.com/{s.google_ads_api_version}/customers/{cid}/googleAds:searchStream"
        r = http.request("POST", url, headers=headers, json={"query": self.QUERY.format(start=start.isoformat(), end=end.isoformat())})
        yield from parse_google_ads(r.json(), account_id=cid)

    def sample(self, *, seed: str, start: date, end: date, config: dict) -> Iterator[AdDaily]:
        return fixtures.ad_daily("google_ads", seed, start, end)


def parse_google_ads(batches: list[dict], *, account_id: str) -> Iterator[AdDaily]:
    """searchStream returns a JSON array of batches, each with `results`. Int64 fields arrive as strings."""
    for batch in batches:
        for row in batch.get("results", []):
            m, c = row.get("metrics", {}), row.get("campaign", {})
            yield AdDaily(
                account_id=account_id,
                date=date.fromisoformat(row["segments"]["date"]),
                campaign_id=str(c["id"]),
                campaign_name=c.get("name") or str(c["id"]),
                impressions=int(m.get("impressions", 0)),
                clicks=int(m.get("clicks", 0)),
                spend=(Decimal(str(m.get("costMicros", 0))) / Decimal(1_000_000)).quantize(Decimal("0.0001")),
                platform_conversions=Decimal(str(m.get("conversions", 0))),
                platform_conversion_value=Decimal(str(m.get("conversionsValue", 0))),
                currency=row.get("customer", {}).get("currencyCode", "USD"),
            )


class GA4Adapter(_GoogleOAuth):
    spec = ProviderSpec(
        key="ga4",
        name="Google Analytics 4",
        category="Analytics",
        produces="web_daily",
        scopes=("https://www.googleapis.com/auth/analytics.readonly",),
        config_fields=(ConfigField("property_id", "Property ID", r"\d{6,12}", "numeric GA4 property id", "digits"),),
        docs_url="https://developers.google.com/analytics/devguides/reporting/data/v1",
        setup_note="Requires a Google Cloud OAuth client with the Analytics Data API enabled.",
    )
    PAGE = 10_000

    def fetch(self, s: Settings, http: ProviderHttp, *, credentials: dict, config: dict, start: date, end: date) -> Iterator[WebDaily]:
        token = self.access_token(s, http, credentials)
        url = f"https://analyticsdata.googleapis.com/{s.ga4_api_version}/properties/{config['property_id']}:runReport"
        offset = 0
        while True:
            body = {
                "dateRanges": [{"startDate": start.isoformat(), "endDate": end.isoformat()}],
                "dimensions": [{"name": "date"}, {"name": "sessionDefaultChannelGroup"}],
                "metrics": [{"name": "sessions"}, {"name": "engagedSessions"}, {"name": "keyEvents"}, {"name": "purchaseRevenue"}],
                "limit": self.PAGE,
                "offset": offset,
            }
            data = http.request("POST", url, headers={"Authorization": f"Bearer {token}"}, json=body).json()
            rows = list(parse_ga4(data))
            yield from rows
            offset += self.PAGE
            if offset >= int(data.get("rowCount", 0)) or not rows:
                break

    def sample(self, *, seed: str, start: date, end: date, config: dict) -> Iterator[WebDaily]:
        return fixtures.web_daily(seed, start, end)


def parse_ga4(report: dict) -> Iterator[WebDaily]:
    """runReport rows: dimensionValues [date YYYYMMDD, channel] and metricValues as strings."""
    for row in report.get("rows", []):
        d, ch = (v["value"] for v in row["dimensionValues"])
        sessions, engaged, key_events, revenue = (v["value"] for v in row["metricValues"])
        yield WebDaily(
            date=datetime.strptime(d, "%Y%m%d").date(),
            channel_group=ch or "(not set)",
            sessions=int(float(sessions)),
            engaged_sessions=int(float(engaged)),
            key_events=Decimal(key_events),
            purchase_revenue=Decimal(revenue),
        )
