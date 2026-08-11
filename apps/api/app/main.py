from app.routers import rag_router
from fastapi import Depends
from app.dependencies.auth import get_current_user
import os
import httpx

from contextlib import asynccontextmanager


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.routers import auth_router, files_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    app.state.llm_client = httpx.AsyncClient(
        timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0)
    )
    yield
    await app.state.llm_client.aclose()

app = FastAPI(
    title="NotToBeCooked API",
    description="Python FastAPI backend for NotToBeCooked monorepo",
    version="0.0.1",
    lifespan=lifespan
)
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(files_router, prefix="/files", tags=["Files"], dependencies=[Depends(get_current_user)])
app.include_router(rag_router, prefix="/rag", tags=["RAG"], dependencies=[Depends(get_current_user)])

# CORS configuration for Web (any local port), Tauri (Desktop & Android), and Production
origins = [
    "tauri://localhost",           # Tauri v2 Desktop custom scheme
    "http://tauri.localhost",      # Tauri v2 Android/Windows custom scheme
    "https://tauri.localhost",
]

# Allow custom production domains via ENVIRONMENT variable
extra_origins = os.getenv("ALLOWED_ORIGINS")
if extra_origins:
    origins.extend([origin.strip() for origin in extra_origins.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "NotToBeCooked Python Backend",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

