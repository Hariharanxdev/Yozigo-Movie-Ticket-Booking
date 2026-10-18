import os
import stripe

from datetime import datetime, timezone, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Booking, BookingSeat, Seat, Show, Movie, User
from app.api.auth import get_current_user, get_admin_user
from app.api.auth import get_current_user


router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


# --------------------------------------------------
# REQUEST SCHEMA
# --------------------------------------------------
class CheckoutRequest(BaseModel):
    show_id: int
    seat_numbers: list[int] = Field(min_length=1, max_length=6)
    payment_success: bool

class StripeCheckoutRequest(BaseModel):
    show_id: int
    seat_numbers: list[int] = Field(min_length=1, max_length=6)
# --------------------------------------------------
# CHECKOUT AND SIMULATED PAYMENT
# --------------------------------------------------
@router.post("/checkout")
def checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if len(payload.seat_numbers) != len(set(payload.seat_numbers)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate seat numbers are not allowed",
        )

    if any(number < 1 or number > 80 for number in payload.seat_numbers):
        raise HTTPException(
            status_code=400,
            detail="Seat numbers must be between 1 and 80",
        )

    show = db.query(Show).filter(Show.id == payload.show_id).first()

    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    now = datetime.now(timezone.utc)

    try:
        seats = (
            db.query(Seat)
            .filter(
                Seat.show_id == payload.show_id,
                Seat.seat_number.in_(payload.seat_numbers),
            )
            .order_by(Seat.seat_number)
            .with_for_update()
            .all()
        )

        if len(seats) != len(payload.seat_numbers):
            raise HTTPException(
                status_code=404,
                detail="One or more seats were not found",
            )

        for seat in seats:
            if seat.is_booked:
                raise HTTPException(
                    status_code=409,
                    detail=f"Seat {seat.seat_number} is already booked",
                )

            if (
                seat.held_by_user_id != current_user.id
                or seat.hold_expires_at is None
                or seat.hold_expires_at <= now
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Seat {seat.seat_number} is not held by you "
                        "or its hold has expired"
                    ),
                )

        # Simulate payment failure.
        if not payload.payment_success:
            for seat in seats:
                seat.held_by_user_id = None
                seat.hold_expires_at = None

            db.commit()

            return {
                "status": "payment_failed",
                "message": "Payment failed. Your seat holds have been released.",
            }

        # Calculate the total from the show price.
        total_amount = Decimal(str(show.ticket_price)) * len(seats)

        booking = Booking(
            user_id=current_user.id,
            show_id=show.id,
            status="confirmed",
            total_amount=total_amount,
        )

        db.add(booking)
        db.flush()

        for seat in seats:
            db.add(
                BookingSeat(
                    booking_id=booking.id,
                    seat_id=seat.id,
                )
            )

            seat.is_booked = True
            seat.held_by_user_id = None
            seat.hold_expires_at = None

        db.commit()
        db.refresh(booking)

        return {
            "message": "Booking confirmed successfully",
            "booking_id": booking.id,
            "show_id": booking.show_id,
            "seat_numbers": sorted(payload.seat_numbers),
            "total_amount": float(booking.total_amount),
            "status": booking.status,
        }

    except Exception:
        db.rollback()
        raise


