from fastapi import status
import os
from fastapi import FastAPI
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.user import UserRead, UserCreate, FileRequest
from app.schemas.file import IngestionResponse

app = FastAPI(
    title="NotToBeCooked API",
    description="Python FastAPI backend for NotToBeCooked monorepo",
    version="0.0.1"
)

# CORS configuration for Web, Tauri (Desktop & Android), and Production
origins = [
    "http://localhost:5173",       # Vite Web dev server
    "http://localhost:1420",       # Tauri Vite dev server
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

@app.post("/users", response_model=UserRead)
def create_user(user: UserCreate):
    """Small demo route to create a user and return UserRead DTO."""
    import uuid
    from datetime import datetime
    return UserRead(
        id=uuid.uuid4(),
        email=user.email,
        created_at=datetime.utcnow()
    )

@app.post("/files", response_model=FileRequest)
def create_file(file: FileRequest):
    import uuid
    return FileRequest(
        id=uuid.uuid4()
    )

@app.post("/files/{file_id}/ingest",response_model=IngestionResponse)
def ingest_file(file_id:UUID):
    return IngestionResponse(
        file_id=file_id,
        status="processing",
        chunk_count=None,
        error=None,
    )
#ingest_file          = 工作人员
#IngestionResponse    = 工作人员必须填写的报告模板