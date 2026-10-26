"""Encryption of provider credentials at rest (Fernet: AES-128-CBC + HMAC-SHA256)."""

import json

from cryptography.fernet import Fernet, InvalidToken

from ..config import get_settings


class CredentialsUnavailable(Exception):
    pass


def _fernet() -> Fernet:
    key = get_settings().encryption_key
    if not key:
        raise CredentialsUnavailable("NEXORA_ENCRYPTION_KEY is not configured; live connections are disabled.")
    return Fernet(key.encode())


def live_storage_available() -> bool:
    return bool(get_settings().encryption_key)


def encrypt(data: dict) -> bytes:
    return _fernet().encrypt(json.dumps(data).encode())


def decrypt(blob: bytes) -> dict:
    try:
        return json.loads(_fernet().decrypt(blob))
    except InvalidToken as e:
        raise CredentialsUnavailable("Stored credentials could not be decrypted (key rotated?). Reconnect the source.") from e
