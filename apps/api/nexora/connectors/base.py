"""Adapter contract shared by every provider."""

import base64
import hashlib
import re
import secrets
from abc import ABC, abstractmethod
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import date

from ..config import Settings
from .http import ProviderHttp
from .records import Record


class ConfigError(ValueError):
    """Raised when user-supplied connection config is invalid."""


@dataclass(frozen=True)
class ConfigField:
    key: str
    label: str
    pattern: str
    hint: str
    normalise: str = "strip"  # "strip" | "digits"


@dataclass(frozen=True)
class ProviderSpec:
    key: str
    name: str
    category: str
    produces: str  # "ad_daily" | "orders" | "web_daily"
    scopes: tuple[str, ...]
    config_fields: tuple[ConfigField, ...] = field(default_factory=tuple)
    docs_url: str = ""
    setup_note: str = ""


def pkce_pair() -> tuple[str, str]:
    """RFC 7636 S256 code verifier and challenge."""
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


class Adapter(ABC):
    spec: ProviderSpec

    # ------------------------------------------------------------ configuration
    def validate_config(self, config: dict, *, required: bool) -> dict:
        out: dict[str, str] = {}
        for f in self.spec.config_fields:
            raw = str(config.get(f.key, "") or "").strip()
            if not raw:
                if required:
                    raise ConfigError(f"{f.label} is required.")
                continue
            value = re.sub(r"\D", "", raw) if f.normalise == "digits" else raw.lower() if f.normalise == "lower" else raw
            if not re.fullmatch(f.pattern, value):
                raise ConfigError(f"{f.label}: {f.hint}")
            out[f.key] = value
        return out

    @abstractmethod
    def live_configured(self, settings: Settings) -> bool: ...

    def missing_settings(self, settings: Settings) -> list[str]:
        return []

    # ------------------------------------------------------------ OAuth
    @abstractmethod
    def authorize_url(self, settings: Settings, *, state: str, code_challenge: str, redirect_uri: str, config: dict) -> str: ...

    @abstractmethod
    def exchange_code(self, settings: Settings, http: ProviderHttp, *, code: str, code_verifier: str, redirect_uri: str, config: dict) -> dict:
        """Returns the credentials dict to encrypt and store."""

    def verify_callback(self, settings: Settings, params: dict[str, str]) -> None:  # noqa: B027 - optional hook
        """Provider-specific callback integrity checks (e.g. Shopify HMAC)."""

    # ------------------------------------------------------------ data
    @abstractmethod
    def fetch(self, settings: Settings, http: ProviderHttp, *, credentials: dict, config: dict, start: date, end: date) -> Iterator[Record]: ...

    @abstractmethod
    def sample(self, *, seed: str, start: date, end: date, config: dict) -> Iterator[Record]:
        """Deterministic synthetic data for sample-mode connections (clearly flagged as synthetic)."""

    def account_id(self, config: dict, *, sample: bool) -> str:
        return "sample" if sample else next(iter(config.values()), "")
