from typing import Annotated, Literal

from pydantic import BaseModel, Field, SecretStr, field_validator

from app.schemas.user import EmailInput, UserName, UserResponse


class UserRegister(EmailInput):
    first_name: UserName
    last_name: UserName
    password: Annotated[SecretStr, Field(min_length=12, max_length=128)]

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: SecretStr) -> SecretStr:
        password = value.get_secret_value()
        if password.isspace() or len(set(password)) < 2:
            raise ValueError("Use a password or passphrase with more than one distinct character")
        return value


class UserLogin(EmailInput):
    password: Annotated[SecretStr, Field(min_length=1, max_length=128)]


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserResponse
