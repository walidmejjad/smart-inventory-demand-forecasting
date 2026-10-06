from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Role, User
from app.repositories.user import UserRepository
from app.schemas.auth import UserLogin, UserRegister
from app.security.exceptions import AuthenticationError
from app.security.passwords import hash_password, verify_dummy_password, verify_password
from app.security.tokens import create_access_token, decode_access_token


class DuplicateEmailError(Exception):
    """The supplied email is already registered."""


class AuthService:
    def __init__(self, db: Session) -> None:
        self.repository = UserRepository(db)

    def register(self, data: UserRegister) -> User:
        if self.repository.get_by_email(str(data.email)) is not None:
            raise DuplicateEmailError("Email is already registered")

        values = data.model_dump(exclude={"password"})
        values["role"] = Role.EMPLOYEE
        values["password_hash"] = hash_password(data.password.get_secret_value())
        try:
            return self.repository.create(values)
        except IntegrityError:
            # The repository rolls back before returning control here.
            if self.repository.get_by_email(str(data.email)) is not None:
                raise DuplicateEmailError("Email is already registered") from None
            raise

    def login(self, data: UserLogin) -> tuple[str, User]:
        user = self.repository.get_by_email(str(data.email))
        password = data.password.get_secret_value()
        if user is None:
            verify_dummy_password(password)
            raise AuthenticationError("Invalid email or password")
        if not verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid email or password")
        return create_access_token(user.id), user

    def get_user_from_token(self, token: str) -> User:
        user_id = decode_access_token(token)
        user = self.repository.get(user_id)
        if user is None:
            raise AuthenticationError("Invalid access token")
        return user
