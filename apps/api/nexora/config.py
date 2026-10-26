from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NEXORA_", env_file=".env", extra="ignore")

    # Runtime connection: a role WITHOUT BYPASSRLS, so row-level security always applies.
    database_url: str = "postgresql+psycopg://nexora_app:nexora_app@localhost:5433/nexora"
    # Migration/maintenance connection: the table owner.
    owner_database_url: str = "postgresql+psycopg://nexora_owner:nexora_owner@localhost:5433/nexora"
    app_db_role: str = "nexora_app"

    environment: str = "development"
    session_cookie_name: str = "nx_session"
    session_ttl_hours: int = 24 * 7
    cookie_secure: bool = False  # True behind HTTPS in production
    allowed_origins: list[str] = ["http://localhost:3000"]
    csrf_header: str = "X-Nexora-CSRF"

    login_max_failures: int = 5
    login_lockout_minutes: int = 15
    login_rate_per_minute: int = 20
    invitation_ttl_days: int = 7
    deletion_grace_days: int = 30
    public_base_url: str = "http://localhost:3000"

    # ---- connectors (Phase 3) ----
    # Fernet key (urlsafe base64, 32 bytes) for encrypting OAuth tokens at rest. Required for live connections.
    encryption_key: str | None = None
    # Run the sync worker inside the API process (convenient for development; use `python -m nexora.worker` in production).
    embedded_worker: bool = False
    worker_poll_seconds: float = 2.0
    sync_default_window_days: int = 90
    # OAuth apps. A provider is "live-capable" only when its client id + secret are configured.
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_ads_developer_token: str | None = None
    google_ads_login_customer_id: str | None = None
    meta_app_id: str | None = None
    meta_app_secret: str | None = None
    shopify_client_id: str | None = None
    shopify_client_secret: str | None = None
    # API versions — confirm against each provider's current version table before go-live.
    google_ads_api_version: str = "v26"
    meta_api_version: str = "v25.0"
    shopify_api_version: str = "2026-10"
    ga4_api_version: str = "v1beta"


@lru_cache
def get_settings() -> Settings:
    return Settings()
