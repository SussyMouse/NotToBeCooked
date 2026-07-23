import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
