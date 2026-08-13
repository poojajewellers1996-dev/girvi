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
    articles: List[ArticleRead] = []

    model_config = {"from_attributes": True}
