# Not To Be Cooked (NTCB)

A modern cross-platform application monorepo powered by **Turborepo**, **pnpm Workspaces**, **Vite**, **React 19**, **Tailwind CSS v4**, **Tauri v2**, and **Python FastAPI (with `uv`)**.

This repository is architected for **zero code duplication** across **Web**, **Desktop** (Linux, Windows, macOS), **Android Tablets**, and **Python API Backend**.

## 🏗️ Architecture Overview

```
                        ┌───────────────────────────────┐
                        │   packages/ui (@workspace/ui) │
                        │  Single Source of Truth (UI)  │
                        │  - shadcn/ui (Base UI / Vega) │
                        │  - Shared Views & Components  │
                        │  - Tailwind v4 (globals.css)  │
                        └──────────────┬────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
┌───────▼───────────────┐      ┌───────▼───────────────┐      ┌───────▼───────────────┐
│       apps/web        │      │     apps/desktop      │      │       apps/api        │
│   (Vite Web Client)   │      │  (Tauri v2 App Core)  │      │ (Python FastAPI + uv) │
└───────────────────────┘      └───────┬───────────────┘      └───────────────────────┘
                                       │
                     ┌─────────────────┴─────────────────┐
                     │                                   │
         ┌───────────▼───────────┐           ┌───────────▼───────────┐
         │     Desktop Target    │           │     Android Target    │
         │ (Linux/macOS/Windows) │           │   (Tablets & Mobile)  │
         └───────────────────────┘           └───────────────────────┘
```

* **`packages/ui` (`@workspace/ui`)**: Single source of truth for design system, shadcn components, Tailwind styles, and shared page views.
* **`apps/web`**: Web application client (Vite + React).
* **`apps/desktop`**: Tauri v2 application compiled into native Desktop executables or Android `.apk`/`.aab` tablet packages.
* **`apps/api`**: Python FastAPI backend managed with **`uv`**.

## 🚀 Quick Onboarding (New Team Members)

Follow these steps to get your full environment up and running in minutes:

### 1. Prerequisites

Ensure you have the following installed:
* [Node.js](https://nodejs.org/) (>= 20)
* [pnpm](https://pnpm.io/) (`pnpm@10.33+`)
* [Python](https://www.python.org/) (>= 3.11)
* [uv](https://docs.astral.sh/uv/) (Python package manager):
  ```bash
  pip install uv
  # OR: curl -sSf https://astral.sh/uv/install.sh | sh
  ```
* [Rust toolchain](https://www.rust-lang.org/tools/install) (for Tauri Desktop/Android builds)
* [Android Studio & SDK](https://developer.android.com/studio) (optional, for Android Tablet builds)

---

### 2. Initial Setup

1. **Install Frontend Monorepo Dependencies**:
   ```bash
   pnpm install
   ```

2. **Sync Python Virtual Environment**:
   ```bash
   cd apps/api
   uv sync
   cd ../..
   ```

3. **Configure Python IDE Interpreter (VS Code / Pyright)**:
   - Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Select **"Python: Select Interpreter"**.
   - Choose `./apps/api/.venv/bin/python`.
   - *(Note: `.vscode/settings.json` and `pyrightconfig.json` are already configured for you!)*

## 💻 Development Commands

From the monorepo root:

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Run all applications (Web, Desktop, Python API) concurrently |
| `pnpm dev:web` | Start Web application dev server (`localhost:5173`) |
| `pnpm dev:desktop` | Launch Tauri Desktop app (`localhost:1420`) |
| `pnpm dev:android` | Launch app on Android Tablet emulator or physical device |
| `pnpm dev:api` | Start Python FastAPI backend server (`localhost:8000`) |
| `pnpm typecheck` | Perform TypeScript typechecking across all workspace packages |
| `pnpm build` | Build production assets for all apps & packages |

## ⚠️ Common Gotchas & Mistakes to Avoid

### 1. `shadcn` Component Management

* ❌ **DO NOT capitalized component names** (e.g. `pnpm dlx shadcn add Card`). This causes a 404 error from the registry!
* ❌ **DO NOT run without target flag** from root.
* ✅ **ALWAYS use lowercase names & target `--cwd packages/ui`**:
  ```bash
  # Add card
  pnpm dlx shadcn@latest add card --cwd packages/ui

  # Add field / label
  pnpm dlx shadcn@latest add field --cwd packages/ui
  ```

### 2. Python Package Management with `uv`

* ❌ **DO NOT run `uv install`** (`uv install` is not a valid subcommand).
* ❌ **DO NOT use global `pip install`** inside `apps/api`.
* ✅ **Use `uv` commands**:
  - Install/sync dependencies: **`uv sync`**
  - Add new dependency: **`uv add <package_name>`** (e.g., `uv add httpx`)
  - Add dev dependency: **`uv add --dev <package_name>`** (e.g., `uv add --dev pytest`)
  - Run arbitrary script: **`uv run python <script.py>`**

### 3. Python IDE Import Warnings (`Cannot find module 'fastapi...'`)

If your IDE shows red squigglies under `from fastapi import FastAPI`:
* The Python code is 100% fine. The warning means your IDE is pointing to the global Python interpreter instead of `apps/api/.venv`.
* Select `./apps/api/.venv/bin/python` as your interpreter.

## 📱 Android Tablet Development

To run `apps/desktop` on an Android Tablet:

1. **Initialize Android target harness** (one-time setup):
   ```bash
   cd apps/desktop
   pnpm tauri android init
   ```
2. **Launch dev server on Tablet**:
   ```bash
   pnpm dev:android
   ```

## 🌊 DigitalOcean VPS Backend Deployment

The Python backend in `apps/api` is containerized for zero-downtime deployment:

```bash
# SSH into your DigitalOcean Droplet
cd NotToBeCooked/apps/api

# Build and start container in background
docker-compose up -d --build
```

Nginx configuration & Certbot SSL setup instructions are available in [`apps/api/README.md`] or `apps/api/Dockerfile`.