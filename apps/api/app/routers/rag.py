from fastapi import APIRouter
from app.services.embeddings import embed_query

rag_router = APIRouter()

rag_router.post("/query")
def get_query(prompt: str):
    return embed_query(prompt)
