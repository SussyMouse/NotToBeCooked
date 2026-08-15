from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


# Duplicate value of a variable follows a priority system where
# system variable (e.g. Docker) > values in .env > values in config.py
class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "NotToBeCooked API"
    VERSION: str = "0.0.1"

    # JWT Authentication Settings
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_SECRET: str = "dev_access_token_secret_key_change_in_prod"
    REFRESH_TOKEN_SECRET: str = "dev_refresh_token_secret_key_change_in_prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database Settings
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/not_to_be_cooked"

    # Gemini Settings
    GEMINI_API_KEY: SecretStr
    GEMINI_MODEL_NAME: str = "gemini-3.5-flash-lite"
    GEMINI_API_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_API_TIMEOUT_SECONDS: float = 30.0

    # LLM Calls Settings
    LLM_FAKE_MODE: bool = Field(default=True)

    # Load from .env file automatically
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()  # pyright: ignore[reportCallIssue]
