"""Validated, provider-agnostic records produced by adapters.

Adapters must return these types; anything that fails validation aborts the sync
instead of silently landing malformed data in the fact tables.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Currency = Annotated[str, StringConstraints(pattern=r"^[A-Z]{3}$")]
NonNeg = Annotated[Decimal, Field(ge=0)]


class _Rec(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class AdDaily(_Rec):
    account_id: str = Field(min_length=1, max_length=64)
    date: date
    campaign_id: str = Field(min_length=1, max_length=64)
    campaign_name: str = Field(min_length=1, max_length=255)
    impressions: int = Field(ge=0)
    clicks: int = Field(ge=0)
    spend: NonNeg
    platform_conversions: NonNeg
    platform_conversion_value: NonNeg
    currency: Currency


class Order(_Rec):
    order_id: str = Field(min_length=1, max_length=64)
    ordered_at: datetime
    total_revenue: NonNeg
    currency: Currency
    customer_ref: str | None = Field(default=None, max_length=64)
    is_first_order: bool | None = None
    utm_source: str | None = Field(default=None, max_length=128)
    utm_medium: str | None = Field(default=None, max_length=128)
    utm_campaign: str | None = Field(default=None, max_length=255)
    financial_status: str | None = Field(default=None, max_length=32)


class WebDaily(_Rec):
    date: date
    channel_group: str = Field(min_length=1, max_length=64)
    sessions: int = Field(ge=0)
    engaged_sessions: int = Field(ge=0)
    key_events: NonNeg
    purchase_revenue: NonNeg


Record = AdDaily | Order | WebDaily
