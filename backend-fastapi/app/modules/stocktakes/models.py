from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    String,
    Integer,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Stocktake(Base):
    __tablename__ = "stocktakes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open")  # 'open' | 'closed'
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    items: Mapped[List["StocktakeItem"]] = relationship(
        "StocktakeItem", back_populates="stocktake", cascade="all, delete-orphan"
    )


class StocktakeItem(Base):
    __tablename__ = "stocktake_items"
    __table_args__ = (
        UniqueConstraint(
            "stocktake_id", "product_id", name="uq_stocktake_items_stocktake_product"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    stocktake_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("stocktakes.id"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    system_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    counted_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    difference: Mapped[int] = mapped_column(Integer, nullable=False)

    stocktake: Mapped["Stocktake"] = relationship("Stocktake", back_populates="items")
    batch_details: Mapped[List["StocktakeItemBatch"]] = relationship(
        "StocktakeItemBatch",
        back_populates="stocktake_item",
        cascade="all, delete-orphan",
    )


class StocktakeItemBatch(Base):
    __tablename__ = "stocktake_item_batches"
    __table_args__ = (
        UniqueConstraint(
            "stocktake_item_id", "batch_id", name="uq_stocktake_item_batches"
        ),
        CheckConstraint(
            "system_quantity >= 0", name="chk_stocktake_item_batches_system_qty"
        ),
        CheckConstraint(
            "counted_quantity >= 0", name="chk_stocktake_item_batches_counted_qty"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    stocktake_item_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("stocktake_items.id", ondelete="CASCADE"), nullable=False
    )
    batch_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("product_batches.id"), nullable=False
    )

    system_quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    counted_quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    difference: Mapped[int] = mapped_column(Integer, nullable=False)

    stocktake_item: Mapped["StocktakeItem"] = relationship(
        "StocktakeItem", back_populates="batch_details"
    )
