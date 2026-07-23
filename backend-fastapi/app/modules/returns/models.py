from datetime import datetime, timezone
from typing import Optional
from decimal import Decimal
from sqlalchemy import BigInteger, String, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Return(Base):
    __tablename__ = "returns"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_item_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)

    zalopay_m_refund_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    zalopay_refund_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    zalopay_refund_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
