
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )

    show_id: Mapped[int] = mapped_column(
        ForeignKey("shows.id"), nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )

    stripe_session_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )

    stripe_payment_intent_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
