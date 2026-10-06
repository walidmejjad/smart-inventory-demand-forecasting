from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "smart_inventory"
    database_user: str = "postgres"
    database_password: str = ""

    jwt_secret_key: SecretStr | None = Field(default=None, repr=False)
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_access_token_expire_minutes: int = Field(default=60, ge=1, le=1440)

    min_forecast_history_days: int = Field(default=30, ge=30)
    min_forecast_sales_days: int = Field(default=7, ge=4)

    @property
    def database_url(self) -> URL:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.database_user,
            password=self.database_password,
            host=self.database_host,
            port=self.database_port,
            database=self.database_name,
        )


settings = Settings()
