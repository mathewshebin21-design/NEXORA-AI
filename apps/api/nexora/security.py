"""Password hashing and opaque token handling."""

import hashlib
import hmac
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()  # argon2id with library defaults (RFC 9106 low-memory profile)
# Verified against when the email is unknown, so response timing doesn't reveal account existence.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))

COMMON_PASSWORDS = {"password1234", "123456789012", "qwertyuiop12", "letmein12345", "welcome12345", "password123!"}


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def password_problems(password: str, email: str) -> list[str]:
    problems = []
    if len(password) < 12:
        problems.append("Use at least 12 characters.")
    if len(password) > 256:
        problems.append("Use at most 256 characters.")
    if password.lower() in COMMON_PASSWORDS:
        problems.append("This password is too common.")
    if email and email.split("@")[0].lower() in password.lower() and len(email.split("@")[0]) >= 4:
        problems.append("Don't include your email name in the password.")
    return problems


def new_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def token_hash(token: str) -> str:
    """SHA-256 is appropriate for high-entropy random tokens (not for passwords)."""
    return hashlib.sha256(token.encode()).hexdigest()


API_KEY_PREFIX = "nxk"


def new_api_key() -> tuple[str, str, str]:
    """Returns (full_key, prefix, hash). The full key is shown to the user exactly once."""
    prefix = secrets.token_hex(6)
    secret = secrets.token_urlsafe(32)
    full = f"{API_KEY_PREFIX}_{prefix}_{secret}"
    return full, prefix, token_hash(full)


def parse_api_key(raw: str) -> str | None:
    parts = raw.split("_", 2)
    if len(parts) != 3 or parts[0] != API_KEY_PREFIX or len(parts[1]) != 12:
        return None
    return parts[1]


def constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())
