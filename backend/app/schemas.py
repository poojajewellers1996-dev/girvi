from pydantic import BaseModel, Field, field_validator
from typing import Annotated, List, Optional
from datetime import datetime
from pydantic import StringConstraints


# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: Optional[str] = None
    pin: Optional[Annotated[str, StringConstraints(pattern=r"^\d{4}$")]] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── OTP ──────────────────────────────────────────────────────────────────────

class OTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+?\d{10,15}$")

class OTPVerify(BaseModel):
    phone: str = Field(..., pattern=r"^\+?\d{10,15}$")
    code: str = Field(..., min_length=4, max_length=6)

class PasswordReset(BaseModel):
    phone: str = Field(..., pattern=r"^\+?\d{10,15}$")
    new_password: str = Field(..., min_length=6)


# ─── Company Registration ──────────────────────────────────────────────────────

class CompanyRegister(BaseModel):
    name: str
    address: str
    pin_code: str
    mobile: str = Field(..., pattern=r"^\+?\d{10,15}$")
    password: str = Field(..., min_length=6)
    pin: Annotated[str, StringConstraints(pattern=r"^\d{4}$")]
    shop_details: Optional[str] = None
class CompanyRead(BaseModel):
    id: int
    name: str
    address: str
    pin_code: str
    mobile: str
    model_config = {"from_attributes": True}

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    pin_code: Optional[str] = None
    mobile: Optional[str] = Field(None, pattern=r"^\+?\d{10,15}$")
    password: Optional[str] = Field(None, min_length=6)

# ─── System Logs ──────────────────────────────────────────────────────────────

class SystemLogRead(BaseModel):
    id: int
    timestamp: str
    action: str
    details: str
    user_name: Optional[str] = None
    module: Optional[str] = None
    model_config = {"from_attributes": True}

# ─── Ledger Transactions ──────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    transaction_type: str = Field(..., description="PRINCIPAL_PAYMENT, INTEREST_PAID, or TOPUP")
    amount: float
    remarks: Optional[str] = None

class TransactionRead(BaseModel):
    id: int
    girvi_id: int
    transaction_type: str
    amount: float
    transaction_date: datetime
    remarks: Optional[str] = None
    model_config = {"from_attributes": True}
# ─── Girvi Articles ────────────────────────────────────────────────────────────

class ArticleCreate(BaseModel):
    name: str
    quantity: int = Field(..., gt=0)
    gross_wt: float = Field(..., gt=0)
    less_wt: float = Field(..., ge=0)
    net_wt: float = Field(..., gt=0)
    present_value: float = Field(..., gt=0)
    loan_amount: float = Field(..., gt=0)
    loan_amount_words: str
    photo_path: Optional[str] = None

    @field_validator("net_wt")
    @classmethod
    def net_wt_check(cls, v, info):
        gross = info.data.get("gross_wt")
        less = info.data.get("less_wt")
        if gross is not None and less is not None and abs(v - (gross - less)) > 0.01:
            raise ValueError("net_wt must equal gross_wt - less_wt")
        return v

class ArticleRead(BaseModel):
    id: int
    name: str
    quantity: int
    gross_wt: float
    less_wt: float
    net_wt: float
    present_value: float
    loan_amount: float
    loan_amount_words: str
    photo_path: Optional[str] = None

    model_config = {"from_attributes": True}

# ─── Repledge ────────────────────────────────────────────────────────────────────

class RepledgeCreate(BaseModel):
    loan_number: str
    repledger_name: str
    bank_name: str
    date_of_loan: datetime
    amount: float
    status: Optional[str] = "Active"

class RepledgeUpdate(BaseModel):
    loan_number: Optional[str] = None
    repledger_name: Optional[str] = None
    bank_name: Optional[str] = None
    date_of_loan: Optional[datetime] = None
    amount: Optional[float] = None
    status: Optional[str] = None

class RepledgeReleaseRequest(BaseModel):
    release_date: Optional[datetime] = None
    final_interest_paid: Optional[float] = 0.0
    person_taking: Optional[str] = None
    remarks: Optional[str] = None




class RepledgeTransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    payment_date: Optional[datetime] = None
    remarks: Optional[str] = None

class RepledgeTransactionRead(BaseModel):
    id: int
    repledge_id: int
    amount: float
    payment_date: datetime
    remarks: Optional[str] = None
    model_config = {"from_attributes": True}

class GirviSummary(BaseModel):
    id: int
    pledge_no: str
    customer_name: str
    loan_amount: Optional[float] = None
    present_value: Optional[float] = None
    model_config = {"from_attributes": True}

class RepledgeSummary(BaseModel):
    id: int
    loan_number: str
    bank_name: str
    repledger_name: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = "Active"
    model_config = {"from_attributes": True}

class RepledgeRead(RepledgeCreate):
    id: int
    created_at: datetime
    girvis: List[GirviSummary] = []
    transactions: List[RepledgeTransactionRead] = []
    model_config = {"from_attributes": True}

# ─── Girvi Entry ───────────────────────────────────────────────────────────────

class GirviCreate(BaseModel):
    pledge_no: str
    pledge_date: datetime
    due_date: datetime
    customer_name: str
    relation_type: Optional[str] = None  # w/o, s/o, d/o
    relation_name: Optional[str] = None
    address: Optional[str] = None
    mobile_number: Optional[str] = Field(None, pattern=r"^\+?\d{10,15}$")
    photo_path: Optional[str] = None
    present_value: Optional[float] = None
    loan_amount: Optional[float] = None
    loan_amount_words: Optional[str] = None
    monthly_income: Optional[float] = None
    status: Optional[str] = "Active"
    articles: List[ArticleCreate]
    repledge_ids: Optional[List[int]] = []
    new_repledges: Optional[List[RepledgeCreate]] = []

class GirviRead(BaseModel):
    id: int
    pledge_no: str
    pledge_date: datetime
    due_date: datetime
    customer_name: str
    relation_type: Optional[str] = None
    relation_name: Optional[str] = None
    address: Optional[str] = None
    mobile_number: Optional[str] = None
    photo_path: Optional[str] = None
    present_value: Optional[float] = None
    loan_amount: Optional[float] = None
    loan_amount_words: Optional[str] = None
    monthly_income: Optional[float] = None
    status: Optional[str] = "Active"
    release_date: Optional[datetime] = None
    articles: List[ArticleRead] = []
    repledges: List[RepledgeSummary] = []

    model_config = {"from_attributes": True}

class PartPaymentRequest(BaseModel):
    amount: float = Field(..., gt=0)

class ReleaseGirviRequest(BaseModel):
    interest_amount: Optional[float] = 0.0
    rate: Optional[float] = None
    months: Optional[int] = None
    total_amount: Optional[float] = None
    release_date: Optional[datetime] = None
    remarks: Optional[str] = None
