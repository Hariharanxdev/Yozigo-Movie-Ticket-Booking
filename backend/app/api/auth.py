
from datetime import datetime, timedelta, timezone
import os

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.auth import UserRegister, UserLogin, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def get_secret_key():
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is missing from backend/.env")
    return secret


def authenticate_user(email: str, password: str, db: Session):
    email = email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not password_hash.verify(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def create_access_token(user: User):
    return jwt.encode(
        {
            "sub": str(user.id),
            "exp": datetime.now(timezone.utc) + timedelta(hours=2),
        },
        get_secret_key(),
        algorithm="HS256",
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    email = str(payload.email).strip().lower()

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        name=payload.name,
        email=email,
        hashed_password=password_hash.hash(payload.password),
        is_admin=False,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise


# JSON login: use this endpoint from your frontend.
@router.post("/login")
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(payload.email, payload.password, db)

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
    }


# Form login: Swagger's OAuth2 Authorize button uses this endpoint.
@router.post("/token")
def login_for_swagger(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(form_data.username, form_data.password, db)

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
    }


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            token,
            get_secret_key(),
            algorithms=["HS256"],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user
def get_admin_user(
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user