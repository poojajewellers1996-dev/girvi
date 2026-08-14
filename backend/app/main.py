import time
import datetime
import json
import base64
import hmac
import hashlib
import secrets
import uuid
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import settings, get_db, engine, Base
from . import models, schemas, crud
from .whatsapp_service import WhatsAppClient
from twilio.rest import Client

from sqlalchemy import text
# ─── Create all DB tables ─────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE girvis ADD COLUMN monthly_income FLOAT;"))
except Exception:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE girvis ADD COLUMN status VARCHAR DEFAULT 'Active';"))
except Exception:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE articles ADD COLUMN photo_path TEXT;"))
except Exception:
    pass

# ─── JWT helpers ──────────────────────────────────────────────────────────────


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64_decode(data: str) -> bytes:
    data += "=" * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data)

def create_access_token(subject: str, session_id: Optional[str] = None, expires_in: int = 86400) -> str:
    header = _b64_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = {"sub": subject, "exp": int(time.time()) + expires_in}
    if session_id:
        payload["sid"] = session_id
    body = _b64_encode(json.dumps(payload).encode())
    msg = f"{header}.{body}"
    sig = _b64_encode(hmac.new(settings.SECRET_KEY.encode(), msg.encode(), hashlib.sha256).digest())
    return f"{msg}.{sig}"

