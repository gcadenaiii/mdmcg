"""
Backend configuration — loaded from environment variables.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database — env vars: DATABASE_URL, DATABASE_URL_SYNC
    database_url: str = "postgresql+asyncpg://rpm:rpm_dev_password@localhost:5432/rpm"
    database_url_sync: str = "postgresql://rpm:rpm_dev_password@localhost:5432/rpm"

    # Auth — env var: RPM_API_KEY
    api_key: str = Field("dev-api-key-change-me", validation_alias="RPM_API_KEY")

    # App — env vars: RPM_DEBUG, RPM_ALLOWED_ORIGINS
    app_name: str = "RPM Backend"
    debug: bool = Field(False, validation_alias="RPM_DEBUG")
    allowed_origins: str = Field("*", validation_alias="RPM_ALLOWED_ORIGINS")


@lru_cache
def get_settings() -> Settings:
    return Settings()
