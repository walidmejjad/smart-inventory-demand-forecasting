from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.config.settings import settings
from app.security.exceptions import AuthenticationError, JWTConfigurationError

TOKEN_ISSUER = "smart-inventory"
TOKEN_AUDIENCE = "smart-inventory-api"


def _signing_key() -> str:
    secret = settings.jwt_secret_key
    key = secret.get_secret_value() if secret is not None else ""
    if (
        len(key.encode("utf-8")) < 32
        or key.isspace()
        or key.lower().startswith(("change_me", "replace_", "your_"))
        or settings.jwt_algorithm != "HS256"
    ):
        raise JWTConfigurationError("JWT authentication is not configured")
    return key


def create_access_token(user_id: int) -> str:
    key = _signing_key()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
        "type": "access",
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int:
    key = _signing_key()
    if len(token) > 8192:
        raise AuthenticationError("Invalid access token")
    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=[settings.jwt_algorithm],
            issuer=TOKEN_ISSUER,
            audience=TOKEN_AUDIENCE,
            options={"require": ["sub", "exp", "iat", "nbf", "iss", "aud", "type"]},
        )
    except ExpiredSignatureError:
        raise AuthenticationError("Access token has expired") from None
    except (InvalidTokenError, TypeError, ValueError, OverflowError, RecursionError):
        raise AuthenticationError("Invalid access token") from None

    subject = payload["sub"]
    if (
        payload["type"] != "access"
        or not isinstance(subject, str)
        or not subject.isascii()
        or not subject.isdecimal()
        or len(subject) > 10
        or not 1 <= int(subject) <= 2_147_483_647
    ):
        raise AuthenticationError("Invalid access token")
    return int(subject)
