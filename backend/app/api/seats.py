
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Show, Seat


router = APIRouter(prefix="/api/shows", tags=["Seats"])


# --------------------------------------------------
# GET SEATS AND THEIR CURRENT AVAILABILITY
# --------------------------------------------------
@router.get("/{show_id}/seats")
def get_seats(
    show_id: int,
    db: Session = Depends(get_db),
):
    # Check whether the show exists
    show = db.query(Show).filter(Show.id == show_id).first()

    if not show:
        raise HTTPException(
            status_code=404,
            detail="Show not found",
        )

    # Get all seats for this show
    seats = (
        db.query(Seat)
        .filter(Seat.show_id == show_id)
        .order_by(Seat.seat_number)
        .all()
    )

    now = datetime.now(timezone.utc)
    result = []

    for seat in seats:
        # Booked seats cannot be selected
        if seat.is_booked:
            seat_status = "booked"

        # A seat is held only when its hold has not expired
        elif (
            seat.held_by_user_id is not None
            and seat.hold_expires_at is not None
            and seat.hold_expires_at > now
        ):
            seat_status = "held"

        # Unbooked seats with no active hold are available
        else:
            seat_status = "available"

        result.append(
            {
                "id": seat.id,
                "show_id": seat.show_id,
                "seat_number": seat.seat_number,
                "seat_label": (
                    f"{seat.row_label}"
                    f"{((seat.seat_number - 1) % 10) + 1}"
                ),
                "is_booked": seat.is_booked,
                "status": seat_status,
            }
        )

    return result
