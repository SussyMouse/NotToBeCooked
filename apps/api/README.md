# NotToBeCooked - Python FastAPI Backend (`apps/api`)

Powered by **FastAPI**, **Uvicorn**, **SQLModel**, **asyncpg**, and **`uv`**.

> 📘 **New Developer Guide**: Read [DEVELOPMENT.md](file:///home/calvinkhoo/Documents/GitHub/NotToBeCooked/apps/api/DEVELOPMENT.md) for architectural guidelines, folder structure, API creation steps, auth protection, and error handling formats.

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
2. **VS Code / IDE REST Client**:
   - Open `test_auth.http` in your editor and click **Send Request** above any endpoint.
3. **Automated CLI Test Script**:
   ```bash
   uv run python scripts/test_auth.py
   ```

---

## 🌊 DigitalOcean VPS Deployment (Nginx & SSL Setup)

When deploying to your DigitalOcean Droplet (Linux VPS):

### 1. Build and Run Containers
```bash
docker-compose up -d --build
```

### 2. Nginx Reverse Proxy Setup
Create `/etc/nginx/sites-available/api.yourdomain.com`:

```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site link:
```bash
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### 3. Certbot Free SSL Certificate
Obtain automatic HTTPS certificate for your domain:
```bash
sudo certbot --nginx -d api.yourdomain.com
```
