import json
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
import pytest
from fastapi import Depends
from pydantic import SecretStr
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.main import app
from app.models import Role
from app.repositories.user import UserRepository
from app.security.dependencies import (
    require_admin,
    require_admin_or_manager,
    require_authenticated_user,
)
from app.security.passwords import hash_password, verify_password
from app.security.tokens import TOKEN_AUDIENCE, TOKEN_ISSUER, create_access_token

# These values are exclusively for isolated tests, never application configuration.
TEST_KEY = "test-only-signing-key-never-use-for-deployment-123456789"
TEST_PASSWORD = "Test-only passphrase 123!"


@pytest.fixture(autouse=True)
def jwt_config(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret_key", SecretStr(TEST_KEY))
    monkeypatch.setattr(settings, "jwt_algorithm", "HS256")
    monkeypatch.setattr(settings, "jwt_access_token_expire_minutes", 60)


def registration(**overrides):
    return {
        "first_name": "Test",
        "last_name": "User",
        "email": "person@example.com",
        "password": TEST_PASSWORD,
        **overrides,
    }


def authorize(token):
    return {"Authorization": f"Bearer {token}"}


def register_and_login(api):
    status_code, user = api("POST", "/api/auth/register", registration())
    assert status_code == 201
    status_code, result = api(
        "POST", "/api/auth/login",
        {"email": user["email"], "password": TEST_PASSWORD},
    )
    assert status_code == 200
    return user, result["access_token"]


def seed_user(db_engine, role):
    with Session(db_engine) as db:
        user = UserRepository(db).create(
            {
                "first_name": "Test",
                "last_name": "Administrator",
                "email": f"{role.value.lower()}@example.com",
                "password_hash": hash_password(TEST_PASSWORD),
                "role": role,
            }
        )
        return user.id


def claims(user_id=1, **overrides):
    now = datetime.now(timezone.utc)
    return {
        "sub": str(user_id),
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(minutes=60),
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
        "type": "access",
        **overrides,
    }


def test_registration_login_and_current_user(api, db_engine):
    status_code, user = api(
        "POST", "/api/auth/register", registration(email="Person@Example.com")
    )
    assert status_code == 201
    assert user["email"] == "person@example.com" and user["role"] == "EMPLOYEE"
    assert set(user) == {
        "id", "first_name", "last_name", "email", "role", "created_at", "updated_at"
    }
    with Session(db_engine) as db:
        stored = UserRepository(db).get(user["id"])
        assert stored.role == Role.EMPLOYEE
        assert stored.password_hash.startswith("$argon2id$")
        assert stored.password_hash != TEST_PASSWORD
        assert len(stored.password_hash) <= 255
        assert verify_password(TEST_PASSWORD, stored.password_hash)

    status_code, result, headers = api(
        "POST", "/api/auth/login",
        {"email": "PERSON@example.com", "password": TEST_PASSWORD},
        with_headers=True,
    )
    assert status_code == 200
    assert result["token_type"] == "bearer" and result["user"] == user
    assert headers["cache-control"] == "no-store"
    assert headers["pragma"] == "no-cache"
    token = result["access_token"]
    decoded = jwt.decode(
        token, TEST_KEY, algorithms=["HS256"],
        issuer=TOKEN_ISSUER, audience=TOKEN_AUDIENCE,
    )
    assert decoded["sub"] == str(user["id"])
    assert decoded["exp"] - decoded["iat"] == 3600
    assert not {"password", "password_hash", "role", "email"} & decoded.keys()
    assert api("GET", "/api/auth/me", headers=authorize(token)) == (200, user)


def test_hashes_are_salted_and_corrupt_hashes_fail_closed():
    first = hash_password(TEST_PASSWORD)
    second = hash_password(TEST_PASSWORD)
    assert first != second
    assert verify_password(TEST_PASSWORD, first)
    assert not verify_password("wrong password", first)
    assert not verify_password(TEST_PASSWORD, "invalid stored hash")
    assert not verify_password(TEST_PASSWORD, "$argon2id$broken")


def test_duplicate_emails_are_case_insensitive(api):
    assert api("POST", "/api/auth/register", registration())[0] == 201
    assert api(
        "POST", "/api/auth/register", registration(email="PERSON@EXAMPLE.COM")
    ) == (409, {"detail": "Email is already registered"})


def test_registration_handles_duplicate_races(api, monkeypatch):
    assert api("POST", "/api/auth/register", registration())[0] == 201
    original = UserRepository.get_by_email
    calls = 0

    def hide_first_lookup(self, email):
        nonlocal calls
        calls += 1
        return None if calls == 1 else original(self, email)

    monkeypatch.setattr(UserRepository, "get_by_email", hide_first_lookup)
    assert api("POST", "/api/auth/register", registration()) == (
        409, {"detail": "Email is already registered"}
    )
    assert api(
        "POST", "/api/auth/register", registration(email="later@example.com")
    )[0] == 201


def test_invalid_credentials_are_generic_and_do_dummy_verification(api):
    api("POST", "/api/auth/register", registration())
    response = api(
        "POST", "/api/auth/login",
        {"email": "person@example.com", "password": "Incorrect password"},
        with_headers=True,
    )
    assert response[0] == 401
    assert response[1] == {"detail": "Invalid email or password"}
    assert response[2]["www-authenticate"] == "Bearer"
    from app.services.auth import verify_dummy_password
    with patch("app.services.auth.verify_dummy_password", wraps=verify_dummy_password) as dummy:
        unknown = api(
            "POST", "/api/auth/login",
            {"email": "unknown@example.com", "password": "Incorrect password"},
            with_headers=True,
        )
        dummy.assert_called_once()
    assert unknown[:2] == response[:2]


@pytest.mark.parametrize("authorization", [None, "", "Basic abc", "Bearer", "Bearer ", "Bearer invalid.token"])
def test_missing_or_malformed_tokens(api, authorization):
    headers = {} if authorization is None else {"Authorization": authorization}
    status_code, body, response_headers = api(
        "GET", "/api/auth/me", headers=headers, with_headers=True
    )
    assert status_code == 401
    assert response_headers["www-authenticate"] == "Bearer"
    assert "password" not in json.dumps(body)


@pytest.mark.parametrize(
    "variant",
    [
        "expired", "missing_exp", "bad_signature", "wrong_algorithm", "unsigned",
        "wrong_audience", "wrong_issuer", "wrong_type", "missing_type",
        "future_nbf", "future_iat", "missing_sub", "numeric_sub", "negative_sub",
        "zero_sub", "oversized_sub", "huge_sub", "non_numeric_sub",
        "invalid_exp_type", "invalid_iat_type", "invalid_nbf_type", "infinite_exp",
    ],
)
def test_invalid_jwt_claims_and_signatures(api, variant):
    values = claims()
    key, algorithm = TEST_KEY, "HS256"
    if variant == "expired":
        values["exp"] = datetime.now(timezone.utc) - timedelta(minutes=1)
    elif variant.startswith("missing_"):
        values.pop(variant.removeprefix("missing_"))
    elif variant == "bad_signature":
        key = TEST_KEY + "-different"
    elif variant == "wrong_algorithm":
        algorithm = "HS384"
        key = TEST_KEY + "-longer-for-hs384"
    elif variant == "unsigned":
        key, algorithm = "", "none"
    elif variant == "wrong_audience":
        values["aud"] = "different-app"
    elif variant == "wrong_issuer":
        values["iss"] = "different-issuer"
    elif variant == "wrong_type":
        values["type"] = "refresh"
    elif variant.startswith("future_"):
        values[variant.removeprefix("future_")] = datetime.now(timezone.utc) + timedelta(hours=1)
    elif variant.startswith("invalid_"):
        values[variant.split("_")[1]] = []
    elif variant == "infinite_exp":
        values["exp"] = float("inf")
    else:
        values["sub"] = {
            "numeric_sub": 1, "negative_sub": "-1", "zero_sub": "0",
            "oversized_sub": "2147483648", "huge_sub": "9" * 5000,
            "non_numeric_sub": "not-a-user",
        }[variant]
    token = jwt.encode(values, key, algorithm=algorithm)
    status_code, body = api("GET", "/api/auth/me", headers=authorize(token))
    assert status_code == 401
    if variant == "expired":
        assert body == {"detail": "Access token has expired"}


def test_nonexistent_and_deleted_users_cannot_authenticate(api, db_engine):
    assert api(
        "GET", "/api/auth/me", headers=authorize(create_access_token(999999))
    )[0] == 401
    user, token = register_and_login(api)
    with Session(db_engine) as db:
        repository = UserRepository(db)
        repository.delete(repository.get(user["id"]))
    assert api("GET", "/api/auth/me", headers=authorize(token))[0] == 401


@pytest.mark.parametrize("actor_role", [None, *Role])
@pytest.mark.parametrize("requested_role", [role.value for role in Role])
def test_registration_rejects_client_roles(api, db_engine, actor_role, requested_role):
    headers = {}
    if actor_role is not None:
        actor_id = seed_user(db_engine, actor_role)
        headers = authorize(create_access_token(actor_id))
    status_code, body = api(
        "POST", "/api/auth/register", registration(role=requested_role), headers=headers,
    )
    assert status_code == 422
    assert body == {
        "detail": [
            {"loc": ["body", "role"], "msg": "Extra inputs are not permitted", "type": "extra_forbidden"}
        ]
    }
    with Session(db_engine) as db:
        assert UserRepository(db).get_by_email("person@example.com") is None


@pytest.mark.parametrize("actor_role", list(Role))
def test_authenticated_registration_always_creates_employee(api, db_engine, actor_role):
    actor_id = seed_user(db_engine, actor_role)
    status_code, user = api(
        "POST", "/api/auth/register", registration(),
        headers=authorize(create_access_token(actor_id)),
    )
    assert status_code == 201 and user["role"] == "EMPLOYEE"
    with Session(db_engine) as db:
        assert UserRepository(db).get(user["id"]).role == Role.EMPLOYEE


@pytest.mark.parametrize("authorization", ["Basic abc", "Bearer invalid.token"])
def test_registration_preserves_invalid_authorization_errors(api, db_engine, authorization):
    status_code, _, headers = api(
        "POST", "/api/auth/register", registration(),
        headers={"Authorization": authorization}, with_headers=True,
    )
    assert status_code == 401
    assert headers["www-authenticate"] == "Bearer"
    with Session(db_engine) as db:
        assert UserRepository(db).get_by_email("person@example.com") is None


@pytest.fixture
def role_routes():
    previous_routes = list(app.router.routes)
    for name, dependency in (
        ("admin", require_admin),
        ("management", require_admin_or_manager),
        ("authenticated", require_authenticated_user),
    ):
        app.add_api_route(
            f"/_test/{name}", lambda: {"ok": True},
            methods=["GET"], dependencies=[Depends(dependency)],
        )
    yield
    app.router.routes[:] = previous_routes
    app.openapi_schema = None


@pytest.mark.parametrize("role", list(Role))
@pytest.mark.parametrize("route", ["admin", "management", "authenticated"])
def test_reusable_role_dependencies(api, db_engine, role_routes, role, route):
    user_id = seed_user(db_engine, role)
    token = create_access_token(user_id)
    allowed = (
        route == "authenticated"
        or role == Role.ADMIN
        or (route == "management" and role == Role.MANAGER)
    )
    assert api(
        "GET", f"/_test/{route}", headers=authorize(token)
    )[0] == (200 if allowed else 403)


def test_role_checks_use_current_database_role(api, db_engine, role_routes):
    user_id = seed_user(db_engine, Role.ADMIN)
    token = create_access_token(user_id)
    assert api("GET", "/_test/admin", headers=authorize(token))[0] == 200
    with Session(db_engine) as db:
        repository = UserRepository(db)
        repository.update(repository.get(user_id), {"role": Role.EMPLOYEE})
    assert api("GET", "/_test/admin", headers=authorize(token))[0] == 403
    assert api("GET", "/api/auth/me", headers=authorize(token))[1]["role"] == "EMPLOYEE"


@pytest.mark.parametrize("key", [None, "", "change_me", "short", " " * 40, "replace_" + "x" * 40])
def test_jwt_requires_a_configured_secret(api, monkeypatch, key):
    _, token = register_and_login(api)
    monkeypatch.setattr(settings, "jwt_secret_key", SecretStr(key) if key is not None else None)
    assert api(
        "POST", "/api/auth/login",
        {"email": "person@example.com", "password": TEST_PASSWORD},
    ) == (503, {"detail": "JWT authentication is not configured"})
    assert api("GET", "/api/auth/me", headers=authorize(token))[0] == 503
    assert api("GET", "/api/health")[0] == 200


@pytest.mark.parametrize(
    "field, value",
    [
        ("password", "short"),
        ("password", "x" * 129),
        ("password", " " * 15),
        ("password", "x" * 15),
        ("email", "invalid-email"),
        ("first_name", " "),
        ("last_name", " "),
        ("role", "SUPERADMIN"),
        ("password_hash", "submitted-secret-value"),
    ],
)
def test_registration_validation_never_echoes_passwords(api, field, value):
    payload = registration(**{field: value})
    status_code, body = api("POST", "/api/auth/register", payload)
    assert status_code == 422
    for error in body["detail"]:
        assert "input" not in error and "ctx" not in error
    serialized = json.dumps(body)
    assert TEST_PASSWORD not in serialized
    assert "submitted-secret-value" not in serialized


def test_password_whitespace_is_preserved(api):
    password = " leading and trailing spaces "
    assert api(
        "POST", "/api/auth/register", registration(password=password)
    )[0] == 201
    assert api(
        "POST", "/api/auth/login", {"email": "person@example.com", "password": password}
    )[0] == 200
    assert api(
        "POST", "/api/auth/login", {"email": "person@example.com", "password": password.strip()}
    )[0] == 401


def test_swagger_authentication_contract(api):
    _, document = api("GET", "/openapi.json")
    scheme = document["components"]["securitySchemes"]["BearerAuth"]
    assert scheme["type"] == "http" and scheme["scheme"] == "bearer"
    assert document["paths"]["/api/auth/me"]["get"]["security"] == [{"BearerAuth": []}]
    assert "security" not in document["paths"]["/api/auth/login"]["post"]
    register_schema = document["components"]["schemas"]["UserRegister"]
    assert set(register_schema["properties"]) == {"first_name", "last_name", "email", "password"}
    assert register_schema["additionalProperties"] is False
    assert register_schema["properties"]["password"]["writeOnly"] is True
    assert "password_hash" not in document["components"]["schemas"]["UserResponse"]["properties"]
    for resource in ("categories", "suppliers", "products"):
        assert "security" not in document["paths"][f"/api/{resource}"]["post"]
