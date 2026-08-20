"""Family PIN lock — same PIN on every phone."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timezone

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.db import get_setting, set_setting

PBKDF_ROUNDS = 180_000


def _secret() -> str:
    secret = os.environ.get("SECRET_KEY") or get_setting("secret_key")
    if not secret:
        secret = secrets.token_hex(32)
        set_setting("secret_key", secret)
    return secret


def serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(_secret(), salt="v360-doc-manager")


def hash_pin(pin: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", pin.encode("utf-8"), salt.encode("utf-8"), PBKDF_ROUNDS
    )
    return f"{salt}${digest.hex()}"


def verify_pin(pin: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    check = hashlib.pbkdf2_hmac(
        "sha256", pin.encode("utf-8"), salt.encode("utf-8"), PBKDF_ROUNDS
    ).hex()
    return hmac.compare_digest(check, digest)


def pin_is_set() -> bool:
    return bool(get_setting("pin_hash"))


def set_pin(pin: str) -> None:
    pin = (pin or "").strip()
    if not pin.isdigit() or len(pin) < 4 or len(pin) > 8:
        raise ValueError("PIN must be 4 to 8 digits")
    set_setting("pin_hash", hash_pin(pin))


def check_pin(pin: str) -> bool:
    stored = get_setting("pin_hash")
    if not stored:
        return False
    return verify_pin((pin or "").strip(), stored)


def make_session() -> str:
    return serializer().dumps({"ok": True, "t": datetime.now(timezone.utc).isoformat()})


def session_days() -> int:
    try:
        return int(os.environ.get("SESSION_DAYS", "90"))
    except ValueError:
        return 90


def read_session(token: str | None) -> bool:
    if not token:
        return False
    try:
        serializer().loads(token, max_age=session_days() * 24 * 3600)
        return True
    except (BadSignature, SignatureExpired):
        return False
