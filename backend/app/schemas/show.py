from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class ShowCreate(BaseModel):
    movie_id: int
    screen_name: str = Field(min_length=1, max_length=100)
    start_time: datetime
    end_time: datetime
    ticket_price: float = Field(gt=0)


class ShowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movie_id: int
    screen_name: str
    start_time: datetime
    end_time: datetime
    ticket_price: float
class ShowPriceUpdate(BaseModel):
    ticket_price: Decimal = Field(
        gt=0,
        max_digits=10,
        decimal_places=2,
    )