from sqlmodel import SQLModel


class ApiError(SQLModel):
    code: str
    message: str
