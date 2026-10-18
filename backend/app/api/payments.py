
import os
import stripe
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Booking, BookingSeat, Seat
import logging
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/webhook")
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

    body = await request.body()
    signature = request.headers.get("stripe-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    try:
        event = stripe.Webhook.construct_event(
            body,
            signature,
            webhook_secret,
        )
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(
            status_code=400,
            detail="Invalid Stripe webhook signature",
        )

    # Convert Stripe event objects to ordinary dictionaries.
    event_data = event
    event_type = event_data["type"]
    session_data = event_data["data"]["object"].to_dict()
    session_id = session_data["id"]

    if event_type == "checkout.session.completed":
        if session_data.get("payment_status") != "paid":
            return {"received": True, "status": "payment_not_completed"}

        try:
            booking = (
                db.query(Booking)
                .filter(Booking.stripe_session_id == session_id)
                .with_for_update()
                .first()
            )

            if not booking:
                return {"received": True, "status": "booking_not_found"}

            if booking.status == "confirmed":
                return {"received": True, "status": "already_confirmed"}

            seats = (
                db.query(Seat)
                .join(BookingSeat, BookingSeat.seat_id == Seat.id)
                .filter(BookingSeat.booking_id == booking.id)
                .order_by(Seat.seat_number)
                .with_for_update()
                .all()
            )

            now = datetime.now(timezone.utc)

            valid = bool(seats) and all(
                not seat.is_booked
                and seat.held_by_user_id == booking.user_id
                and seat.hold_expires_at is not None
                and seat.hold_expires_at > now
                for seat in seats
            )

            if not valid:
                booking.status = "payment_review"
                db.commit()
                return {"received": True, "status": "payment_review"}

            for seat in seats:
                seat.is_booked = True
                seat.held_by_user_id = None
                seat.hold_expires_at = None

            booking.status = "confirmed"

            payment_intent = session_data.get("payment_intent")
            booking.stripe_payment_intent_id = (
                payment_intent if isinstance(payment_intent, str) else None
            )

            db.commit()
            return {"received": True, "status": "confirmed"}

        except Exception:
            db.rollback()
            logger.exception("Stripe webhook processing failed")
        raise

    elif event_type == "checkout.session.expired":
        try:
            booking = (
                db.query(Booking)
                .filter(Booking.stripe_session_id == session_id)
                .with_for_update()
                .first()
            )

            if booking and booking.status == "pending":
                seats = (
                    db.query(Seat)
                    .join(BookingSeat, BookingSeat.seat_id == Seat.id)
                    .filter(BookingSeat.booking_id == booking.id)
                    .with_for_update()
                    .all()
                )

                for seat in seats:
                    if (
                        not seat.is_booked
                        and seat.held_by_user_id == booking.user_id
                    ):
                        seat.held_by_user_id = None
                        seat.hold_expires_at = None

                booking.status = "expired"
                db.commit()

            return {"received": True, "status": "expired"}

        except Exception:
            db.rollback()
            raise

    return {"received": True}