def decode_access_token(token: str) -> Optional[dict]:
    try:
        h, b, s = token.split(".")
        msg = f"{h}.{b}"
        expected = _b64_encode(hmac.new(settings.SECRET_KEY.encode(), msg.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(s, expected):
            return None
        payload = json.loads(_b64_decode(b).decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

# ─── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Girvi Management API",
    description="Backend API for Girvi (pawn) management system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


# ─── Auth dependency ──────────────────────────────────────────────────────────

def get_current_user(request: Request, db: Session = Depends(get_db)) -> dict:
    """Validate Bearer JWT; return token payload."""
    BYPASS = {"/auth/login", "/auth/request-password-reset", "/auth/verify-otp", "/company/register", "/docs", "/openapi.json", "/redoc", "/auth/send-registration-otp", "/auth/verify-registration-otp"}
    if request.url.path in BYPASS:
        return {}
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    payload = decode_access_token(auth.split(" ", 1)[1])
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    # Touch last_active_at
    username = payload.get("sub")
    if username:
        user = db.query(models.User).filter(models.User.username == username).first()
        if user:
            if user.current_session_id != payload.get("sid"):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="SESSION_SUPERSEDED")
            user.last_active_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
    return payload

# ─── System log helper ────────────────────────────────────────────────────────

def log_system_action(db: Session, action: str, details: str, module: str = "GENERAL"):
    try:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.add(models.SystemLog(timestamp=now_str, action=action, details=details, module=module))
        db.commit()
    except Exception as exc:
        print(f"[Log Error] {exc}")

# ─── WhatsApp client ──────────────────────────────────────────────────────────
_wa = WhatsAppClient()

# ─────────────────────────────────────────────────────────────────────────────
# AUTH ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, data.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    authenticated = False
    if data.password:
        authenticated = crud.verify_password(data.password, user.password_hash)
    elif data.pin:
        authenticated = crud.verify_password(data.pin, user.pin_hash)
    if not authenticated:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    sid = str(uuid.uuid4())
    user.current_session_id = sid
    user.last_active_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    token = create_access_token(user.username, session_id=sid)
    log_system_action(db, "USER_LOGIN", f"User {user.username} logged in", module="AUTH")
    return schemas.TokenResponse(access_token=token)


@app.post("/auth/reset-pin")
def reset_pin(username: str, new_pin: str, password: str, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username)
    if not user or not crud.verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    crud.set_user_pin(db, user, new_pin)
    log_system_action(db, "PIN_RESET", f"PIN reset for {username}", module="AUTH")
    return {"status": "pin reset successful"}


@app.post("/auth/request-password-reset")
def request_password_reset(body: schemas.OTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.phone == body.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone not registered")
    code = f"{secrets.randbelow(1000000):06d}"
    crud.create_otp(db, user, code)
    _wa.send_otp(body.phone, code)
    return {"status": "OTP sent"}


@app.post("/auth/verify-otp")
def verify_otp_and_reset(body: schemas.OTPVerify, new_password: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.phone == body.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone not found")
    otp = crud.get_valid_otp(db, user, body.code)
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    crud.set_user_password(db, user, new_password)
    crud.mark_otp_used(db, otp)
    log_system_action(db, "PASSWORD_RESET", f"Password reset via OTP for {user.username}", module="AUTH")
    return {"status": "password reset successful"}

# ─────────────────────────────────────────────────────────────────────────────
# COMPANY REGISTRATION
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/auth/send-registration-otp")
def send_registration_otp(body: schemas.OTPRequest):
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        phone_number = f"+91{body.phone}" if not body.phone.startswith("+") else body.phone
        client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID).verifications.create(to=phone_number, channel="sms")
        return {"status": "OTP sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/verify-registration-otp")
def verify_registration_otp(body: schemas.OTPVerify):
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        phone_number = f"+91{body.phone}" if not body.phone.startswith("+") else body.phone
        verification_check = client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID).verification_checks.create(to=phone_number, code=body.code)
        
        if verification_check.status == "approved":
            return {"status": "verified"}
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/company/register")
def register_company(data: schemas.CompanyRegister, db: Session = Depends(get_db)):
    if crud.get_user_by_username(db, data.mobile):
        raise HTTPException(status_code=400, detail="Mobile already registered")
    admin = crud.create_user(db, username=data.mobile, password=data.password, pin=data.pin, phone=data.mobile)
    company = crud.create_company(db, admin, data)
    log_system_action(db, "COMPANY_REGISTER", f"New company: {data.name}", module="SETUP")
    return {"company_id": company.id, "admin_user_id": admin.id, "username": admin.username}

# ─────────────────────────────────────────────────────────────────────────────
# GIRVI ROUTES  (protected)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/girvi", response_model=schemas.GirviRead)
def create_girvi(
    girvi: schemas.GirviCreate,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    new_girvi = crud.create_girvi(db, girvi, owner_user_id=0)
    log_system_action(db, "GIRVI_CREATE", f"New Girvi #{girvi.pledge_no} for {girvi.customer_name}", module="GIRVI")
    return schemas.GirviRead.model_validate(new_girvi)


@app.get("/girvi", response_model=List[schemas.GirviRead])
def list_girvis(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    return [schemas.GirviRead.model_validate(g) for g in crud.list_girvis(db, skip, limit)]
@app.get("/repledge", response_model=List[schemas.RepledgeRead])
def list_repledges(
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    return [schemas.RepledgeRead.model_validate(r) for r in crud.list_repledges(db)]

@app.post("/repledge/{repledge_id}/transactions", response_model=schemas.RepledgeTransactionRead)
@app.post("/repledge/{repledge_id}/transactions/", response_model=schemas.RepledgeTransactionRead)
def create_repledge_transaction(
    repledge_id: int,
    data: schemas.RepledgeTransactionCreate,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    rep = db.query(models.Repledge).filter(models.Repledge.id == repledge_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Bank repledge not found")
    new_t = crud.create_repledge_transaction(db, repledge_id, data)
    log_system_action(db, "REPLEDGE_INTEREST_ADD", f"Added bank interest payment of ₹{data.amount} on Loan #{rep.loan_number}", module="REPLEDGE")
    return schemas.RepledgeTransactionRead.model_validate(new_t)

@app.delete("/repledge/transactions/{transaction_id}")
@app.delete("/repledge/transactions/{transaction_id}/")
def delete_repledge_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    deleted = crud.delete_repledge_transaction(db, transaction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction not found")
    log_system_action(db, "REPLEDGE_INTEREST_DELETE", f"Deleted bank interest payment #{transaction_id}", module="REPLEDGE")
    return {"status": "deleted"}



@app.get("/girvi/stats")
def get_girvi_stats(db: Session = Depends(get_db), token: dict = Depends(get_current_user)):
    from sqlalchemy import func
    
    total_girvis = db.query(func.count(models.Girvi.id)).scalar() or 0
    active_girvis = db.query(func.count(models.Girvi.id)).filter(models.Girvi.status == 'Active').scalar() or 0
    released_girvis = db.query(func.count(models.Girvi.id)).filter(models.Girvi.status == 'Released').scalar() or 0
    
    total_loan_amount = db.query(func.sum(models.Girvi.loan_amount)).scalar() or 0
    active_loan_amount = db.query(func.sum(models.Girvi.loan_amount)).filter(models.Girvi.status == 'Active').scalar() or 0
    released_loan_amount = db.query(func.sum(models.Girvi.loan_amount)).filter(models.Girvi.status == 'Released').scalar() or 0

    return {
        "total_girvis": total_girvis,
        "active_girvis": active_girvis,
        "released_girvis": released_girvis,
        "total_loan_amount": total_loan_amount,
        "active_loan_amount": active_loan_amount,
        "released_loan_amount": released_loan_amount
    }

@app.get("/girvi/{girvi_id}", response_model=schemas.GirviRead)
def get_girvi(
    girvi_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    g = crud.get_girvi(db, girvi_id)
    if not g:
        raise HTTPException(status_code=404, detail="Girvi not found")
    return schemas.GirviRead.model_validate(g)

@app.put("/girvi/{girvi_id}", response_model=schemas.GirviRead)
def update_girvi(
    girvi_id: int,
    girvi_data: schemas.GirviCreate,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    updated = crud.update_girvi(db, girvi_id, girvi_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Girvi not found")
    log_system_action(db, "GIRVI_UPDATE", f"Updated Girvi #{updated.pledge_no}", module="GIRVI")
    return schemas.GirviRead.model_validate(updated)

@app.delete("/girvi/{girvi_id}")
def delete_girvi(
    girvi_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    deleted = crud.delete_girvi(db, girvi_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Girvi not found")
    log_system_action(db, "GIRVI_DELETE", f"Deleted Girvi #{deleted.pledge_no}", module="GIRVI")
    return {"status": "deleted"}

@app.patch("/girvi/{girvi_id}/release", response_model=schemas.GirviRead)
def release_girvi(
    girvi_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    released = crud.update_girvi_status(db, girvi_id, "Released")
    if not released:
        raise HTTPException(status_code=404, detail="Girvi not found")
    log_system_action(db, "GIRVI_RELEASE", f"Released Girvi #{released.pledge_no}", module="GIRVI")
    return schemas.GirviRead.model_validate(released)

@app.patch("/girvi/{girvi_id}/part-payment", response_model=schemas.GirviRead)
def part_payment_girvi(
    girvi_id: int,
    payment: schemas.PartPaymentRequest,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    updated = crud.part_payment_girvi(db, girvi_id, payment.amount)
    if not updated:
        raise HTTPException(status_code=400, detail="Invalid Girvi or Amount exceeds loan")
    log_system_action(db, "GIRVI_PART_PAYMENT", f"Part payment of ₹{payment.amount} on Girvi #{updated.pledge_no}", module="GIRVI")
    return schemas.GirviRead.model_validate(updated)


@app.get("/customer/{mobile_number}", response_model=schemas.GirviRead)
def get_customer_by_mobile(
    mobile_number: str,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    g = db.query(models.Girvi).filter(models.Girvi.mobile_number == mobile_number).order_by(models.Girvi.id.desc()).first()
    if not g:
        raise HTTPException(status_code=404, detail="Customer not found")
    return schemas.GirviRead.model_validate(g)

# ─────────────────────────────────────────────────────────────────────────────
# LEDGER TRANSACTIONS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/girvi/{girvi_id}/transactions", response_model=List[schemas.TransactionRead])
def get_transactions(
    girvi_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    # Verify girvi exists
    girvi = crud.get_girvi(db, girvi_id)
    if not girvi:
        raise HTTPException(status_code=404, detail="Girvi not found")
    transactions = crud.get_transactions(db, girvi_id)
    return [schemas.TransactionRead.model_validate(t) for t in transactions]

@app.post("/girvi/{girvi_id}/transactions", response_model=schemas.TransactionRead)
def create_transaction(
    girvi_id: int,
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    girvi = crud.get_girvi(db, girvi_id)
    if not girvi:
        raise HTTPException(status_code=404, detail="Girvi not found")
    
    new_t = crud.create_transaction(db, girvi_id, transaction)
    log_system_action(db, "LEDGER_TRANSACTION", f"Added {transaction.transaction_type} of ₹{transaction.amount} on Girvi #{girvi.pledge_no}", module="GIRVI")
    return schemas.TransactionRead.model_validate(new_t)

@app.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user),
):
    deleted = crud.delete_transaction(db, transaction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction not found")
    log_system_action(db, "LEDGER_TRANSACTION_DELETE", f"Deleted transaction #{transaction_id}", module="GIRVI")
    return {"status": "deleted"}

# ─────────────────────────────────────────────────────────────────────────────
# WHATSAPP STUB
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/whatsapp/send")
def send_whatsapp(to: str, message: str, token: dict = Depends(get_current_user)):
    _wa.send_message(to, message)
    return {"status": "sent"}

# ─────────────────────────────────────────────────────────────────────────────
# SETTINGS & LOGS ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/logs", response_model=List[schemas.SystemLogRead])
def get_system_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user)
):
    return [schemas.SystemLogRead.model_validate(log) for log in crud.list_logs(db, skip, limit)]

@app.get("/company", response_model=schemas.CompanyRead)
def get_company_details(
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user)
):
    # Fetch first company since it's a single tenant app
    company = db.query(models.Company).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return schemas.CompanyRead.model_validate(company)

@app.put("/company", response_model=schemas.CompanyRead)
def update_company_details(
    company_data: schemas.CompanyUpdate,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user)
):
    company = db.query(models.Company).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    updated = crud.update_company(db, company.id, company_data)
    log_system_action(db, "SETTINGS_UPDATE", f"Updated company profile", module="SETUP")
    return schemas.CompanyRead.model_validate(updated)
