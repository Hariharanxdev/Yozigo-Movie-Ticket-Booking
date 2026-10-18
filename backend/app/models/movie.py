
from sqlalchemy import Boolean, CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Movie(Base):
    __tablename__ = "movies"

    __table_args__ = (
        CheckConstraint(
            "certificate IN ('U', 'UA', 'A')",
            name="ck_movies_certificate",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    title: Mapped[str] = mapped_column(
        String(200), nullable=False
    )

    description: Mapped[str] = mapped_column(
        String(2000), default="", nullable=False
    )

    duration_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    language: Mapped[str] = mapped_column(
        String(50), nullable=False
    )

    poster_url: Mapped[str] = mapped_column(
        String(500), default="", nullable=False
    )

    certificate: Mapped[str] = mapped_column(
        String(2), default="UA", nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
