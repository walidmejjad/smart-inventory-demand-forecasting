from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

from app.models import Role
from app.schemas._base import InputSchema

UserName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
UserEmail = Annotated[EmailStr, Field(max_length=254)]


class EmailInput(InputSchema):
    email: UserEmail

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    role: Role
    created_at: datetime
    updated_at: datetime
