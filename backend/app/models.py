from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from .config import Base, engine


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    pin_hash = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    current_session_id = Column(String, nullable=True)
    last_active_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    company = relationship("Company", back_populates="admin_user", uselist=False)
    otps = relationship("OTP", back_populates="user", cascade="all, delete-orphan")


class OTP(Base):
    __tablename__ = "otps"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    user = relationship("User", back_populates="otps")


class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    pin_code = Column(String, nullable=False)
    mobile = Column(String, nullable=False)
    admin_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    admin_user = relationship("User", back_populates="company")


class Girvi(Base):
    __tablename__ = "girvis"
    id = Column(Integer, primary_key=True, index=True)
    pledge_no = Column(String, unique=True, nullable=False, index=True)
    pledge_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=False)
    customer_name = Column(String, nullable=False)
    relation_type = Column(String, nullable=True)  # w/o, s/o, d/o
    relation_name = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    mobile_number = Column(String, nullable=True)
    photo_path = Column(String, nullable=True)
    present_value = Column(Float, nullable=True)
    loan_amount = Column(Float, nullable=True)
    loan_amount_words = Column(String, nullable=True)
    articles = relationship("Article", back_populates="girvi", cascade="all, delete-orphan")


class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    girvi_id = Column(Integer, ForeignKey("girvis.id"), nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    gross_wt = Column(Float, nullable=False)
    less_wt = Column(Float, nullable=False)
    net_wt = Column(Float, nullable=False)
    present_value = Column(Float, nullable=False)
    loan_amount = Column(Float, nullable=False)
    loan_amount_words = Column(String, nullable=False)
    girvi = relationship("Girvi", back_populates="articles")


class SystemLog(Base):
    __tablename__ = "system_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    module = Column(String, default="GENERAL")
    user_name = Column(String, default="system")
