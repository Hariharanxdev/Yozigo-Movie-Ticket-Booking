from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.movies import router as movies_router
from app.api.shows import router as shows_router
from app.api.seats import router as seats_router
from app.api.auth import router as auth_router
from app.api.bookings import router as bookings_router
from fastapi.middleware.cors import CORSMiddleware
from app.api import payments


app = FastAPI(
    title="Yozigo Movie Ticket Booking API",
    description="Backend API for the Yozigo movie ticket booking application",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Movie poster upload directory
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Serve uploaded images
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
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