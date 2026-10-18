
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Seat(Base):
    __tablename__ = "seats"

    __table_args__ = (
        UniqueConstraint("show_id", "seat_number", name="uq_show_seat"),
        CheckConstraint(
            "seat_number >= 1 AND seat_number <= 80",
            name="ck_seat_number_range",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    show_id: Mapped[int] = mapped_column(
        ForeignKey("shows.id", ondelete="CASCADE"),
        nullable=False,
    )
    seat_number: Mapped[int] = mapped_column(Integer, nullable=False)
    row_label: Mapped[str] = mapped_column(String(1), nullable=False)

    is_booked: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Temporary hold information
    held_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    hold_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
