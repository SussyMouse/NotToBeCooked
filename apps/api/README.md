# NotToBeCooked - Python FastAPI Backend (`apps/api`)

Powered by **FastAPI**, **Uvicorn**, **SQLModel**, **asyncpg**, and **`uv`**.

> 📘 **New Developer Guide**: Read [DEVELOPMENT.md](DEVELOPMENT.md) for architectural guidelines, folder structure, API creation steps, auth protection, and error handling formats.

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
uv sync
```

### 2. Start PostgreSQL with `pgvector` (Docker / Podman)

Run a local PostgreSQL instance pre-packaged with vector search support (`pgvector`):

#### Using Podman:
```bash
podman run -d \
  --name not_to_be_cooked_db \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=not_to_be_cooked \
  docker.io/pgvector/pgvector:pg16
```

#### Using Docker Compose:
```bash
docker compose up -d db
```

#### Database Credentials:
- **Host**: `localhost` (port `5432`)
- **Database**: `not_to_be_cooked`
- **User / Password**: `postgres` / `password`
- **Connection URL (`DATABASE_URL`)**:  
  `postgresql+asyncpg://postgres:password@localhost:5432/not_to_be_cooked`

#### Podman / Docker Cheat Sheet:
- View status: `podman ps` (or `docker ps`)
- View DB logs: `podman logs not_to_be_cooked_db`
- Stop container: `podman stop not_to_be_cooked_db`
- Start container: `podman start not_to_be_cooked_db`

---

### 3. Run FastAPI Dev Server
```bash
uv run uvicorn app.main:app --reload --port 8000
```

---

## 🧪 Testing Auth & API Endpoints (No Postman Required)

1. **Interactive Swagger Docs (Zero Setup)**:
   - Navigate to `http://localhost:8000/docs` in your browser.
2. **The test suite**:
   ```bash
   pnpm --filter api test        # 87 tests, against a real PostgreSQL
   ```
   `tests/conftest.py` appends `_test` to the database in `DATABASE_URL` and refuses to run
   if the two ever resolve to the same place — these tests drop every table.
3. **Smoke check on a new machine**:
   ```bash
   uv run --no-sync python scripts/smoke.py
   ```
   Five checks that can only fail on real hardware, including parsing a real PDF through
   Docling. Run it after any `uv sync`.

---

## 🚢 Deployment

The backend runs on an **Oracle Cloud Always Free ARM instance** (Ampere A1, 2 OCPU /
12 GB) as a systemd **user** unit with `loginctl enable-linger`, alongside a rootless
podman container for PostgreSQL bound to `127.0.0.1`. Why a user unit rather than a system
unit, why linger is not optional, and the three places Docker and podman differ are all in
[DEVELOPMENT.md](DEVELOPMENT.md) section 9.

### Not done yet

**Public exposure, the firewall/security-list opening and TLS are not set up**, and no
domain is pointed at the box — the instance is reachable over SSH only. That work is
scheduled as Gantt rows r67 (staging hardening) and r69 (production).

When it is done it will be an nginx reverse proxy in front of `127.0.0.1:8000` plus a
Let's Encrypt certificate via certbot. Treat the recipe below as the plan, not as a
description of a running system:

```nginx
server {
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.example.com /etc/nginx/sites-enabled/
sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com
```
