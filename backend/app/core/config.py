"""
アプリケーション設定
環境変数から自動読み込み（pydantic-settings）
"""

import logging
import warnings
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # アプリ基本設定
    APP_NAME: str = "ServiceHub Construction Platform"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    APP_URL: str = "https://servicehub.local"

    # DB設定
    DATABASE_URL: str = "postgresql+asyncpg://servicehub:password@db:5432/servicehub"

    # Redis設定
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT設定
    JWT_SECRET_KEY: str = "change-me-in-production-use-strong-random-key"  # noqa: S107
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS設定
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:7080",
        "http://localhost:4173",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: object) -> list[str] | object:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # MinIO設定
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "servicehub"

    # SMTP / Email 通知設定（Phase 2a）
    # 開発環境は Mailhog 互換 SMTP (認証なし / TLS なし) を想定。
    # 本番は環境変数で上書きする。
    SMTP_HOST: str = "mailhog"
    SMTP_PORT: int = 1025
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_USE_TLS: bool = False
    SMTP_USE_STARTTLS: bool = False
    SMTP_TIMEOUT_SECONDS: int = 10
    SMTP_FROM_ADDRESS: str = "noreply@servicehub.local"
    SMTP_FROM_NAME: str = "ServiceHub"

    # 通知リトライループ設定（Phase 2f）
    # 本番環境では環境変数 NOTIFICATION_RETRY_INTERVAL_SECONDS で上書き可能。
    NOTIFICATION_RETRY_INTERVAL_SECONDS: int = 60

    # Rate limit (test env: LOGIN_RATE_LIMIT=1000/minute)
    LOGIN_RATE_LIMIT: str = "5/minute"
    REFRESH_RATE_LIMIT: str = "10/minute"

    # OpenAI API設定
    OPENAI_API_KEY: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def warn_weak_secrets_in_production(self) -> "Settings":
        _weak_jwt_key = "change-me-in-production-use-strong-random-key"  # noqa: S105
        if self.ENVIRONMENT == "production" and self.JWT_SECRET_KEY == _weak_jwt_key:
            warnings.warn(
                "JWT_SECRET_KEY uses the default insecure value in production. "
                "Set a strong random key via JWT_SECRET_KEY env var.",
                stacklevel=2,
            )
            logging.getLogger(__name__).critical(
                "SECURITY: JWT_SECRET_KEY is the default insecure value in production!"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
