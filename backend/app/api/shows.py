from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Movie, Show, Seat, Booking, BookingSeat, User
from app.schemas import ShowCreate, ShowResponse
from app.schemas.seat import SeatHoldRequest, SeatHoldResponse
from app.api.auth import get_current_user, get_admin_user
from app.schemas.show import ShowPriceUpdate
from sqlalchemy import func


router = APIRouter(prefix="/api/shows", tags=["Shows"])


# --------------------------------------------------
# CREATE A SHOW AND GENERATE 80 SEATS
# --------------------------------------------------
@router.post("/", response_model=ShowResponse)
def create_show(
    show_data: ShowCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    movie = db.query(Movie).filter(Movie.id == show_data.movie_id).first()

    if not movie:
        raise HTTPException(
            status_code=404,
            detail="Movie not found",
        )

    if show_data.end_time <= show_data.start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time",
        )

    overlapping_show = (
        db.query(Show)
        .filter(
            Show.screen_name == show_data.screen_name,
            Show.start_time < show_data.end_time,
            Show.end_time > show_data.start_time,
        )
        .first()
    )

    if overlapping_show:
        raise HTTPException(
            status_code=409,
            detail="Another show is already scheduled on this screen during that time",
        )

    try:
        new_show = Show(**show_data.model_dump())

        db.add(new_show)
        db.flush()

        # Generate 80 seats: A1-A10, B1-B10, ... H1-H10
        seats = []

        for number in range(1, 81):
            row_label = chr(65 + (number - 1) // 10)

            seat = Seat(
                show_id=new_show.id,
                seat_number=number,
                row_label=row_label,
                is_booked=False,
            )

            seats.append(seat)

        db.add_all(seats)
        db.commit()
        db.refresh(new_show)

        return new_show

    except Exception:
        db.rollback()
        raise


# --------------------------------------------------
# GET ALL SHOWS
# --------------------------------------------------

@router.get("/", response_model=list[ShowResponse])
def get_shows(db: Session = Depends(get_db)):
    return (
        db.query(Show)
        .join(Movie, Show.movie_id == Movie.id)
        .filter(Movie.is_active.is_(True))
        .order_by(Show.start_time)
        .all()
    )



# --------------------------------------------------
# GET A SINGLE SHOW
# --------------------------------------------------
@router.get("/{show_id}", response_model=ShowResponse)
def get_show(
    show_id: int,
    db: Session = Depends(get_db),
):
    show = db.query(Show).filter(Show.id == show_id).first()

    if not show:
        raise HTTPException(
            status_code=404,
            detail="Show not found",
        )

    return show

@router.patch("/{show_id}/price", response_model=ShowResponse)
def update_show_price(
    show_id: int,
    payload: ShowPriceUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    show = db.query(Show).filter(Show.id == show_id).first()

    if not show:
        raise HTTPException(
            status_code=404,
            detail="Show not found",
        )

    show.ticket_price = float(payload.ticket_price)

    db.commit()
    db.refresh(show)

    return show

# --------------------------------------------------
# HOLD SEATS FOR 5 MINUTES
# Requires a logged-in user
# --------------------------------------------------
@router.post("/{show_id}/hold", response_model=SeatHoldResponse)
def hold_seats(
    show_id: int,
    payload: SeatHoldRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    seat_numbers = payload.seat_numbers

    # Allow bookings of 1 to 6 seats only
    if not 1 <= len(seat_numbers) <= 6:
        raise HTTPException(
        status_code=400,
        detail="You can hold a minimum of 1 and a maximum of 6 seats."
        )

    # Reject duplicate seat numbers
    if len(seat_numbers) != len(set(seat_numbers)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate seat numbers are not allowed",
        )

    # Validate seat numbers
    if any(number < 1 or number > 80 for number in seat_numbers):
        raise HTTPException(
            status_code=400,
            detail="Seat numbers must be between 1 and 80",
        )

    # Check that the show exists
    show = db.query(Show).filter(Show.id == show_id).first()

    if not show:
        raise HTTPException(
            status_code=404,
            detail="Show not found",
        )

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=5)

    try:
        # Lock selected seat rows to help prevent concurrent holds
        seats = (
            db.query(Seat)
            .filter(
                Seat.show_id == show_id,
                Seat.seat_number.in_(seat_numbers),
            )
            .order_by(Seat.seat_number)
            .with_for_update()
            .all()
        )

        if len(seats) != len(seat_numbers):
            raise HTTPException(
                status_code=404,
                detail="One or more seats were not found",
            )

        unavailable_seats = []

        for seat in seats:
            active_hold = (
                seat.held_by_user_id is not None
                and seat.hold_expires_at is not None
                and seat.hold_expires_at > now
            )

            # A booked seat is never available.
            # Another user's unexpired hold makes the seat unavailable.
            if seat.is_booked or (
                active_hold
                and seat.held_by_user_id != current_user.id
            ):
                unavailable_seats.append(seat.seat_number)

        if unavailable_seats:
            raise HTTPException(
                status_code=409,
                detail=f"These seats are unavailable: {unavailable_seats}",
            )

        # Hold the selected seats for the current user
        for seat in seats:
            seat.held_by_user_id = current_user.id
            seat.hold_expires_at = expires_at

        db.commit()

        return SeatHoldResponse(
            show_id=show_id,
            seat_numbers=sorted(seat_numbers),
            expires_at=expires_at.isoformat(),
            message="Seats held successfully for 5 minutes",
        )

    except Exception:
        db.rollback()
        raise


# --------------------------------------------------
# ADMIN: SHOW-WISE BOOKING METRICS
# --------------------------------------------------
@router.get("/admin/metrics")
def get_show_metrics(
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    shows = (
        db.query(Show, Movie)
        .join(Movie, Show.movie_id == Movie.id)
        .order_by(Show.start_time)
        .all()
    )

    results = []

    for show, movie in shows:
        # Count seats belonging to confirmed bookings only.
        booked_seats = (
            db.query(func.count(BookingSeat.id))
            .join(Booking, Booking.id == BookingSeat.booking_id)
            .filter(
                Booking.show_id == show.id,
                Booking.status == "confirmed",
            )
            .scalar()
            or 0
        )

        # Revenue from confirmed bookings only.
        revenue = (
            db.query(func.coalesce(func.sum(Booking.total_amount), 0))
            .filter(
                Booking.show_id == show.id,
                Booking.status == "confirmed",
            )
            .scalar()
            or 0
        )

        # Customer booking details for this show.
        bookings = (
            db.query(Booking, User)
            .join(User, Booking.user_id == User.id)
            .filter(
                Booking.show_id == show.id,
                Booking.status == "confirmed",
            )
            .order_by(Booking.created_at.desc())
            .all()
        )

        booking_details = []

        for booking, user in bookings:
            seat_numbers = (
                db.query(BookingSeat, Seat)
                .join(Seat, BookingSeat.seat_id == Seat.id)
                .filter(BookingSeat.booking_id == booking.id)
                .order_by(Seat.seat_number)
                .all()
            )

            booking_details.append({
                "booking_id": booking.id,
                "customer_name": user.name,
                "customer_email": user.email,
                "seat_numbers": [
                    seat.seat_number
                    for booking_seat, seat in seat_numbers
                ],
                "total_amount": float(booking.total_amount),
                "booked_at": booking.created_at,
                "status": booking.status,
            })

        total_seats = 80

        results.append({
            "show_id": show.id,
            "movie_title": movie.title,
            "screen_name": show.screen_name,
            "start_time": show.start_time,
            "end_time": show.end_time,
            "ticket_price": float(show.ticket_price),
            "total_seats": total_seats,
            "seats_booked": booked_seats,
            "seats_available": total_seats - booked_seats,
            "occupancy_percentage": round(
                (booked_seats / total_seats) * 100, 2
            ),
            "total_revenue": float(revenue),
            "bookings": booking_details,
        })

    return results
