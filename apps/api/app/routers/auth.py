import uuid
import jwt

from argon2 import PasswordHasher
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, status, Depends

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, col

from app.schemas.user import UserRead, UserCreate, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.errors import ApiError
from app.dependencies.auth import get_current_user
from app.db.database import get_session
from app.core.config import settings


ph = PasswordHasher()
auth_router = APIRouter()

posts = {"user@test.com": ["post1", "asdf posts"]}

@auth_router.post("/users", response_model=UserRead)
def create_user(user: UserCreate):
    """Small demo route to create a user and return UserRead DTO."""
    return UserRead(
        id=uuid.uuid4(),
        email=user.email,
        created_at=datetime.now(timezone.utc)
    )

@auth_router.get("/posts")
def get_posts(user: dict = Depends(get_current_user)):
    return posts[user["email"]]
    

@auth_router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        401: {"model": ApiError, "description": "Invalid email or password"}
    }
)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    """Authenticates a user and returns a JWT access token."""

    statement = select(User).where(col(User.email) == body.email)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Email or password incorrect"}
        )

    try:
        ph.verify(user.hashed_password, body.password.encode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Email or password incorrect"}
        )

    token = create_access_token(user, settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user)
    )

@auth_router.post(
    "/register",
    response_model=TokenResponse,
    responses={
        400: {"model": ApiError, "description": "Email already exists"}
    }
)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    """Registers a new user account."""

    statement = select(User).where(col(User.email) == body.email)
    result = await session.execute(statement)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMAIL_EXISTS", "message": "A user with this email already exists"}
        )

    # hash password and create user account
    bytes = body.password.encode('utf-8')
    hashed_password = ph.hash(bytes)

    user = User(
        hashed_password=hashed_password,
        email=body.email,
        display_name=body.display_name
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    # create token
    token = create_access_token(user, 1)
        
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead(
            id=uuid.uuid4(),
            email=body.email,
            created_at=datetime.now(timezone.utc)
        )
    )

def create_access_token(user: User, expires_in_minutes: int) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user.id),
        "name": user.display_name,
        "email": user.email,
        "iat": now,
        "exp": now + timedelta(minutes=expires_in_minutes)
    }

    token = jwt.encode(payload, settings.ACCESS_TOKEN_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token

def verify_token(token: str) -> dict:
    try:
        data = jwt.decode(token, settings.ACCESS_TOKEN_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return data
    except jwt.ExpiredSignatureError:
        raise Exception("Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise Exception("Invalid or tampered token.")