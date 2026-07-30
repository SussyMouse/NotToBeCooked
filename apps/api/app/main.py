import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth_router


app = FastAPI(
    title="NotToBeCooked API",
    description="Python FastAPI backend for NotToBeCooked monorepo",
    version="0.0.1"
)
app.include_router(auth_router, prefix="/auth", tags=["Auth"])

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

