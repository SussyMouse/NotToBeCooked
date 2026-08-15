from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class FileRead(BaseModel): #描述 backend 把一份文件资料“返回给其他模块或前端”时，数据长什么样。
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

class IngestionRequest(BaseModel): #要求 AI-2 开始处理某个文件。
    file_id:UUID

class IngestionResponse(BaseModel):
    file_id:UUID
    status:Literal["processing","ready","failed"]
    chunk_count:int |None=None
    error:str |None=None