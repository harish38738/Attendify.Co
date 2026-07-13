# Attendify V1 — Production Deployment Guide

This guide describes how to configure and deploy the Attendify V1 application to a production environment safely and reliably.

---

## 1. Secrets Management (Do Not Commit `.env`)

> [!WARNING]
> Never commit `.env` files containing actual passwords, API keys, or connection strings to public or private source code repositories.

* In the local repository, `.gitignore` is pre-configured to ignore `.env` files.
* For production, environment variables must be injected dynamically via:
  * Container orchestration systems (e.g. AWS ECS Task Definitions, Kubernetes Secrets, Docker Compose secret files).
  * Cloud platform-native configuration settings (e.g. Render, Vercel, or Heroku Environment Variables).
  * CI/CD pipelines (e.g. GitHub Actions Secrets) only during the build/release phase.

---

## 2. Required Environment Variables

Ensure the following variables are defined in the production backend environment:

| Variable | Description | Recommended Production Value |
|---|---|---|
| `MONGO_URL` | MongoDB connection URI | `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>` |
| `DB_NAME` | Target database name | `attendify_production` |
| `CORS_ORIGINS` | Whitelist of frontend URLs allowed to access the API | `https://your-attendify-frontend-domain.com` (Separate multiples with commas) |
| `GOOGLE_CLIENT_ID` | Client ID from Google Cloud Console for Admin Auth | `328143785937-7hbrrvsr6971pac0cplntauji6dndr83.apps.googleusercontent.com` |
| `COOKIE_SECURE` | If `true`, requires HTTPS to transmit cookies | **`true`** |
| `COOKIE_SAMESITE` | SameSite cookie policy | **`none`** (or **`lax`** if frontend and backend share a parent domain) |
| `OWNER_EMAIL` | Administrator/owner email address | `harishragavkumars@gmail.com` |
| `SMTP_HOST` | Host address of SMTP server for emails | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | Port number of SMTP server | `465` (SSL) or `587` (TLS) |
| `SMTP_USER` | Email username for outgoing notifications | e.g. `notifications@your-domain.com` |
| `SMTP_PASSWORD` | App password/token for the SMTP email account | (Secure secret credential) |

---

## 3. Cookie Security (`COOKIE_SECURE=true`)

To ensure session tokens are not intercepted over clear-text HTTP:
1. Ensure the backend FastAPI server is deployed behind an SSL-terminating proxy (e.g., Nginx, Cloudflare, AWS ALB) or has SSL certificate configurations directly loaded.
2. In production env settings, verify that `COOKIE_SECURE` is explicitly set to `true`.
3. Set `COOKIE_SAMESITE` to `none` if the frontend and backend run on different domains, or `lax` if they share the same domain (e.g. `app.attendify.com` and `api.attendify.com`).

---

## 4. Single-Node Deployment Limitation

> [!IMPORTANT]
> Attendify V1 has architectural constraints that limit it to a **single-node deployment** (running on one virtual machine or single replica container instance).

### Why V1 requires a Single Node:
1. **Local File Storage**: Timetables and uploaded academic resources are stored directly on the backend's local filesystem (`Backened/resource_storage` and `Backened/timetable_storage`). Multiple nodes would have separate local folders, resulting in 404 errors when a user accesses a file uploaded to a different node.
2. **In-Memory Rate Limiter**: The sliding-window rate limiters are stored in-process inside the backend server RAM (`_InMemoryRateLimiter`). In a clustered multi-node environment, requests from the same client IP would hit different nodes, rendering the rate limiting ineffective.

### Production Scaling Mitigation (For Future Releases):
* To transition to horizontal scale-out (multi-node deployments), the application would require:
  * Migrating the storage adapter from local disk storage to a cloud object store (such as AWS S3 or Google Cloud Storage).
  * Replacing the in-memory `_InMemoryRateLimiter` dict with a shared cache instance like Redis.
