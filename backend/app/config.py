import os
from pathlib import Path
from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


class Settings(BaseSettings):
    SECRET_KEY: str = "pooja-jewellers-super-secret-key-that-is-extremely-secure"
    DATABASE_URL: str = ""
    GLOBAL_TIME_OFFSET_SECONDS: float = 0.0
    OTP_EXPIRY_SECONDS: int = 300
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://day-book-five.vercel.app",
    ]
    CORS_ORIGIN_REGEX: str = r"https://.*\.vercel\.app"
    LIVE_RATES_URL: str = "https://www.goodreturns.in/gold-rates/bangalore.html"
    BACKUP_RETENTION_DAYS: int = 14

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()

BASE_DIR = Path(__file__).resolve().parents[1]
if not settings.DATABASE_URL:
    _db_path = BASE_DIR / "database.db"
    settings.DATABASE_URL = f"sqlite:///{_db_path}"
elif settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)

_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
