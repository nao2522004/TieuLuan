from datetime import datetime, timezone
from typing import Optional
from decimal import Decimal
from sqlalchemy import BigInteger, String, Integer, Numeric, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'IN' | 'OUT'
    source: Mapped[str] = mapped_column(String(20), default="ORDER")  # 'ORDER' | 'INBOUND' | 'ADJUSTMENT' | 'STOCKTAKE'
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    batch_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
