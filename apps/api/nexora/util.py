import re
import secrets
import unicodedata
from datetime import UTC, datetime


def now() -> datetime:
    return datetime.now(UTC)


def slugify(value: str, max_len: int = 48) -> str:
    v = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    v = re.sub(r"[^a-z0-9]+", "-", v.lower()).strip("-")
    return v[:max_len].strip("-") or "org"


def with_suffix(slug: str) -> str:
    return f"{slug[:42]}-{secrets.token_hex(2)}"
