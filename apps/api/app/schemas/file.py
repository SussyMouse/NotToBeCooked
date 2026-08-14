from enum import Enum
from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from typing import Literal, Optional
from datetime import datetime


class FileStatus(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"

class File(SQLModel, table=True):
    id: Optional[UUID] = Field(primary_key=True, default_factory=uuid4)
    course_id: UUID = Field(default=None, foreign_key="course.id")
    filename: str
    category: Optional[str]
    storage_path: str
    mime_type: str
    size_bytes: int
    page_count: Optional[int]
    status: FileStatus = Field(default=FileStatus.PROCESSING)
    error_message: Optional[str]
    uploaded_at: datetime

class FileRead(SQLModel): #描述 backend 把一份文件资料“返回给其他模块或前端”时，数据长什么样。
    id:UUID
    course_id:UUID
    filename:str
    category:str | None=None
    storage_path:str
    mime_type:str
    size_bytes:int
    page_count:int | None=None
    status:Literal["processing","ready","failed"]
    error_message:str |None=None
    uploaded_at:datetime

class IngestionRequest(SQLModel): #要求 AI-2 开始处理某个文件。
    file_id:UUID

class IngestionResponse(SQLModel):
    file_id:UUID
    status:Literal["processing","ready","failed"]
    chunk_count:int |None=None
    error:str |None=None