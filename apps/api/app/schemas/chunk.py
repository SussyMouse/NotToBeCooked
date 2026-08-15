from uuid import UUID

from pydantic import BaseModel


class ChunkCreate(BaseModel): #描述 AI-2 切出来的“一块内容”应该包含哪些资料。
    file_id:UUID
    chunk_index:int #它在文件中的顺序
    page_number:int |None=None
    page_end:int |None=None
    heading:str |None=None
    content:str
    token_count:int
    

