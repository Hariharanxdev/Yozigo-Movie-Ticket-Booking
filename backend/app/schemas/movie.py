from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MovieCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    duration_minutes: int = Field(gt=0, le=500)
    language: str = Field(min_length=1, max_length=50)
    poster_url: str = Field(default="", max_length=500)


class MovieResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    duration_minutes: int
    language: str
    poster_url: str
    certificate: Literal["U", "UA", "A"]
    is_active: bool