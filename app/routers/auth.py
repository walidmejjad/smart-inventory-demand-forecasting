from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import User
from app.schemas.auth import TokenResponse, UserLogin, UserRegister
from app.schemas.user import UserResponse
from app.security.dependencies import get_current_user, get_optional_current_user
from app.security.exceptions import (
    AuthenticationError,
    AuthorizationError,
    JWTConfigurationError,
)
from app.services.auth import AuthService, DuplicateEmailError

router = APIRouter(prefix="/auth", tags=["Authentication"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    data: UserRegister,
    db: DatabaseSession,
    actor: Annotated[User | None, Depends(get_optional_current_user)],
) -> UserResponse:
    """Public users may register as EMPLOYEE; only ADMIN may assign other roles."""
    try:
        user = AuthService(db).register(data, actor)
    except DuplicateEmailError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email is already registered") from None
    except AuthenticationError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except AuthorizationError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from None
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: DatabaseSession, response: Response) -> TokenResponse:
    try:
        token, user = AuthService(db).login(data)
    except AuthenticationError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except JWTConfigurationError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "JWT authentication is not configured"
        ) from None
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    return UserResponse.model_validate(user)
