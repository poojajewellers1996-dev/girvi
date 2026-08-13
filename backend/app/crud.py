import os
import hashlib
import secrets
import hmac
import time
import datetime
from typing import Optional
from sqlalchemy.orm import Session
from . import models, schemas, config
from .config import settings
from .models import User, OTP, Company, Girvi, Article
from .schemas import (
    LoginRequest,
    TokenResponse,
    OTPRequest,
    OTPVerify,
    PasswordReset,
    CompanyRegister,
    GirviCreate,
    GirviRead,
    ArticleCreate,
)
from fastapi import HTTPException, status

# ==================== Utility Functions ====================

def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    if salt is None:
        salt = secrets.token_bytes(16)
    kdf = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}:{kdf.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt_str, key_str = hashed.split(":")
        salt = bytes.fromhex(salt_str)
        key = bytes.fromhex(key_str)
        kdf = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(kdf, key)
    except Exception:
        return False

# ==================== User CRUD ====================

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, username: str, password: str, pin: str, phone: Optional[str] = None) -> User:
    password_hash = hash_password(password)
    pin_hash = hash_password(pin)
    user = User(username=username, password_hash=password_hash, pin_hash=pin_hash, phone=phone)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def set_user_password(db: Session, user: User, new_password: str):
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user

def set_user_pin(db: Session, user: User, new_pin: str):
    user.pin_hash = hash_password(new_pin)
    db.commit()
    db.refresh(user)
    return user

# ==================== OTP CRUD ====================

def create_otp(db: Session, user: User, code: str, expires_in: Optional[int] = None):
    if expires_in is None:
        expires_in = settings.OTP_EXPIRY_SECONDS
    expires_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(seconds=expires_in)
    otp = OTP(user_id=user.id, code=code, expires_at=expires_at, used=False)
    db.add(otp)
    db.commit()
    db.refresh(otp)
    return otp

def get_valid_otp(db: Session, user: User, code: str) -> Optional[OTP]:
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    otp = (
        db.query(OTP)
        .filter(
            OTP.user_id == user.id,
            OTP.code == code,
            OTP.expires_at > now,
            OTP.used.is_(False),
        )
        .first()
    )
    return otp

def mark_otp_used(db: Session, otp: OTP):
    otp.used = True
    db.commit()
    db.refresh(otp)
    return otp

# ==================== Company CRUD ====================

def create_company(db: Session, admin_user: User, data: CompanyRegister):
    company = Company(
        name=data.name,
        address=data.address,
        pin_code=data.pin_code,
        mobile=data.mobile,
        admin_user_id=admin_user.id,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

# ==================== Girvi CRUD ====================

def create_girvi(db: Session, girvi_data: GirviCreate, owner_user_id: int):
    # Create Girvi record
    girvi = Girvi(
        pledge_no=girvi_data.pledge_no,
        pledge_date=girvi_data.pledge_date,
        due_date=girvi_data.due_date,
        customer_name=girvi_data.customer_name,
        relation_type=girvi_data.relation_type,
        relation_name=girvi_data.relation_name,
        address=girvi_data.address,
        mobile_number=girvi_data.mobile_number,
        photo_path=girvi_data.photo_path,
        present_value=girvi_data.present_value,
        loan_amount=girvi_data.loan_amount,
        loan_amount_words=girvi_data.loan_amount_words,
        monthly_income=girvi_data.monthly_income,
        status=girvi_data.status,
    )
    db.add(girvi)
    db.flush()  # obtain girvi.id before adding articles

    # Add nested articles
    for art in girvi_data.articles:
        article = Article(
            girvi_id=girvi.id,
            name=art.name,
            quantity=art.quantity,
            gross_wt=art.gross_wt,
            less_wt=art.less_wt,
            net_wt=art.net_wt,
            present_value=art.present_value,
            loan_amount=art.loan_amount,
            loan_amount_words=art.loan_amount_words,
        )
        db.add(article)
    db.commit()
    db.refresh(girvi)
    return girvi

def get_girvi(db: Session, girvi_id: int) -> Optional[Girvi]:
    return db.query(Girvi).filter(Girvi.id == girvi_id).first()

def list_girvis(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Girvi).order_by(Girvi.id.desc()).offset(skip).limit(limit).all()

# Additional helper for existing pledge CRUD can be retained elsewhere if needed.
