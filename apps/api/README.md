# NotToBeCooked - Python FastAPI Backend (`apps/api`)

Powered by **FastAPI**, **Uvicorn**, and **`uv`**.

---

## 🚀 Local Development

```bash
# Install / sync dependencies using uv
uv sync

# Run backend dev server (port 8000)
uv run uvicorn app.main:app --reload --port 8000
```

* Swagger API Docs: `http://localhost:8000/docs`
* ReDoc API Docs: `http://localhost:8000/redoc`

---

## 🌊 DigitalOcean VPS Deployment (Nginx & SSL Setup)

When deploying to your DigitalOcean Droplet (Linux VPS):

### 1. Build and Run Container
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
