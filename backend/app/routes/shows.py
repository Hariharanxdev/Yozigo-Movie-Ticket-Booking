
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Movie, Show, Seat
from app.schemas import ShowCreate, ShowResponse

router = APIRouter(prefix="/api/shows", tags=["Shows"])


@router.post("/", response_model=ShowResponse, status_code=status.HTTP_201_CREATED)
def create_show(payload: ShowCreate, db: Session = Depends(get_db)):
    # Check that the movie exists
    movie = db.query(Movie).filter(Movie.id == payload.movie_id).first()

    if not movie:
        raise HTTPException(
            status_code=404,
            detail="Movie not found"
        )

    # Validate the show timing
    if payload.end_time <= payload.start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be later than start time"
        )

    # Prevent overlapping shows on the same screen
    overlapping_show = db.query(Show).filter(
        Show.screen_name == payload.screen_name,
        Show.start_time < payload.end_time,
        Show.end_time > payload.start_time
    ).first()

    if overlapping_show:
        raise HTTPException(
            status_code=409,
            detail="This screen already has a show during that time"
        )

    try:
        new_show = Show(
            movie_id=payload.movie_id,
            screen_name=payload.screen_name,
            start_time=payload.start_time,
            end_time=payload.end_time,
            ticket_price=payload.ticket_price
        )

        db.add(new_show)
        db.flush()

        # Create 80 seats: 8 rows with 10 seats each.
        # seat_number is stored as a unique number from 1 to 80.
        seats = [
            Seat(
                show_id=new_show.id,
                seat_number=number,
                row_label=chr(65 + (number - 1) // 10),
                is_booked=False
            )
            for number in range(1, 81)
        ]

        db.add_all(seats)
        db.commit()
        db.refresh(new_show)

        return new_show

    except Exception:
        db.rollback()
        raise


@router.get("/", response_model=list[ShowResponse])
def list_shows(db: Session = Depends(get_db)):
    return db.query(Show).order_by(Show.start_time).all()


@router.get("/{show_id}", response_model=ShowResponse)
def get_show(show_id: int, db: Session = Depends(get_db)):
    show = db.query(Show).filter(Show.id == show_id).first()

    if not show:
        raise HTTPException(
            status_code=404,
            detail="Show not found"
        )

    return show
