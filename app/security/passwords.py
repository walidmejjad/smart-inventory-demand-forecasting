from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

_password_hash = PasswordHash.recommended()
# This hash has no account associated with it; it equalizes failed-login work.
_dummy_hash = _password_hash.hash("timing-only-password-not-an-account")


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hash.verify(password, password_hash)
    except UnknownHashError:
        return False


def verify_dummy_password(password: str) -> None:
    _password_hash.verify(password, _dummy_hash)
