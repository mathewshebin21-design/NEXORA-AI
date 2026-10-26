"""Provider registry."""

from .base import Adapter
from .google import GA4Adapter, GoogleAdsAdapter
from .meta import MetaAdsAdapter
from .shopify import ShopifyAdapter

ADAPTERS: dict[str, Adapter] = {a.spec.key: a for a in (GoogleAdsAdapter(), MetaAdsAdapter(), GA4Adapter(), ShopifyAdapter())}


def get_adapter(provider: str) -> Adapter:
    try:
        return ADAPTERS[provider]
    except KeyError as e:
        raise KeyError(f"Unknown provider: {provider}") from e