# --------------------------------------------------
# GET BOOKINGS FOR THE LOGGED-IN USER
# --------------------------------------------------
@router.post("/create-checkout-session")
def create_checkout_session(
    payload: StripeCheckoutRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    if not stripe.api_key:
        raise HTTPException(
            status_code=500,
            detail="Stripe secret key is not configured",
        )

    if len(payload.seat_numbers) != len(set(payload.seat_numbers)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate seat numbers are not allowed",
        )

    if any(n < 1 or n > 80 for n in payload.seat_numbers):
        raise HTTPException(
            status_code=400,
            detail="Seat numbers must be between 1 and 80",
        )

    try:
        now = datetime.now(timezone.utc)
        show = (
            db.query(Show)
            .filter(Show.id == payload.show_id)
            .first()
        )

        if not show:
            raise HTTPException(status_code=404, detail="Show not found")

        seats = (
            db.query(Seat)
            .filter(
                Seat.show_id == payload.show_id,
                Seat.seat_number.in_(payload.seat_numbers),
            )
            .order_by(Seat.seat_number)
            .with_for_update()
            .all()
        )

        if len(seats) != len(payload.seat_numbers):
            raise HTTPException(
                status_code=404,
                detail="One or more seats were not found",
            )

        for seat in seats:
            if seat.is_booked:
                raise HTTPException(
                    status_code=409,
                    detail=f"Seat {seat.seat_number} is already booked",
                )

            if (
                seat.held_by_user_id != current_user.id
                or seat.hold_expires_at is None
                or seat.hold_expires_at <= now
            ):
                raise HTTPException(
                    status_code=409,
                    detail=f"Seat {seat.seat_number} is not held by you or has expired",
                )

        total_amount = Decimal(str(show.ticket_price)) * len(seats)

        # Extend the seat hold while the customer completes checkout.
        for seat in seats:
            seat.hold_expires_at = now + timedelta(minutes=35)

        booking = Booking(
            user_id=current_user.id,
            show_id=show.id,
            status="pending",
            total_amount=total_amount,
        )
        db.add(booking)
        db.flush()

        for seat in seats:
            db.add(
                BookingSeat(
                    booking_id=booking.id,
                    seat_id=seat.id,
                )
            )

        db.flush()

        frontend_url = os.getenv(
    "FRONTEND_URL",
    "https://yozigo-movie-booking-15ea.up.railway.app",
).rstrip("/")
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": "inr",
                        "product_data": {
                            "name": f"Movie ticket - Show {show.id}",
                            "description": (
                                "Seat numbers: "
                                + ", ".join(map(str, sorted(payload.seat_numbers)))
                            ),
                        },
                        "unit_amount": int(total_amount * 100),
                    },
                    "quantity": 1,
                }
            ],
            metadata={
                "booking_id": str(booking.id),
                "user_id": str(current_user.id),
            },
            client_reference_id=str(booking.id),
            success_url=(
                f"{frontend_url}/payment-success"
                "?session_id={CHECKOUT_SESSION_ID}"
            ),
            cancel_url=f"{frontend_url}/payment-cancel",
            expires_at=int((now + timedelta(minutes=31)).timestamp()),
        )

        booking.stripe_session_id = session.id
        db.commit()

        return {
            "checkout_url": session.url,
            "session_id": session.id,
            "booking_id": booking.id,
            "total_amount": float(total_amount),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        if isinstance(exc, stripe.StripeError):
            print(
                f"Stripe checkout error: "
                f"{type(exc).__name__}: {exc}"
            )
            raise HTTPException(
                status_code=502,
                detail=(
                    "Unable to create Stripe checkout session. "
                    "Check backend terminal."
                ),
            ) from exc

        print(
            f"Checkout error: {type(exc).__name__}: {exc}"
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to create checkout session",
        ) from exc


    
@router.get("/my-bookings")
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )

    result = []

    for booking in bookings:
        show = (
            db.query(Show)
            .filter(Show.id == booking.show_id)
            .first()
        )

        movie = None
        if show:
            movie = (
                db.query(Movie)
                .filter(Movie.id == show.movie_id)
                .first()
            )

        booking_seats = (
            db.query(BookingSeat, Seat)
            .join(Seat, BookingSeat.seat_id == Seat.id)
            .filter(BookingSeat.booking_id == booking.id)
            .all()
        )

        seat_numbers = sorted(
            [seat.seat_number for booking_seat, seat in booking_seats]
        )

        result.append({
            "booking_id": booking.id,
            "show_id": booking.show_id,
            "movie_title": movie.title if movie else None,
            "screen_name": show.screen_name if show else None,
            "show_start_time": show.start_time if show else None,
            "show_end_time": show.end_time if show else None,
            "seat_numbers": seat_numbers,
            "total_amount": float(booking.total_amount),
            "status": booking.status,
            "created_at": booking.created_at,
        })

    return result



