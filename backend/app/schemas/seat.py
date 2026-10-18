
from pydantic import BaseModel, Field


class SeatHoldRequest(BaseModel):
    seat_numbers: list[int] = Field(min_length=1, max_length=6)


class SeatHoldResponse(BaseModel):
    show_id: int
    seat_numbers: list[int]
    expires_at: str
    message: str
