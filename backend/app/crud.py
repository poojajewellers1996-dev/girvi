import os
import hashlib
import secrets
import hmac
import time
import datetime
from typing import Optional
from sqlalchemy.orm import Session, joinedload, selectinload
from . import models, schemas, config
from .config import settings
from .models import User, OTP, Company, Girvi, Article, Repledge, SystemLog

def get_girvi(db: Session, girvi_id: int) -> Optional[Girvi]:
    return (
        db.query(Girvi)
        .options(selectinload(Girvi.articles), selectinload(Girvi.repledges))
        .filter(Girvi.id == girvi_id)
        .first()
    )

def list_girvis(db: Session, skip: int = 0, limit: Optional[int] = None):
    query = (
        db.query(Girvi)
        .options(selectinload(Girvi.articles), selectinload(Girvi.repledges))
        .order_by(Girvi.id.desc())
        .offset(skip)
    )
    if limit is not None:
        query = query.limit(limit)
    return query.all()

from .models import User, OTP, Company, Girvi, Article, Repledge, RepledgeTransaction, SystemLog

def list_repledges(db: Session):
    try:
        return (
            db.query(Repledge)
            .options(selectinload(Repledge.girvis), selectinload(Repledge.transactions))
            .order_by(Repledge.id.desc())
            .all()
        )
    except Exception:
        db.rollback()
        return (
            db.query(Repledge)
            .options(selectinload(Repledge.girvis))
            .order_by(Repledge.id.desc())
            .all()
        )

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
            photo_path=art.photo_path,
        )
        db.add(article)

    # Handle Repledges
    if girvi_data.new_repledges:
        for new_rep in girvi_data.new_repledges:
            rep_obj = Repledge(
                loan_number=new_rep.loan_number,
                repledger_name=new_rep.repledger_name,
                bank_name=new_rep.bank_name,
                date_of_loan=new_rep.date_of_loan,
                amount=new_rep.amount
            )
            db.add(rep_obj)
            girvi.repledges.append(rep_obj)
    
    if girvi_data.repledge_ids:
        for rid in girvi_data.repledge_ids:
            existing_rep = db.query(Repledge).filter(Repledge.id == rid).first()
            if existing_rep:
                girvi.repledges.append(existing_rep)

    db.commit()
    db.refresh(girvi)
    return girvi




