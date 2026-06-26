# Attendify Project Architecture

## Overview

Attendify is an attendance management system with a FastAPI backend and a React frontend.

- Backend: Python FastAPI app in `Backened/server.py`
- Frontend: Create React App + CRACO in `Frontend/`
- Authentication: cookie-based sessions stored in MongoDB
- User roles: `admin` and `student`
- Admins manage classes, students, attendance, reports, and approved admin emails
- Students can login with roll number, view attendance dashboard, history, and classmates

## Workspace Layout

Root contains two main folders:

- `Backened/`
  - `server.py` — single entry-point backend service
  - `.env` — backend runtime configuration
  - `requirements.txt` — Python dependencies
  - `tests/` — backend tests

- `Frontend/`
  - `package.json` — frontend dependencies and scripts
  - `src/` — React application source code
  - `src/context/AuthContext.js` — authentication context/provider
  - `src/utils/api.js` — Axios API client with credentials handling
  - `src/utils/resourceHelpers.js` — shared download/preview helpers for resource files
  - `src/components/` — UI layout, route protection, reusable UI components
  - `src/pages/` — application pages and workflows
  - `public/` — static web assets

## Backend Architecture

### Core implementation

- `Backened/server.py` contains the entire API service.
- Uses FastAPI with an `APIRouter` under `/api`.
- Connects to MongoDB via `motor.asyncio.AsyncIOMotorClient`.
- Data models are validated with Pydantic.
- CORS is configured from environment variable `CORS_ORIGINS`.
- Cookie handling uses `SameSite=None` and a secure cookie decision helper.

### Environment configuration

Key `Backened/.env` values:

- `MONGO_URL` — MongoDB connection string
- `DB_NAME` — database name
- `CORS_ORIGINS` — allowed frontend origins
- `COOKIE_SAMESITE` — cookie SameSite setting (default `none`)
- `COOKIE_SECURE` — optional override for secure cookie behavior

Frontend local env:

- `Frontend/.env`
  - `REACT_APP_BACKEND_URL=http://127.0.0.1:8000`

### Database collections

- `sessions`
  - stores active session records with `session_id`, `role`, `user_id`, `created_at`, `expires_at`
  - TTL index on `expires_at`
- `admins`
  - stores admin user records
  - unique index on `email`
- `approved_admins`
  - stores allowed admin email list
  - seeded on startup with owner and default emails
- `classes`
  - stores class metadata, join codes, period counts, and the owning admin ID
- `students`
  - stores student records linked to a class
- `attendance`
  - stores attendance entries by `class_id`, `student_id`, `date`, `period_number`, `status`
- `resource_subjects`
  - stores resource subject metadata, with `id`, `name`, `created_at`, `updated_at`
- `resources`
  - stores resource file metadata, with `id`, `filename`, `displayName`, `subject_id`, `subject_name`, `category`, `fileType`, `mimeType`, `fileSize`, `uploadedBy`, `uploadedAt`, `lastUpdated`, `downloadCount`, `file_path`

### Session/cookie behavior

- Session cookies are set in responses from both admin and student login endpoints.
- Cookies are HTTP-only and use `SameSite=None`.
- A safe development fix is implemented in `Backened/server.py`:
  - `_cookie_secure_for_request(request)` returns `True` only if HTTPS is used or if `COOKIE_SECURE` env is explicitly `true`
  - This preserves production secure-cookie behavior while allowing local HTTP development
- Session validation reads `session_id` from request cookies and checks expiration.

### Auth flow

#### Admin auth

1. Frontend login page sends user to external Google auth provider at `https://auth.emergentagent.com/` with `redirect` set to `/auth/callback`.
2. External auth returns a browser hash containing `session_id`.
3. `Frontend/src/pages/AuthCallback.jsx` posts that `session_id` to backend `/api/auth/google-session`.
4. Backend verifies the external session via `httpx` against `EMERGENT_AUTH_URL`.
5. If approved, backend creates a local `sessions` record and sets a cookie.
6. Frontend then navigates to `/dashboard` or `/student/dashboard` depending on role.

#### Student auth

1. Student enters roll number on login page.
2. Frontend calls `/api/auth/student-login`.
3. Backend finds the student record and creates a student session.
4. A session cookie is returned and future `/api/auth/me` requests can authenticate the student.

#### Auth state initialization

- `AuthProvider` runs `checkAuth()` on mount.
- It skips `/auth/callback` hash-based redirects.
- It calls `/api/auth/me` to restore the current user from session cookie.
- If unauthorized, the user is redirected to `/login` by the Axios interceptor.

