from decimal import Decimal

from pydantic import BaseModel


class BookingCreate(BaseModel):
    show_id: int
    seat_numbers: list[int]


class BookingResponse(BaseModel):
    id: int
    user_id: int
    show_id: int
    status: str
    total_amount: Decimal

    class Config:
        from_attributes = True


class PaymentRequest(BaseModel):
    payment_success: bool
