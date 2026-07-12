# Security Documentation — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Compiled all authentication schemas, rate-limiting guards, and data validation checks. | Principal Security Architect |

---

## Source Traceability

| Security Layer | Primary Code Source | Verification Target |
|---|---|---|
| **Session Integrity** | `Backened/server.py` | `_get_valid_session`, cookie settings |
| **Authentication Flow** | `Backened/server.py` | `google_admin_login`, `student_login`, `bcrypt` checks |
| **Access Authorization** | `Backened/server.py` | Whitelist verification & ownership checks |
| **Middlewares & Headers** | `Backened/server.py` | `_security_headers_middleware`, CORS setup |
| **Rate Limiting** | `Backened/server.py` | `_InMemoryRateLimiter` instances & IP checks |
| **Data Validation** | `Backened/server.py` | Pydantic Models & Field Validators |

---

## Table of Contents
1. [Overview & Security Architecture](#1-overview--security-architecture)
2. [Session Integrity & Cookie Management](#2-session-integrity--cookie-management)
3. [Authentication Verification Flows](#3-authentication-verification-flows)
4. [Access Authorization & Ownership Controls](#4-access-authorization--ownership-controls)
5. [Application Defensive Controls](#5-application-defensive-controls)
6. [Data Validation & Storage Protections](#6-data-validation--storage-protections)

---

## 1. Overview & Security Architecture

Attendify enforces a defense-in-depth security model to protect student and administrative assets. The architecture applies controls across the network layer (CORS/Headers), application layer (Session management, rate limiting, role-based authorization), and database layer (Index constraints, Pydantic validation).

---

## 2. Session Integrity & Cookie Management

The application utilizes cookie-based session tracking for authenticated users.

### 2.1 Cookie Security Attributes
When a session is established (via Google OAuth or Student password verification), the backend sets an `auth_token` cookie containing a unique 32-character hexadecimal token. The cookie is configured with:
* **HTTP-Only**: `True` (prevents client-side scripts from reading the token, mitigating Cross-Site Scripting (XSS) session theft).
* **SameSite**: Controlled via `COOKIE_SAMESITE` environment variable (defaults to `none` for cross-origin local operations, supports `lax` or `strict` in identical-domain production environments).
* **Secure**: Controlled via the `COOKIE_SECURE` environment variable. If unconfigured, the system automatically checks request schemes:
  ```python
  def _cookie_secure_for_request(request: Request) -> bool:
      if COOKIE_SECURE is not None:
          return COOKIE_SECURE
      return request.url.scheme == 'https'
  ```

### 2.2 Session TTL Enforcement
Active tokens are stored in the MongoDB `sessions` collection with an `expires_at` timestamp set to 7 days from generation. A MongoDB TTL index removes expired sessions automatically:
```python
await db.sessions.create_index("expires_at", expireAfterSeconds=0)
```
On every request, the token validity is verified against UTC times (`session["expires_at"] > datetime.utcnow()`).

---

## 3. Authentication Verification Flows

### 3.1 Administrative Access (Google OAuth 2.0)
* **Flow**: Admins log in using Google Sign-In. The client-side application sends the JWT ID token to `/api/auth/google-admin`.
* **Verification**: The backend makes a secure backend HTTP GET request to `https://oauth2.googleapis.com/tokeninfo?id_token={token}` to verify the token's signature, issuer (`accounts.google.com`), and expiration.
* **Email Whitelisting**: If the signature is valid, the parsed email address is checked against the whitelisted `approved_admins` collection. Access is denied if the email is not pre-approved.

### 3.2 Student Access (Password Hashing)
* **Hashing**: Student passwords are encrypted using `bcrypt` (salt rounds computed dynamically on generation). Password hashes are stored in the `students` collection.
* **First-Login Enforcement**: Joined student accounts are flagged with `must_change_password = True`. This forces the client to direct the student to a password reset onboarding prompt before they can access the dashboard.

---

## 4. Access Authorization & Ownership Controls

Attendify implements role-based access controls (RBAC) to isolate administrative tasks from student operations.

### 4.1 Admin vs. Student Separation
* **Admin Role**: Grants permissions to create classes, upload timetables, add resources, manage folder subjects, and mark daily attendance.
* **Super Admin Role**: Exclusive access to add/remove whitelisted admins, reset all student onboarding flags, and update issues tracker report statuses.
* **Student Role**: Restricted to self-viewing personal dashboards, downloading class resources, viewing announcements, and checking notifications.

### 4.2 Indirect Object Reference (IDOR) Ownership Checks
To prevent parameter tampering, the backend validates resource ownership:
* **Resource Ownership**: File rename/delete endpoints (`/api/resources/{resource_id}`) verify that the requesting admin owns the parent subject folder before proceeding.
* **Class Ownership**: Class management actions verify that the class's `admin_id` matches the active administrative session ID.

---

## 5. Application Defensive Controls

### 5.1 Security Headers Middleware
Defensive headers are attached to every outgoing HTTP response:
* `X-Frame-Options: DENY`: Prevents Clickjacking attacks.
* `X-Content-Type-Options: nosniff`: Enforces MIME-type matching.
* `X-XSS-Protection: 1; mode=block`: Mitigates Cross-Site Scripting.
* `Referrer-Policy: strict-origin-when-cross-origin`: Controls referrer data leaks.

### 5.2 Rate Limiting
To defend against automated scraping and brute-force login attempts, an in-memory, sliding-window rate-limiter prevents IP abuse:
* **Authentication Rate Limit**: Limits `/api/auth/google-admin` and `/api/auth/student-login` to **5 requests per minute per IP**.
* **Join Class Rate Limit**: Limits `/api/classes/join` to **10 requests per minute per IP**.
* **Issue Reports Rate Limit**: Limits `/api/reports` to **3 requests per minute per IP**.

---

## 6. Data Validation & Storage Protections

### 6.1 Pydantic Input Sanitation
All API requests are validated against strict Pydantic models. String fields (like roll numbers and join codes) are stripped, uppercase normalized, and validated for injection safety.

### 6.2 Disk Storage & File Size Restrictions
To prevent disk space exhaustion attacks, file sizes are restricted:
* **Timetable Uploads**: Size capped at **10 MB**; only `.jpg`, `.jpeg`, `.png`, and `.webp` extensions are allowed.
* **Resource Uploads**: Size capped at **50 MB**; only `.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`, and `.txt` extensions are allowed.
* **Streaming Validation**: Uploads are processed in 1 MB chunks. If the cumulative byte count exceeds the cap, the upload is aborted, and the temporary file is deleted.