### Key backend routes

#### Auth routes

- `POST /api/auth/google-session` — exchange external Google session for local admin cookie session
- `POST /api/auth/student-login` — login a student by roll number and set a cookie session
- `GET /api/auth/me` — return current authenticated user data
- `POST /api/auth/logout` — delete session cookie and log out
- `GET /api/auth/approved-admins` — list allowed admin emails
- `POST /api/auth/approved-admins` — add an approved admin email
- `DELETE /api/auth/approved-admins/{email}` — remove an approved admin email

#### Class management

- `POST /api/classes` — create a class
- `GET /api/classes` — list classes for the current admin
- `DELETE /api/classes/{class_id}` — delete a class and related data
- `PUT /api/classes/{class_id}/rename` — rename a class
- `PUT /api/classes/{class_id}/join-link` — enable/disable/regenerate join link
- `POST /api/classes/{class_id}/students` — add a new student to a class
- `GET /api/classes/{class_id}/students` — list students in a class

#### Resource Management routes

- `POST /api/resources/subjects` — create a new resource subject (admin only)
- `GET /api/resources/subjects` — list all resource subjects (admin and student)
- `PUT /api/resources/subjects/{subject_id}/rename` — rename a resource subject (admin only)
- `DELETE /api/resources/subjects/{subject_id}` — delete a resource subject and all associated resources (admin only)
- `GET /api/resources/categories` — list all predefined resource categories
- `GET /api/resources` — list all resources, with optional `subject_id`, `category`, and `search` filters
- `GET /api/resources/{resource_id}` — get metadata for a specific resource
- `GET /api/resources/{resource_id}/download` — download a resource file, increments `downloadCount`
- `GET /api/resources/{resource_id}/preview` — preview a resource file (if supported mime type)
- `POST /api/resources/subjects/{subject_id}/resources` — upload a new resource to a subject/category (admin only)
- `PUT /api/resources/{resource_id}/replace` — replace an existing resource file (admin only)
- `PUT /api/resources/{resource_id}/rename` — rename a resource's display name (admin only)
- `DELETE /api/resources/{resource_id}` — delete a resource and its file (admin only)

#### Student join flow

- `GET /api/classes/join-info/{join_code}` — validate a class join code and return class details
- `POST /api/classes/join` — register a student using a join code, name, and roll number

#### Attendance routes

- `POST /api/attendance` — mark attendance for a class/date/period
- `PUT /api/attendance` — edit existing attendance records
- `GET /api/attendance/check` — check whether attendance already exists for a period
- `GET /api/attendance/class/{class_id}` — get all attendance records for a class
- `GET /api/attendance/report/{class_id}` — compute student attendance report and eligibility
- `GET /api/attendance/export/{class_id}` — export attendance report as CSV

#### Dashboard routes

- `GET /api/student/dashboard` — student-specific attendance dashboard data
- `GET /api/admin/dashboard` — admin dashboard stats summary

### Verification

- Backend import of `Backened/server.py` succeeds after authorization hardening.
- Frontend build artifacts are present in `Frontend/build` after running the React build.
- Admin-protected class, student, and attendance routes now enforce ownership checks, ensuring each admin only manages their own resources.
- Session-based auth and cookie persistence remain compatible with existing frontend API integration.

## Frontend Architecture

### App structure

- `src/App.js`
  - Defines routes with React Router v7.
  - Public routes:
    - `/login`
    - `/auth/callback`
    - `/join/:joinCode`
  - Admin routes under `/` guarded by `PrivateRoute` and rendered inside `Layout`.
    - Includes `/resources` for admin resource management.
  - Student routes under `/student` guarded by `PrivateRoute`.
    - Includes `/student/resources` for browsing and downloading study materials.
  - Fallback route redirects authenticated users to the appropriate dashboard.

- `src/context/AuthContext.js`
  - Provides `user`, `loading`, `studentLogin`, `logout`, and `checkAuth`.
  - Uses Axios instance `src/utils/api.js`.

- `src/utils/api.js`
  - Creates `axios` client with `baseURL` from `REACT_APP_BACKEND_URL` and `withCredentials: true`.
  - Intercepts 401 responses to redirect to `/login` when a protected route is accessed.

- `src/components/PrivateRoute.jsx`
  - Shows a loading indicator while auth state is loading.
  - Redirects unauthenticated or unauthorized users to `/login`.

### UI layout

- `src/components/Layout.jsx`
  - Desktop sidebar and mobile drawer navigation
  - Shows different navigation items for `admin` and `student`
  - Handles logout and rendering of the current route via `<Outlet />`

