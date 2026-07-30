from pydantic import BaseModel,Field
from uuid import UUID
from typing import Any,Literal

class ChunkCreate(BaseModel): #描述 AI-2 切出来的“一块内容”应该包含哪些资料。
    file_id:UUID
    chunk_index:int #它在文件中的顺序
    content:str
    source_type:Literal["page(PDF)","slides(PPTX)","section(DOCX)"]
    source_number:int |None=None
    heading:str |None=None
    token_count:int
    metadata:dict[str,Any]=Field(default_factory=dict)


