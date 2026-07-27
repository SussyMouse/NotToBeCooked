from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime


class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