- `src/components/LoadingScreen.jsx`
  - Shown while auth state is being resolved.

### Main page flows

#### Admin pages

- `src/pages/Dashboard.jsx` — admin stats overview
- `src/pages/Classes.jsx` — create, delete, rename classes and manage join links
- `src/pages/Students.jsx` — list and manage students within selected classes
- `src/pages/AttendanceMarking.jsx` — mark or edit attendance per period
- `src/pages/AttendanceReport.jsx` — view and export attendance report
- `src/pages/AdminManagement.jsx` — manage approved admin email list
- `src/pages/Resources.jsx` — manage resource subjects, upload/replace/rename/delete files

#### Student pages

- `src/pages/StudentDashboard.jsx` — student attendance summary, eligibility, and today's attendance
- `src/pages/StudentHistory.jsx` — student attendance history
- `src/pages/StudentClassmates.jsx` — list classmates in the student’s class
- `src/pages/StudentResources.jsx` — browse subjects, filter/search resources, download and preview files

#### Login and join flows

- `src/pages/Login.jsx`
  - Admin login via external Google auth redirect
  - Student login via roll number form

- `src/pages/AuthCallback.jsx`
  - Handles external auth callback hash
  - Posts `session_id` to `/api/auth/google-session`
  - Uses a StrictMode-safe guard to avoid duplicate processing

- `src/pages/JoinClass.jsx`
  - Validates join codes
  - Creates student record via class join flow

## Data flow and role separation

- Admins and students both rely on the same session cookie mechanism.
- Admin actions require a valid admin session and authorization checks in backend helpers.
- Student endpoints and dashboard use student session validation.
- Class join and student login flow are separate from admin Google auth.

## Important implementation notes

- The backend uses single-file service architecture, so `Backened/server.py` is the main place to inspect behavior.
- `AuthProvider` in the frontend is the central place for restored login state.
- `api.js` enforces `withCredentials` for cookie-based auth. If cookies are not being stored, the effective root problem is likely backend cookie settings or frontend origin mismatch.
- `Login.jsx` contains a hardcoded external auth URL that must not be changed to keep the admin auth flow working.

## Local development and the safe dev cookie fix

- Local frontend runs at `http://127.0.0.1:3000`.
- Backend is expected to run at `http://127.0.0.1:8000`.
- The cookie fix in `Backened/server.py` keeps `secure=true` for HTTPS and disables it for HTTP when `COOKIE_SECURE` is not forced.
- This allows local dev sessions to persist while preserving production cookie security semantics.

## Recommended entry points for future work

- Backend auth and session logic: `Backened/server.py`, sections starting at `@api_router.post("/auth/google-session")`, `@api_router.post("/auth/student-login")`, and `_get_valid_session`.
- Frontend auth flow: `Frontend/src/context/AuthContext.js`, `Frontend/src/pages/Login.jsx`, `Frontend/src/pages/AuthCallback.jsx`.
- Class and attendance management: `Frontend/src/pages/Classes.jsx`, `Frontend/src/pages/Students.jsx`, `Frontend/src/pages/AttendanceMarking.jsx`, `Frontend/src/pages/AttendanceReport.jsx`.
- Student experience: `Frontend/src/pages/StudentDashboard.jsx`, `Frontend/src/pages/StudentHistory.jsx`, `Frontend/src/pages/StudentClassmates.jsx`, `Frontend/src/pages/StudentResources.jsx`.
- Resource management: `Frontend/src/pages/Resources.jsx` (admin), `Frontend/src/pages/StudentResources.jsx` (student), `Frontend/src/utils/resourceHelpers.js`.

## Key dependencies

### Backend
- `fastapi`
- `motor`
- `httpx`
- `python-dotenv`
- `pydantic`
- `uvicorn`

### Frontend
- `react` / `react-dom`
- `react-router-dom`
- `axios`
- `tailwindcss`
- `sonner`
- `lucide-react`
- `@radix-ui/react-*`
- `date-fns`

## Quick debugging map

- If auth fails on refresh: check `src/utils/api.js` and `src/context/AuthContext.js` for `withCredentials` and `/api/auth/me`.
- If student data is missing: inspect `student_dashboard` backend route and `StudentDashboard.jsx` frontend state mapping.
- If join codes fail: inspect `GET /api/classes/join-info/{join_code}` and `POST /api/classes/join`.
- If attendance export fails: inspect `/api/attendance/export/{class_id}` and frontend `AttendanceReport.jsx` browser download logic.

---

This document is intended as a reference map for the current Attendify codebase and should be updated when new pages, routes, or auth flows are added.