
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine

# Import all models so SQLAlchemy registers their tables.
from app.models.user import User
from app.models.movie import Movie
from app.models.show import Show
from app.models.seat import Seat
from app.models.booking import Booking

from app.api.movies import router as movies_router
from app.api.shows import router as shows_router
from app.api.seats import router as seats_router
from app.api.auth import router as auth_router
from app.api.bookings import router as bookings_router
from app.api import payments


app = FastAPI(
    title="Yozigo Movie Ticket Booking API",
    description="Backend API for the Yozigo movie ticket booking application",
    version="1.0.0",
)

# Create missing tables after registering the models.
Base.metadata.create_all(bind=engine)

# Configure frontend origins.
allowed_origins = [
    "https://patient-motivation-production-15ea.up.railway.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

extra_origins = os.getenv("FRONTEND_URL", "")
allowed_origins.extend(
    origin.strip().rstrip("/")
    for origin in extra_origins.split(",")
    if origin.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure uploaded movie posters.
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)


@app.get("/")
def root():
    return {"message": "Welcome to Yozigo Movie Ticket Booking API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


app.include_router(movies_router)
app.include_router(shows_router)
app.include_router(seats_router)
app.include_router(bookings_router)
app.include_router(auth_router)
app.include_router(payments.router)
