from pydantic import BaseModel, EmailStr, Field
from app.schemas.user import UserRead

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
