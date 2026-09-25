from typing import ClassVar, Self

from pydantic import BaseModel, ConfigDict, model_validator


class InputSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class UpdateSchema(InputSchema):
    non_nullable_fields: ClassVar[frozenset[str]] = frozenset()

    @model_validator(mode="after")
    def reject_explicit_nulls(self) -> Self:
        for name in sorted(self.non_nullable_fields & self.model_fields_set):
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self
