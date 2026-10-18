from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BookingSeat(Base):
    __tablename__ = "booking_seats"

    __table_args__ = (
        UniqueConstraint(
            "booking_id",
            "seat_id",
            name="uq_booking_seat",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
    )

    seat_id: Mapped[int] = mapped_column(
        ForeignKey("seats.id"),
        nullable=False,
    )
