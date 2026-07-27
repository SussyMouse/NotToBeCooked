import uuid

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.schemas.user import UserRead, UserCreate
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.errors import ApiError


auth_router = APIRouter()

@auth_router.post("/users", response_model=UserRead)
def create_user(user: UserCreate):
    """Small demo route to create a user and return UserRead DTO."""
    return UserRead(
        id=uuid.uuid4(),
        email=user.email,
        created_at=datetime.now(timezone.utc)
    )

@auth_router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        401: {"model": ApiError, "description": "Invalid email or password"}
    }
)
def login(body: LoginRequest):
    """Authenticates a user and returns a JWT access token."""

    if body.email == "fail@test.com":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Email or password incorrect"}
        )
        
    return TokenResponse(
        access_token="mock_jwt_token_xyz123",
        token_type="bearer",
        user=UserRead(
            id=uuid.uuid4(),
            email=body.email,
            created_at=datetime.now(timezone.utc)
        )
    )

@auth_router.post(
    "/register",
    response_model=TokenResponse,
    responses={
        400: {"model": ApiError, "description": "Email already exists"}
    }
)
def register(body: RegisterRequest):
    """Registers a new user account."""
    
    if body.email == "existing@test.com":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMAIL_EXISTS", "message": "A user with this email already exists"}
        )
        
    return TokenResponse(
        access_token="mock_jwt_token_xyz123",
        token_type="bearer",
        user=UserRead(
            id=uuid.uuid4(),
            email=body.email,
            created_at=datetime.now(timezone.utc)
        )
    )