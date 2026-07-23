from datetime import datetime, timezone
from typing import Optional
from decimal import Decimal
from sqlalchemy import BigInteger, String, Integer, Boolean, Numeric, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class ExpiryDiscountRule(Base):
    __tablename__ = "expiry_discount_rules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(20), default="expiry")  # 'expiry' | 'all_products'
    days_before_expiry: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
