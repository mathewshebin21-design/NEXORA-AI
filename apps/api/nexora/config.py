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


@lru_cache
def get_settings() -> Settings:
    return Settings()
