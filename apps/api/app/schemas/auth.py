from pydantic import EmailStr, field_validator
from app.schemas.user import UserRead
from sqlmodel import Field, SQLModel


class LoginRequest(SQLModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class RegisterRequest(SQLModel):
    display_name: str
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not any(char.isupper() for char in value):
            raise ValueError("Password must contain at least 1 uppercase letter")
        return value.strip()

class TokenResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
