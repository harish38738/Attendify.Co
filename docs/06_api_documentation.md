# API Documentation — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Added comprehensive 76-endpoint API Coverage Matrix and verified route signatures. | Principal Software Architect |

---

## Source Traceability

| API Component | Primary Code Source | Verification Target |
|---|---|---|
| **Overview & Headers** | `Backened/server.py` | Cors & Security Middleware |
| **Authentication Router** | `Backened/server.py` | Auth routes & Cookie helpers |
| **Class Lifecycle API** | `Backened/server.py` | Classes endpoints & join toggles |
| **Attendance Sheet API** | `Backened/server.py` | Attendance database upserts |
| **Resources & Files API** | `Backened/server.py` | Streaming upload/download bounds |
| **Announcements API** | `Backened/server.py` | Broadcast notices & inbox records |
| **Health Endpoint** | `Backened/server.py` | `/api/health` MongoDB ping checks |

---

## Table of Contents
1. [Overview & Standards](#1-overview--standards)
2. [API Coverage Matrix](#2-api-coverage-matrix)
3. [Authentication API](#3-authentication-api)
4. [Class Management API](#4-class-management-api)
5. [Attendance API](#5-attendance-api)
6. [Resources & Timetable API](#6-resources--timetable-api)
7. [Announcements & Notifications API](#7-announcements--notifications-api)
8. [Health API](#8-health-api)

---

## 1. Overview & Standards

### 1.1 Base URL
All API endpoints are mounted under: `/api` (relative to backend host origin).

### 1.2 Global Response Codes
* `200 OK`: Request succeeded. Response body is JSON.
* `400 Bad Request`: Payload validation failed or requested action is illegal.
* `401 Unauthorized`: Active session token is missing, expired, or invalid.
* `403 Forbidden`: User has a valid session but lacks credentials to access resources.
* `404 Not Found`: Requested document or resource does not exist.
* `429 Too Many Requests`: Triggered by IP rate-limiting middleware.
* `500 Internal Server Error`: Unhandled backend code crash (returns sanitized JSON).

---

## 2. API Coverage Matrix

This matrix documents all **76 endpoints** implemented in the `server.py` codebase.

| Method | Route | Auth? | Allowed Roles | DB Collections | Doc Section |
|:---:|---|:---:|---|---|---|
| **GET** | `/api/academic-updates` | Yes | Admin | `academic_updates` | Section 7 |
| **POST** | `/api/academic-updates` | Yes | Admin | `academic_updates` | Section 7 |
| **PUT** | `/api/academic-updates/{update_id}` | Yes | Admin | `academic_updates` | Section 7 |
| **DELETE** | `/api/academic-updates/{update_id}` | Yes | Admin | `academic_updates` | Section 7 |
| **GET** | `/api/admin/dashboard` | Yes | Admin | `classes`, `students`, `attendance` | Section 4 |
| **GET** | `/api/admin/profile` *(Duplicate 1)* | Yes | Admin | `admins` | Section 3 |
| **GET** | `/api/admin/profile` *(Duplicate 2)* | Yes | Admin | `admins`, `classes` | Section 3 |
| **POST** | `/api/admin/students/{student_id}/reset-password` | Yes | Super Admin | `students` | Section 3 |
| **GET** | `/api/announcements` | Yes | Admin | `announcements`, `classes` | Section 7 |
| **POST** | `/api/announcements` | Yes | Admin | `announcements` | Section 7 |
| **PUT** | `/api/announcements/{announcement_id}` | Yes | Admin | `announcements` | Section 7 |
| **DELETE** | `/api/announcements/{announcement_id}` | Yes | Admin | `announcements` | Section 7 |
| **POST** | `/api/attendance` | Yes | Admin | `attendance` | Section 5 |
| **PUT** | `/api/attendance` | Yes | Admin | `attendance` | Section 5 |
| **GET** | `/api/attendance/check` | Yes | Admin | `attendance` | Section 5 |
| **GET** | `/api/attendance/class/{class_id}` | Yes | Admin | `attendance` | Section 5 |
| **GET** | `/api/attendance/export/{class_id}` | Yes | Admin | `attendance`, `students` | Section 5 |
| **GET** | `/api/attendance/report/{class_id}` | Yes | Admin | `attendance`, `students` | Section 5 |
| **GET** | `/api/auth/approved-admins` | Yes | Super Admin | `approved_admins` | Section 3 |
| **POST** | `/api/auth/approved-admins` | Yes | Super Admin | `approved_admins` | Section 3 |
| **DELETE** | `/api/auth/approved-admins/{email}` | Yes | Super Admin | `approved_admins` | Section 3 |
| **POST** | `/api/auth/google-admin` | No | All | `approved_admins`, `sessions` | Section 3 |
| **POST** | `/api/auth/logout` | Yes | All | `sessions` | Section 3 |
| **GET** | `/api/auth/me` | Yes | All | `sessions`, `admins`, `students` | Section 3 |
| **POST** | `/api/auth/student-change-password` | Yes | Student | `students` | Section 3 |
| **POST** | `/api/auth/student-login` | No | All | `students`, `sessions` | Section 3 |
| **POST** | `/api/classes` | Yes | Admin | `classes` | Section 4 |
| **GET** | `/api/classes` | Yes | Admin | `classes` | Section 4 |
| **POST** | `/api/classes/join` | No | All | `students`, `classes` | Section 4 |
| **GET** | `/api/classes/join-info/{join_code}` | No | All | `classes` | Section 4 |
| **GET** | `/api/classes/trash` | Yes | Admin | `classes` | Section 4 |
| **DELETE** | `/api/classes/{class_id}` | Yes | Admin | `classes` | Section 4 |
| **PUT** | `/api/classes/{class_id}` | Yes | Admin | `classes` | Section 4 |
| **PUT** | `/api/classes/{class_id}/join-link` | Yes | Admin | `classes` | Section 4 |
| **DELETE** | `/api/classes/{class_id}/permanent` | Yes | Admin | `classes`, `students`, `attendance` | Section 4 |
| **PUT** | `/api/classes/{class_id}/restore` | Yes | Admin | `classes` | Section 4 |
| **POST** | `/api/classes/{class_id}/students` | Yes | Admin | `students` | Section 4 |
| **GET** | `/api/classes/{class_id}/students` | Yes | Admin | `students` | Section 4 |
| **GET** | `/api/health` | No | All | None (MongoDB Ping only) | Section 8 |
| **POST** | `/api/reports` | Yes | All | `reports` | Section 7 |
| **GET** | `/api/reports` | Yes | Admin / Super | `reports` | Section 7 |
| **PUT** | `/api/reports/{report_id}/status` | Yes | Super Admin | `reports` | Section 7 |
| **GET** | `/api/resources` | Yes | Admin | `resources` | Section 6 |
| **GET** | `/api/resources/categories` | No | All | None | Section 6 |
| **POST** | `/api/resources/subjects` | Yes | Admin | `resource_subjects` | Section 6 |
| **GET** | `/api/resources/subjects` | Yes | Admin | `resource_subjects` | Section 6 |
| **DELETE** | `/api/resources/subjects/{subject_id}` | Yes | Admin | `resource_subjects`, `resources` | Section 6 |
| **PUT** | `/api/resources/subjects/{subject_id}/rename` | Yes | Admin | `resource_subjects` | Section 6 |
| **POST** | `/api/resources/subjects/{subject_id}/resources` | Yes | Admin | `resource_subjects`, `resources` | Section 6 |
| **GET** | `/api/resources/{resource_id}` | Yes | Admin | `resources` | Section 6 |
| **DELETE** | `/api/resources/{resource_id}` | Yes | Admin | `resources` | Section 6 |
| **GET** | `/api/resources/{resource_id}/download` | Yes | All | `resources` | Section 6 |
| **GET** | `/api/resources/{resource_id}/preview` | Yes | All | `resources` | Section 6 |
| **PUT** | `/api/resources/{resource_id}/rename` | Yes | Admin | `resources` | Section 6 |
| **PUT** | `/api/resources/{resource_id}/replace` | Yes | Admin | `resources` | Section 6 |
| **GET** | `/api/settings/day-order` | Yes | Admin | `settings` | Section 4 |
| **PUT** | `/api/settings/day-order` | Yes | Admin | `settings` | Section 4 |
| **GET** | `/api/settings/onboarding` | Yes | Admin | `settings` | Section 3 |
| **PUT** | `/api/settings/onboarding` | Yes | Admin | `settings` | Section 3 |
| **POST** | `/api/settings/onboarding/reset-students` | Yes | Admin | `students` | Section 3 |
| **GET** | `/api/student/academic-updates` | Yes | Student | `academic_updates` | Section 7 |
| **GET** | `/api/student/announcements` | Yes | Student | `announcements` | Section 7 |
| **GET** | `/api/student/dashboard` | Yes | Student | `students`, `classes`, `attendance` | Section 3 |
| **GET** | `/api/student/notifications` | Yes | Student | `notifications` | Section 7 |
| **PUT** | `/api/student/notifications/read-all` | Yes | Student | `notifications` | Section 7 |
| **PUT** | `/api/student/notifications/{notification_id}/read` | Yes | Student | `notifications` | Section 7 |
| **POST** | `/api/student/onboarding-complete` | Yes | Student | `students` | Section 3 |
| **GET** | `/api/student/profile` | Yes | Student | `students`, `classes` | Section 3 |
| **GET** | `/api/student/timetable` | Yes | Student | `timetables` | Section 6 |
| **DELETE** | `/api/students/{student_id}` | Yes | Admin | `students` | Section 4 |
| **PUT** | `/api/students/{student_id}` | Yes | Admin | `students` | Section 4 |
| **GET** | `/api/timetables` | Yes | Admin | `timetables` | Section 6 |
| **POST** | `/api/timetables/{class_id}` | Yes | Admin | `timetables`, `timetable_history` | Section 6 |
| **DELETE** | `/api/timetables/{class_id}` | Yes | Admin | `timetables`, `timetable_history` | Section 6 |
| **GET** | `/api/timetables/{class_id}/history` | Yes | Admin | `timetable_history` | Section 6 |
| **GET** | `/api/timetables/{class_id}/image` | Yes | All | `timetables` | Section 6 |

*Note on Duplicate Route:* `GET /api/admin/profile` is defined at line 1353 (`get_admin_profile`) and again at line 2953 (`admin_profile`). FastAPI matches the first registered route, so line 1353 handles the execution.

---

## 3. Authentication API

### 3.1 POST `/api/auth/google-admin`
Exchanges external Google OAuth session credentials for a local admin cookie session.
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "token": "google-oauth2-id-token-string"
  }
  ```
* **Response (200 OK)**: Sets HTTP-Only `auth_token` cookie.
  ```json
  {
    "id": "admin-unique-uuid",
    "name": "Admin Name",
    "role": "admin"
  }
  ```

### 3.2 POST `/api/auth/student-login`
Authenticates a student using class-specific roll number and password.
* **Request Body**:
  ```json
  {
    "roll_number": "1001",
    "class_id": "class-uuid-reference",
    "password": "student-hashed-password"
  }
  ```
* **Response (200 OK)**: Sets HTTP-Only `auth_token` cookie.
  ```json
  {
    "id": "student-unique-uuid",
    "name": "Student Name",
    "role": "student"
  }
  ```

### 3.3 POST `/api/auth/student-change-password`
Forces new password registration on first login (onboarding).
* **Request Body**:
  ```json
  {
    "new_password": "secure-new-password-string"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password updated successfully"
  }
  ```

### 3.4 GET `/api/auth/me`
Retrieves current session claims from cookie token.
* **Response (200 OK)**:
  ```json
  {
    "id": "user-uuid",
    "name": "User Name",
    "role": "admin"
  }
  ```

### 3.5 POST `/api/auth/logout`
Destroys active session token in database and deletes client cookie headers.
* **Response (200 OK)**: Clears `auth_token` cookie.
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

## 4. Class Management API

### 4.1 POST `/api/classes`
Creates a new course cohort (Admin only).
* **Request Body**:
  ```json
  {
    "name": "Computer Networks Lab",
    "code": "CS-302",
    "max_students": 60,
    "periods_per_day": 7
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "class_id": "new-class-uuid"
  }
  ```

### 4.2 PUT `/api/classes/{class_id}/join-link`
Toggles registration visibility or regenerates access codes.
* **Request Body**:
  ```json
  {
    "action": "enable"
  }
  ```
  *(Allowed actions: `enable`, `disable`, `regenerate`)*
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "join_code": "A9K3F"
  }
  ```

### 4.3 POST `/api/classes/join`
Enrolls a student using a shared join code.
* **Request Body**:
  ```json
  {
    "join_code": "A9K3F",
    "name": "Student Name",
    "roll_number": "1001"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "student_id": "new-student-uuid"
  }
  ```

---

## 5. Attendance API

### 5.1 POST `/api/attendance`
Records or updates attendance matrices for a period.
* **Request Body**:
  ```json
  {
    "class_id": "class-uuid",
    "date": "2026-07-12",
    "period_number": 3,
    "records": [
      { "student_id": "student-uuid-1", "status": "Present" },
      { "student_id": "student-uuid-2", "status": "Absent" }
    ]
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Attendance marked successfully"
  }
  ```

### 5.2 GET `/api/attendance/report/{class_id}`
Computes aggregate attendance eligibility summaries.
* **Response (200 OK)**:
  ```json
  {
    "students": [
      {
        "id": "student-uuid-1",
        "name": "Student Name",
        "roll_number": "1001",
        "present_count": 8,
        "absent_count": 2,
        "total_periods": 10,
        "attendance_percentage": 80.0,
        "eligible": true
      }
    ]
  }
  ```

### 5.3 GET `/api/attendance/export/{class_id}`
Streams a formatted CSV export file containing student attendance matrix logs.
* **Response**: Binary data block containing Content-Type headers (`text/csv`).

---

## 6. Resources & Timetable API

### 6.1 POST `/api/resources/subjects/{subject_id}/resources`
Streams file upload contents to disk. Enforces 50 MB file boundary constraints.
* **Content-Type**: `multipart/form-data`
* **Form Parameters**:
  * `category` (String): E.g., "Notes".
  * `displayName` (String, Optional): Alternative file name.
  * `file` (Binary File): PDF, Image, or TXT file.
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Resource uploaded",
    "data": {
      "resource": {
        "id": "resource-uuid",
        "displayName": "Lecture Notes",
        "fileSize": 142051
      }
    }
  }
  ```

### 6.2 DELETE `/api/resources/{resource_id}`
Deletes resources from the local directory and removes their database records.
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Resource deleted"
  }
  ```

---

## 7. Announcements & Notifications API

### 6.1 POST `/api/announcements`
Publishes an announcement and pushes notification alerts to enrolled student inboxes.
* **Request Body**:
  ```json
  {
    "class_id": "class-uuid",
    "title": "Exam Schedule",
    "description": "Please check the updated schedule."
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "announcement_id": "announcement-uuid"
  }
  ```

### 6.2 GET `/api/notifications`
Pulls active notifications bell elements (Student only).
* **Response (200 OK)**:
  ```json
  [
    {
      "id": "notification-uuid",
      "title": "Resource uploaded",
      "message": "📚 OS Lecture Notes added.",
      "read": false,
      "created_at": "2026-07-12T10:00:00Z"
    }
  ]
  ```

---

## 8. Health API

### 8.1 GET `/api/health`
Checks backend routing status and MongoDB driver connectivity.
* **Response (200 OK)**:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-07-12T10:00:00Z"
  }
  ```
* **Response (503 Service Unavailable)**: Returned if the database connection ping fails.
  ```json
  {
    "status": "unhealthy",
    "database": "disconnected",
    "timestamp": "2026-07-12T10:00:00Z"
  }
  ```
