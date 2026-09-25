from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import Role, User
from app.security.exceptions import AuthenticationError, JWTConfigurationError
from app.services.auth import AuthService

bearer_scheme = HTTPBearer(
    auto_error=False,
    scheme_name="BearerAuth",
    description="Paste the access_token returned by POST /api/auth/login.",
)


def get_optional_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    if credentials is None:
        if "Authorization" in request.headers:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                "Invalid authorization header",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return None
    try:
        return AuthService(db).get_user_from_token(credentials.credentials)
    except AuthenticationError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except JWTConfigurationError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "JWT authentication is not configured"
        ) from None


def get_current_user(
    user: Annotated[User | None, Depends(get_optional_current_user)],
) -> User:
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*roles: Role) -> Callable[..., User]:
    def check_role(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user

    return check_role


require_admin = require_roles(Role.ADMIN)
require_admin_or_manager = require_roles(Role.ADMIN, Role.MANAGER)
require_authenticated_user = get_current_user
