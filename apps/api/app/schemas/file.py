from pydantic import BaseModel
from uuid import UUID
from typing import Literal

class FileRead(BaseModel): #描述 backend 把一份文件资料“返回给其他模块或前端”时，数据长什么样。
    id:UUID
    course_id:UUID
    filename:str
    storage_path:str
    mime_type:str
    category:str
    status:Literal["uploaded","processing","completed","failed"]

class IngestionRequest(BaseModel): #要求 AI-2 开始处理某个文件。
    file_id:UUID

class IngestionResponse(BaseModel):
    file_id:UUID
    status:Literal["processing","completed","failed"]
    chunk_count:int |None=None
    error:str |None=None