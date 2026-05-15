"""
config.py — centralised application settings via pydantic-settings.

All values can be overridden by environment variables or a .env file.
Copy .env.example → .env and fill in your values.
"""

from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


# ── Project root ──────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models" / "saved"
LOGS_DIR = BASE_DIR / "logs"

# Ensure directories exist
MODELS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True,   exist_ok=True)


class Settings(BaseSettings):
    """
    Application-wide settings.
    Precedence: env vars > .env file > defaults below.
    """

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App meta ─────────────────────────────────────
    app_name:    str = "Anemia AI Tracker API"
    app_version: str = "1.0.0"
    debug:       bool = Field(
        default=False, description="Enable debug mode / hot-reload")
    environment: str = Field(default="development",
                             description="development | production")

    # ── Server ───────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    # ── CORS ─────────────────────────────────────────
    # Comma-separated list of allowed origins.
    # In dev, CRA dev server runs on 3000.
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # ── Database ─────────────────────────────────────
    database_url: str = Field(
        default="sqlite:///./anemia_tracker.db",
        description="SQLAlchemy DB URL. Use postgresql://... in production.",
    )
    db_echo: bool = False   # Set True to log every SQL statement

    # ── Model paths ──────────────────────────────────
    model_path: str = str(MODELS_DIR / "hb_cnn_model.h5")
    model_input_size: int = 128   # pixels — must match training

    # ── IQA thresholds ───────────────────────────────
    iqa_blur_threshold:       float = 80.0
    iqa_brightness_low:       float = 40.0
    iqa_brightness_high:      float = 220.0

    # ── Inference ────────────────────────────────────
    inference_timeout_s: int = 55   # hard ceiling below 60-s SLA

    # ── PDF generation ───────────────────────────────
    pdf_output_dir: str = str(BASE_DIR / "tmp" / "reports")

    # ── Security ─────────────────────────────────────
    secret_key: str = Field(
        default="CHANGE_ME_IN_PRODUCTION_USE_A_LONG_RANDOM_STRING",
        description="JWT signing key — override in .env for production",
    )
    access_token_expire_minutes: int = 60 * 24   # 24 hours

    # ── Logging ──────────────────────────────────────
    log_level: str = "INFO"
    log_file:  str = str(LOGS_DIR / "api.log")


@lru_cache
def get_settings() -> Settings:
    """
    Return a cached Settings singleton.
    Use `get_settings()` everywhere; do NOT instantiate Settings() directly.
    """
    return Settings()


# ── Convenience alias ─────────────────────────────────
settings = get_settings()