def create_repledge_transaction(db: Session, repledge_id: int, data: schemas.RepledgeTransactionCreate):
    t = RepledgeTransaction(
        repledge_id=repledge_id,
        amount=data.amount,
        payment_date=data.payment_date or datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
        remarks=data.remarks
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

def delete_repledge_transaction(db: Session, transaction_id: int):
    t = db.query(RepledgeTransaction).filter(RepledgeTransaction.id == transaction_id).first()
    if t:
        db.delete(t)
        db.commit()
    return t

def update_repledge_status(db: Session, repledge_id: int, status: str):
    rep = db.query(Repledge).filter(Repledge.id == repledge_id).first()
    if rep:
        rep.status = status
        db.commit()
        db.refresh(rep)
    return rep

def update_repledge(db: Session, repledge_id: int, data: schemas.RepledgeUpdate):
    rep = db.query(Repledge).filter(Repledge.id == repledge_id).first()
    if not rep:
        return None
    
    update_dict = data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        if val is not None:
            setattr(rep, key, val)
            
    db.commit()
    db.refresh(rep)
    return rep




def delete_girvi(db: Session, girvi_id: int):
    girvi = get_girvi(db, girvi_id)
    if girvi:
        # Collect repledge IDs linked to this girvi BEFORE deleting
        linked_repledge_ids = [r.id for r in girvi.repledges]

        db.delete(girvi)
        db.commit()

        # After the girvi (and its girvi_repledges rows) are gone,
        # delete any Repledge records that now have no linked girvis (orphans)
        for rid in linked_repledge_ids:
            rep = db.query(Repledge).filter(Repledge.id == rid).first()
            if rep and len(rep.girvis) == 0:
                db.delete(rep)
        db.commit()

    return girvi


def update_girvi_status(db: Session, girvi_id: int, status: str):
    girvi = get_girvi(db, girvi_id)
    if girvi:
        girvi.status = status
        db.commit()
        db.refresh(girvi)
    return girvi

from .models import LedgerTransaction

def release_girvi_with_settlement(
    db: Session, 
    girvi_id: int, 
    interest_amount: Optional[float] = 0.0, 
    rate: Optional[float] = None, 
    months: Optional[int] = None, 
    total_amount: Optional[float] = None,
    release_date: Optional[datetime.datetime] = None,
    remarks: Optional[str] = None
):
    girvi = get_girvi(db, girvi_id)
    if not girvi:
        return None
    
    girvi.status = "Released"
    tx_date = release_date or datetime.datetime.now()

    if interest_amount and interest_amount > 0:
        int_tx = LedgerTransaction(
            girvi_id=girvi_id,
            transaction_type="INTEREST_PAID",
            amount=float(interest_amount),
            transaction_date=tx_date,
            remarks=remarks or f"Interest collected upon release ({months or 1} mos @ {rate or 0}%/mo)"
        )
        db.add(int_tx)

    if total_amount and total_amount > 0:
        prin_amt = float(girvi.loan_amount or 0.0)
        prin_tx = LedgerTransaction(
            girvi_id=girvi_id,
            transaction_type="PRINCIPAL_PAYMENT",
            amount=prin_amt,
            transaction_date=tx_date,
            remarks=f"Principal loan settlement upon release"
        )
        db.add(prin_tx)

    db.commit()
    db.refresh(girvi)
    return girvi

def part_payment_girvi(db: Session, girvi_id: int, amount: float):
    # Legacy - unused in UI, kept for compatibility if needed.
    girvi = get_girvi(db, girvi_id)
    if girvi and girvi.loan_amount >= amount:
        girvi.loan_amount -= amount
        db.commit()
        db.refresh(girvi)
    return girvi

def create_transaction(db: Session, girvi_id: int, transaction_data: schemas.TransactionCreate):
    transaction = LedgerTransaction(
        girvi_id=girvi_id,
        transaction_type=transaction_data.transaction_type,
        amount=transaction_data.amount,
        remarks=transaction_data.remarks
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

def get_transactions(db: Session, girvi_id: int):
    return db.query(LedgerTransaction).filter(LedgerTransaction.girvi_id == girvi_id).order_by(LedgerTransaction.id.asc()).all()

def delete_transaction(db: Session, transaction_id: int):
    t = db.query(LedgerTransaction).filter(LedgerTransaction.id == transaction_id).first()
    if t:
        db.delete(t)
        db.commit()
    return t

def update_girvi(db: Session, girvi_id: int, girvi_data: schemas.GirviCreate):
    girvi = get_girvi(db, girvi_id)
    if not girvi:
        return None
    
    # Update main fields
    girvi.pledge_no = girvi_data.pledge_no
    girvi.pledge_date = girvi_data.pledge_date
    girvi.due_date = girvi_data.due_date
    girvi.customer_name = girvi_data.customer_name
    girvi.relation_type = girvi_data.relation_type
    girvi.relation_name = girvi_data.relation_name
    girvi.address = girvi_data.address
    girvi.mobile_number = girvi_data.mobile_number
    girvi.photo_path = girvi_data.photo_path
    girvi.present_value = girvi_data.present_value
    girvi.loan_amount = girvi_data.loan_amount
    girvi.loan_amount_words = girvi_data.loan_amount_words
    girvi.monthly_income = girvi_data.monthly_income
    girvi.status = girvi_data.status

    # Update articles (recreate them)
    db.query(Article).filter(Article.girvi_id == girvi_id).delete()
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
            photo_path=art.photo_path,
        )
        db.add(article)

    # Handle Repledges
    girvi.repledges = [] # Clear existing associations
    if girvi_data.new_repledges:
        for new_rep in girvi_data.new_repledges:
            rep_obj = Repledge(
                loan_number=new_rep.loan_number,
                repledger_name=new_rep.repledger_name,
                bank_name=new_rep.bank_name,
                date_of_loan=new_rep.date_of_loan,
                amount=new_rep.amount
            )
            db.add(rep_obj)
            girvi.repledges.append(rep_obj)
    
    if girvi_data.repledge_ids:
        for rid in girvi_data.repledge_ids:
            existing_rep = db.query(Repledge).filter(Repledge.id == rid).first()
            if existing_rep:
                girvi.repledges.append(existing_rep)

    db.commit()
    db.refresh(girvi)
    return girvi

# ==================== Settings & Logs ====================

def list_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(SystemLog).order_by(SystemLog.id.desc()).offset(skip).limit(limit).all()

def get_company(db: Session, company_id: int):
    return db.query(Company).filter(Company.id == company_id).first()

def update_company(db: Session, company_id: int, company_data: schemas.CompanyUpdate):
    company = get_company(db, company_id)
    if not company:
        return None
    
    if company_data.name is not None:
        company.name = company_data.name
    if company_data.address is not None:
        company.address = company_data.address
    if company_data.pin_code is not None:
        company.pin_code = company_data.pin_code
    if company_data.mobile is not None:
        company.mobile = company_data.mobile
        
    if company_data.password is not None:
        # Assuming admin_user password update
        admin = db.query(User).filter(User.id == company.admin_user_id).first()
        if admin:
            admin.password_hash = hash_password(company_data.password)
            
    db.commit()
    db.refresh(company)
    return company
