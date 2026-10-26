"""Deterministic synthetic data for sample-mode connections.

Every value is a pure function of (seed, date, key), so re-syncing the same window
yields identical rows — which is what lets tests prove syncs are idempotent.
All rows produced here are stored with is_synthetic = true.
"""

import hashlib
import math
import random
from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from .records import AdDaily, Order, WebDaily


def rng(*parts: object) -> random.Random:
    h = hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()
    return random.Random(int(h[:16], 16))  # noqa: S311 - not for security


def days(start: date, end: date) -> Iterator[date]:
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def money(x: float) -> Decimal:
    return Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def weekday_factor(d: date) -> float:
    return {5: 1.15, 6: 1.12, 0: 0.92}.get(d.weekday(), 1.0)


def seasonal(d: date) -> float:
    # gentle ramp into Q4, deterministic
    return 1.0 + 0.25 * max(0.0, (d.timetuple().tm_yday - 210) / 155)


# name, daily spend, cpc, ctr, true cvr, platform over-report, aov
AD_CAMPAIGNS = {
    "google_ads": [
        ("gads-1001", "Brand Search — Always On", 250, 0.58, 0.095, 0.052, 1.10, 130),
        ("gads-1029", "Non-brand: Ceramic Cookware", 340, 1.30, 0.019, 0.022, 1.25, 118),
        ("gads-1040", "Shopping — Linen", 280, 0.90, 0.012, 0.030, 1.18, 145),
        ("gads-1055", "Performance Max — Catalog", 300, 0.75, 0.010, 0.028, 1.32, 125),
    ],
    "meta_ads": [
        ("meta-2041", "Autumn Hearth — Advantage+ Sales", 520, 0.68, 0.0117, 0.021, 1.29, 142),
        ("meta-2047", "Prospecting — Video Stories", 160, 0.58, 0.0073, 0.008, 1.62, 114),
        ("meta-2052", "Retargeting — Catalog", 120, 0.45, 0.0150, 0.040, 1.20, 128),
    ],
}


def ad_daily(provider: str, seed: str, start: date, end: date, currency: str = "USD") -> Iterator[AdDaily]:
    for d in days(start, end):
        for cid, name, base, cpc, ctr, cvr, over, aov in AD_CAMPAIGNS[provider]:
            r = rng(seed, provider, d, cid)
            spend = base * weekday_factor(d) * seasonal(d) * (0.85 + r.random() * 0.3)
            clicks = max(0, round(spend / (cpc * (0.9 + r.random() * 0.2))))
            impressions = max(clicks, round(clicks / (ctr * (0.9 + r.random() * 0.2))))
            conv = clicks * cvr * (0.8 + r.random() * 0.4) * over
            yield AdDaily(
                account_id="sample",
                date=d,
                campaign_id=cid,
                campaign_name=name,
                impressions=impressions,
                clicks=clicks,
                spend=money(spend),
                platform_conversions=money(conv),
                platform_conversion_value=money(conv * aov * (0.9 + r.random() * 0.2)),
                currency=currency,
            )


CHANNELS = [
    ("Organic Search", 1300),
    ("Paid Search", 900),
    ("Paid Social", 700),
    ("Direct", 650),
    ("Email", 380),
    ("Referral", 160),
    ("Organic Social", 240),
]


def web_daily(seed: str, start: date, end: date) -> Iterator[WebDaily]:
    for d in days(start, end):
        for ch, base in CHANNELS:
            r = rng(seed, "ga4", d, ch)
            sessions = round(base * weekday_factor(d) * seasonal(d) * (0.85 + r.random() * 0.3))
            engaged = round(sessions * (0.55 + r.random() * 0.15))
            key_events = sessions * (0.012 + r.random() * 0.01)
            yield WebDaily(
                date=d,
                channel_group=ch,
                sessions=sessions,
                engaged_sessions=engaged,
                key_events=money(key_events),
                purchase_revenue=money(key_events * (120 + r.random() * 40)),
            )


UTM = [
    (("google", "cpc", "brand-search"), 0.18),
    (("google", "cpc", "shopping-linen"), 0.12),
    (("facebook", "paid_social", "autumn-hearth"), 0.17),
    (("facebook", "paid_social", "video-stories"), 0.04),
    (("klaviyo", "email", "linen-restock"), 0.14),
    (("google", "organic", None), 0.15),
    ((None, None, None), 0.20),
]


def _pick(r: random.Random, items):
    x = r.random() * sum(w for _, w in items)
    for v, w in items:
        x -= w
        if x <= 0:
            return v
    return items[-1][0]


def orders(seed: str, start: date, end: date, currency: str = "USD") -> Iterator[Order]:
    for d in days(start, end):
        r = rng(seed, "shopify", d)
        n = max(0, round(62 * weekday_factor(d) * seasonal(d) * (0.85 + r.random() * 0.3)))
        for i in range(n):
            o = rng(seed, "shopify", d, i)
            src, med, camp = _pick(o, UTM)
            revenue = math.exp(o.gauss(math.log(128), 0.45))
            customer = f"{seed}-cust-{o.randrange(0, 9000)}"
            yield Order(
                order_id=f"S{d:%Y%m%d}-{i:04d}",
                ordered_at=datetime(d.year, d.month, d.day, tzinfo=UTC) + timedelta(seconds=o.randrange(0, 86400)),
                total_revenue=money(revenue),
                currency=currency,
                customer_ref=hashlib.sha256(customer.encode()).hexdigest(),
                is_first_order=o.random() < 0.45,
                utm_source=src,
                utm_medium=med,
                utm_campaign=camp,
                financial_status="paid" if o.random() > 0.03 else "refunded",
            )