# --------------------------------------------------
# ADMIN: VIEW ALL CUSTOMER BOOKINGS
# --------------------------------------------------
@router.get("/admin/all-bookings")
def get_all_bookings(
    db: Session = Depends(get_db),
    admin_user=Depends(get_admin_user),
):
    bookings = (
        db.query(Booking, User, Show, Movie)
        .join(User, Booking.user_id == User.id)
        .join(Show, Booking.show_id == Show.id)
        .join(Movie, Show.movie_id == Movie.id)
        .order_by(Booking.created_at.desc())
        .all()
    )

    result = []

    for booking, user, show, movie in bookings:
        booking_seats = (
            db.query(BookingSeat, Seat)
            .join(Seat, BookingSeat.seat_id == Seat.id)
            .filter(BookingSeat.booking_id == booking.id)
            .all()
        )

        seat_numbers = sorted(
            [seat.seat_number for booking_seat, seat in booking_seats]
        )

        result.append({
            "booking_id": booking.id,
            "customer_name": user.name,
            "customer_email": user.email,
            "movie_title": movie.title,
            "show_id": show.id,
            "screen_name": show.screen_name,
            "show_start_time": show.start_time,
            "show_end_time": show.end_time,
            "seat_numbers": seat_numbers,
            "total_amount": float(booking.total_amount),
            "status": booking.status,
            "booked_at": booking.created_at,
        })

    return result


# --------------------------------------------------
# CUSTOMER: CANCEL A BOOKING
# --------------------------------------------------
@router.post("/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        # Lock the booking row to prevent concurrent cancellation.
        booking = (
            db.query(Booking)
            .filter(
                Booking.id == booking_id,
                Booking.user_id == current_user.id,
            )
            .with_for_update()
            .first()
        )

        if not booking:
            raise HTTPException(
                status_code=404,
                detail="Booking not found",
            )

        if booking.status.lower() != "confirmed":
            raise HTTPException(
                status_code=400,
                detail="Only confirmed bookings can be cancelled",
            )

        show = (
            db.query(Show)
            .filter(Show.id == booking.show_id)
            .first()
        )

        if not show:
            raise HTTPException(
                status_code=404,
                detail="Show not found",
            )

        # Show.start_time is a timezone-naive DateTime column.
        # Use the same naive format for comparison.
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        time_until_show = show.start_time - now

        if time_until_show <= timedelta(hours=2):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cancellation is allowed only more than "
                    "2 hours before the show"
                ),
            )

        booking_seats = (
            db.query(BookingSeat, Seat)
            .join(Seat, BookingSeat.seat_id == Seat.id)
            .filter(BookingSeat.booking_id == booking.id)
            .with_for_update()
            .all()
        )

        released_seats = []

        for booking_seat, seat in booking_seats:
            seat.is_booked = False
            seat.held_by_user_id = None
            seat.hold_expires_at = None
            released_seats.append(seat.seat_number)

        # Keep the booking and BookingSeat records as history.
        booking.status = "cancelled"

        db.commit()

        return {
            "message": "Booking cancelled successfully",
            "booking_id": booking.id,
            "status": booking.status,
            "released_seat_numbers": sorted(released_seats),
        }

    except Exception:
        db.rollback()
        raise
@router.post("/stripe-webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not webhook_secret:
        raise HTTPException(
            status_code=500,
            detail="Stripe webhook secret is not configured",
        )

    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            webhook_secret,
        )
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(
            status_code=400,
            detail="Invalid Stripe webhook",
        )

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # Only confirm a booking after Stripe reports payment success.
        if session.get("payment_status") != "paid":
            return {"received": True, "status": "payment_not_completed"}

        booking_id = session.get("metadata", {}).get("booking_id")

        if not booking_id:
            raise HTTPException(
                status_code=400,
                detail="Booking ID missing from Stripe session",
            )

        try:
            booking = (
                db.query(Booking)
                .filter(Booking.id == int(booking_id))
                .with_for_update()
                .first()
            )

            if not booking:
                raise HTTPException(
                    status_code=404,
                    detail="Booking not found",
                )

            # Make repeated webhook deliveries safe.
            if booking.status.lower() == "confirmed":
                return {"received": True, "status": "confirmed"}

            # Verify this is the checkout session for this booking.
            if booking.stripe_session_id != session.get("id"):
                raise HTTPException(
                    status_code=400,
                    detail="Stripe session does not match booking",
                )

            booking_seats = (
                db.query(BookingSeat, Seat)
                .join(Seat, BookingSeat.seat_id == Seat.id)
                .filter(BookingSeat.booking_id == booking.id)
                .with_for_update()
                .all()
            )

            for booking_seat, seat in booking_seats:
                # Do not overwrite a seat taken by another booking.
                if seat.is_booked:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Seat {seat.seat_number} is already booked",
                    )

                seat.is_booked = True
                seat.held_by_user_id = None
                seat.hold_expires_at = None

            booking.status = "confirmed"
            db.commit()

            return {"received": True, "status": "confirmed"}

        except Exception:
            db.rollback()
            raise

    return {"received": True}