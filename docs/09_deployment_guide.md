# Deployment Guide — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Compiled environment parameters, PM2/systemd setups, Nginx configurations, and build tasks. | Lead Operations Engineer |

---

## Source Traceability

| Deployment Step | Primary Code Source | Verification Target |
|---|---|---|
| **Single-Node Bounds** | `Backened/server.py` | Local storage variables & rate limiters |
| **Env Injection** | `Backened/server.py` | Env variables mapping |
| **Frontend Build** | `Frontend/package.json` | CRACO build output |
| **Proxy Gateway** | Nginx Configuration | Header forwards & SSL handshakes |

---

## Table of Contents
1. [Overview & Single-Node Constraints](#1-overview--single-node-constraints)
2. [Production Environment Variables](#2-production-environment-variables)
3. [Backend Service Configuration](#3-backend-service-configuration)
4. [Frontend Production Build](#4-frontend-production-build)
5. [Nginx Reverse Proxy & SSL Setup](#5-nginx-reverse-proxy--ssl-setup)
6. [Database Setup & Security](#6-database-setup--security)

---

## 1. Overview & Single-Node Constraints

Attendify V1 is designed and verified as a **single-node deployment**. Scaling out horizontally across multiple servers or container replicas is not supported in this release due to the following architectural limits:

### 1.1 Local Disk Storage
* **Problem**: Uploaded timetables and study resource files are stored on the local virtual machine's disk under `Backened/resource_storage/` and `Backened/timetable_storage/`.
* **Impact**: If deployed to multiple server nodes, an upload request routed to Node A will write to Node A's local disk. Subsequent download requests routed to Node B will result in `404 Not Found` errors.
* **Mitigation**: Future releases (V2) must replace local storage adapters with cloud storage adapters (e.g., AWS S3, Google Cloud Storage, or Azure Blob Storage).

### 1.2 In-Memory Rate Limiting
* **Problem**: The brute force and spam rate limiters (`_InMemoryRateLimiter`) store sliding-window counters in-process inside the backend instance's active RAM.
* **Impact**: In a multi-replica clustered environment, request traffic is load-balanced across multiple worker nodes, allowing bad actors to bypass rate limits.
* **Mitigation**: Future releases (V2) must replace in-process dicts with a shared Redis cache database.

---

## 2. Production Environment Variables

Ensure the following variables are injected dynamically by your hosting provider (e.g., Render, Vercel, AWS ECS, or PM2) or defined in your server's secure environment. Do not save production variables in `.env` files committed to version control.

| Variable Name | Description | Recommended Production Value |
|---|---|---|
| `MONGO_URL` | MongoDB Connection URI | `mongodb+srv://<user>:<password>@cluster.mongodb.net/<db>` |
| `DB_NAME` | Database identifier | `attendify` |
| `GOOGLE_CLIENT_ID` | Google OAuth credentials for Admin login | `your-id.apps.googleusercontent.com` |
| `COOKIE_SECURE` | Enforces HTTPS for transmitting auth cookies | `true` |
| `COOKIE_SAMESITE` | Cookie cross-origin controls | `none` (cross-domain) or `lax` (shared domain) |
| `OWNER_EMAIL` | Super Admin fallback email | `harishragavkumars@gmail.com` |
| `CORS_ORIGINS` | Permitted client origin domains | `https://attendify.yourdomain.com` |

---

## 3. Backend Service Configuration

To run the FastAPI backend reliably in production on a virtual machine (such as Ubuntu Server), run Uvicorn under a process manager like **PM2** or configure a **systemd** service.

### 3.1 PM2 Process Declaration
Install PM2 globally via npm, then create an `ecosystem.config.js` file:
```javascript
module.exports = {
  apps: [{
    name: 'attendify-backend',
    script: 'uvicorn',
    args: 'server:app --host 127.0.0.1 --port 8000 --workers 1',
    cwd: '/var/www/attendify/Backened',
    interpreter: 'python3',
    env: {
      MONGO_URL: 'mongodb://localhost:27017',
      DB_NAME: 'attendify',
      COOKIE_SECURE: 'true',
      COOKIE_SAMESITE: 'lax',
      OWNER_EMAIL: 'harishragavkumars@gmail.com'
    }
  }]
};
```
Launch the service:
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## 4. Frontend Production Build

The React application must be compiled to optimized static assets before deployment:

### 4.1 Build Commands
```bash
# Navigate to Frontend
cd Frontend

# Build the production bundle
npm run build
```
The compiled files are generated in the `Frontend/build/` directory. These static files can be served directly by a high-performance web server like Nginx or hosted on static storage services.

---

## 5. Nginx Reverse Proxy & SSL Setup

Nginx is the recommended web server to serve the frontend static bundle and reverse-proxy backend API requests securely.

### 5.1 Configuration Template
Place the following server block configuration in `/etc/nginx/sites-available/attendify`:

```nginx
server {
    listen 80;
    server_name attendify.yourdomain.com;
    return 301 https://$host$request_uri; # Force SSL redirection
}

server {
    listen 443 ssl http2;
    server_name attendify.yourdomain.com;

    # SSL Certificates (managed via Certbot Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/attendify.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/attendify.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Serve Frontend Static Assets
    location / {
        root /var/www/attendify/Frontend/build;
        index index.html;
        try_files $uri /index.html; # Support React Router routing
    }

    # Proxy Backend API Requests
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Forward actual user IP for rate limiters
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/attendify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Database Setup & Security

### 6.1 MongoDB Security Checks
If hosting your own MongoDB instance:
1. **Enable Authentication**: Bind MongoDB to `127.0.0.1` and enable authorization in `/etc/mongod.conf`:
   ```yaml
   security:
     authorization: enabled
   ```
2. **Access Control**: Provision a database user with restricted permissions:
   ```javascript
   db.createUser({
     user: "attendify_app",
     pwd: "secure_password",
     roles: [{ role: "readWrite", db: "attendify" }]
   });
   ```
