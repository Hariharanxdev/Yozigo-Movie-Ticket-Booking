
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    status,
    UploadFile,
    File,
    HTTPException,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Movie
from app.schemas import MovieCreate, MovieResponse
from app.api.auth import get_admin_user

router = APIRouter(prefix="/api/movies", tags=["Movies"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.get("/", response_model=list[MovieResponse])
def get_movies(db: Session = Depends(get_db)):
    return db.query(Movie).filter(Movie.is_active == True).all()


@router.post(
    "/",
    response_model=MovieResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_movie(
    movie_data: MovieCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    movie = Movie(**movie_data.model_dump())

    db.add(movie)
    db.commit()
    db.refresh(movie)

    return movie


@router.put("/{movie_id}", response_model=MovieResponse)
def update_movie(
    movie_id: int,
    movie_data: MovieCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()

    if not movie:
        raise HTTPException(
            status_code=404,
            detail="Movie not found",
        )

    for field, value in movie_data.model_dump().items():
        setattr(movie, field, value)

    db.commit()
    db.refresh(movie)

    return movie


@router.delete("/{movie_id}")
def delete_movie(
    movie_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()

    if not movie:
        raise HTTPException(
            status_code=404,
            detail="Movie not found",
        )

    # Soft delete: preserve movie data for booking history.
    movie.is_active = False

    db.commit()

    return {"message": "Movie removed successfully"}

@router.post("/upload-poster")
async def upload_movie_poster(
    file: UploadFile = File(...),
    admin=Depends(get_admin_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WEBP images are allowed.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The file is empty.",
        )

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Maximum file size is 5 MB.",
        )

    filename = f"{uuid4().hex}{ALLOWED_TYPES[file.content_type]}"
    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(content)

    return {
        "message": "Poster uploaded successfully",
        "filename": filename,
        "poster_url": f"/uploads/{filename}",
    }




@router.delete("/{movie_id}")
def delete_movie(
    movie_id: int,
    db: Session = Depends(get_db),
):
    movie = db.query(Movie).filter(Movie.id == movie_id).first()

    if not movie or not movie.is_active:
        raise HTTPException(
            status_code=404,
            detail="Movie not found",
        )

    # Soft delete: preserve existing bookings and show history.
    movie.is_active = False

    db.commit()

    return {
        "message": "Movie deleted successfully",
        "movie_id": movie_id,
    }

