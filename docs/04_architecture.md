# Architecture Document — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Initial compilation of architecture specs, detailing all active subsystems and data lifecycles. | Principal Software Architect |

---

## Table of Contents
1. [Architectural Overview](#1-architectural-overview)
2. [Data Tier & Schema Architecture](#2-data-tier--schema-architecture)
3. [Authentication & Authorization Subsystem](#3-authentication--authorization-subsystem)
4. [Routing & Middleware Pipelines](#4-routing--middleware-pipelines)
5. [Client-Side State & Navigation](#5-client-side-state--navigation)
6. [Architectural Constraints & Boundaries](#6-architectural-constraints--boundaries)

---

## 1. Architectural Overview

Attendify V1 is built on a decoupled, client-server web architecture. It utilizes a single-instance backend to process operations and serve data, while the React application runs client-side to manage views and interactions.

```
+-------------------------------------------------------------------------+
|                              Network Boundary                           |
+-------------------------------------------------------------------------+
|                                                                         |
|  [ Client Tier ]                                                        |
|   React SPA (Runs in Browser)                                           |
|        │                                                                |
|        │ HTTPS Requests (JSON Payload / Multipart Files)                |
|        ▼                                                                |
|  [ Web & Logic Tier ]                                                   |
|   FastAPI Monolithic App (Asynchronous Event Loop)                      |
|    ├── Security Header Middleware                                       |
|    ├── In-Memory Rate Limiting Router                                  |
|    └── Local Storage File IO Driver                                     |
|        │                                       │                        |
|        │ Async DB I/O (Motor client)           │ Local Read/Write       |
|        ▼                                       ▼                        |
|  [ Data Tier ]                          [ Asset Tier ]                  |
|   MongoDB Database                       Local Directories              |
|   (Transactional collections)            (timetable & resource files)   |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 2. Data Tier & Schema Architecture

All records are stored in MongoDB. The system interacts with the database asynchronously using the `motor` driver. The following collections comprise the data tier:

### 2.1 Core Collections
* **`admins`**: Stores credentials for authorized administrative staff.
  * *Index*: Unique index on `email`.
* **`approved_admins`**: Whitelist of admin emails allowed to register/login via Google OAuth. Seeded on system startup.
* **`classes`**: Metadata of academic courses managed by admins.
  * *Relationships*: Belongs to an admin via `admin_id`.
* **`students`**: Enrollment records.
  * *Index*: Unique compound index on `(class_id, roll_number)` allowing a roll number to be reused across different classes but unique within one class.

### 2.2 Functional Collections
* **`attendance`**: Daily log ledger records.
  * *Index*: Unique compound index on `(class_id, student_id, date, period_number)` to prevent double-marking.
* **`resource_subjects` & `resources`**: Academic files categorized by admin-defined subject names.
  * *Metadata*: File size, category, mime-type, and local path references.
* **`timetables` & `timetable_history`**: Active timetable images and uploader logs.
* **`announcements`**: Broadcast messages targeting specific classes.
* **`notifications`**: Persistent inbox messages read by student views.
  * *Index*: Custom index on `(student_id, created_at desc)` for fast dashboard loading.
* **`academic_updates`**: Homework, tests, and instructions logs organized by due date.

---

## 3. Authentication & Authorization Subsystem

Cookie-based session validation manages authentication across the portals:

```
[Google OAuth Portal]         [Roll Number Form]
          │                           │
          ▼ (Callback verification)   ▼ (Decrypt hash)
  POST /google-session        POST /student-login
          │                           │
          └─────────────┬─────────────┘
                        ▼
            Generate 32-Char Token
                        │
                        ▼
          Save Session in 'sessions' Collection
                        │
                        ▼
       Set Cookie: auth_token (HTTP-Only)
```

* **Token Validation**: The backend checks the incoming cookie against the `sessions` collection on every protected request.
* **Student Password Exemption**: A migration script handles assigning default passwords to legacy accounts. A custom middleware intercepts first-time logins, requiring a password update.

---

## 4. Routing & Middleware Pipelines

Requests pass through a structured FastAPI validation and preprocessing chain:

```
[Incoming HTTP Request]
          │
          ▼
1. [_InMemoryRateLimiter] ── (Exceeded?) ──► [HTTP 429 Too Many Requests]
          │ (Under Limit)
          ▼
2. [Pydantic Body Parsing] ── (Invalid?) ──► [HTTP 422 Unprocessable Entity]
          │ (Valid JSON)
          ▼
3. [_get_valid_session] ── (Expired/Missing?) ──► [HTTP 401 Unauthorized]
          │ (Authenticated)
          ▼
4. [Route Handler Execution] (Database reads/writes & file storage)
          │
          ▼
5. [_security_headers_middleware] (Inject Frame/XSS defense headers)
          │
          ▼
[Outgoing HTTP Response]
```

---

## 5. Client-Side State & Navigation

* **React Router v7 Pipeline**: Implements path routes. The `<PrivateRoute>` context checks for a valid session before rendering page contents.
* **Axios Interceptor**: Globally intercepts all responses. If the API returns `401 Unauthorized`, the client automatically clears user state and redirects to `/login`.
* **Crash Handling (ErrorBoundary)**: An `<ErrorBoundary>` wrapper surrounds the main route tree to catch rendering errors and display a fallback recovery screen.

---

## 6. Architectural Constraints & Boundaries

* **Single-Node Lifecycle**: Must run on a single machine or VM. Clustering is prevented because:
  * Uploaded files are written directly to local server storage directories.
  * Rate limiting checks occur in-memory within the server's RAM.
* **No Database Migrations Layer**: Database schemas are managed dynamically via runtime code. Index checks run automatically during server startup.
* **CORS Restrictions**: Requests must originate from domains specified in the `CORS_ORIGINS` environment whitelist.
