# Software Requirements Specification (SRS) — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Initial compilation of software requirements based on verified V1 codebase execution. | Principal Software Architect |

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements (System Features)](#3-functional-requirements-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for Version 1.0.0 of the Attendify Attendance and Resource Management System. It defines the functional scopes, user interfaces, system behaviors, and operational constraints for developers, operators, and testers.

### 1.2 System Overview
Attendify is structured as a client-server web application. The frontend is a React Single Page Application (SPA), while the backend is an asynchronous Python FastAPI service communicating with a MongoDB database.

---

## 2. Overall Description

### 2.1 Product Perspective
Attendify operates as a self-contained application, relying on:
* **Google OAuth 2.0**: For verifying credentials of administrative staff.
* **Local Filesystem**: To store physical assets (academic PDF/doc files and timetable images).
* **MongoDB**: As the primary transactional data store.

### 2.2 Product Functions
The high-level functions of the system are divided by target audience:

```
                            ┌─────────────────┐
                            │   Attendify V1  │
                            └────────┬────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                     ▼
        ┌──────────────────┐                  ┌──────────────────┐
        │  Admin Portals   │                  │  Student Portal  │
        └────────┬─────────┘                  └────────┬─────────┘
                 │                                     │
  • Class Management (Join Links)       • Dashboard (Attendance stats)
  • Period Attendance Recording         • Today's Records & History
  • Timetables & Resources Uploads      • Lecture Resources Download
  • Announcements & Academic Updates    • Notifications bell alerts
```

### 2.3 User Classes and Characteristics
* **Super Admin**: Technical manager who configures approved admin registers. Requires basic database access knowledge.
* **Class Admin (Faculty)**: Administrative users who manage student records. Requires web-browser proficiency.
* **Student**: Standard users who consume resources and track logs. Requires mobile/desktop web browser access.

### 2.4 Operating Environment
* **Server Environment**: Python 3.12+, MongoDB 6.0+, Windows or Linux Server OS.
* **Client Environment**: Modern web browsers (Chrome 100+, Safari 15+, Firefox 98+, Edge 100+). Fully responsive down to 320px viewport widths.

### 2.5 Design and Implementation Constraints
* **Single-Node Execution**: In-memory rate limiting and local directory storage prevent clustering or load-balanced multi-replica deployments.
* **Secure Cookie Mandate**: Requires HTTPS protocol in production to transfer HTTP-Only cookies.

---

## 3. Functional Requirements (System Features)

### 3.1 Session & Authentication Module

#### 3.1.1 Admin Google OAuth Flow
* **Requirement**: The system must authenticate administrative accounts via Google OAuth.
* **Inputs**: Google OAuth token provided in Callback browser hash.
* **Process**: 
  1. Post token to `/api/auth/google-session`.
  2. Verify email belongs to the `approved_admins` collection.
  3. Generate and store session cookie containing `auth_token`.
* **Output**: Sets HTTP-Only secure cookie, returns admin user schema.

#### 3.1.2 Student Roll Number Login
* **Requirement**: Students must log in using their roll number and password.
* **Inputs**: `roll_number` and `password`.
* **Process**: Validate match against `students` collection, decrypting hashed password using bcrypt.
* **Output**: Set session cookie (`auth_token`) on success; `401 Unauthorized` on mismatch.

#### 3.1.3 Password Reset Guard
* **Requirement**: Force students to update default credentials on first-time login.
* **Trigger**: Check if `must_change_password` flag is `true`.
* **Action**: Intercept routes and redirect student to password update page (`POST /api/auth/student-change-password`).

---

### 3.2 Class Management Module

#### 3.2.1 Class Registration
* **Requirement**: Admins can create classes.
* **Attributes**: `name`, `code` (unique), `max_students`, `periods_per_day`.
* **Process**: Checks that class code is unique, saves record, associates current admin as the owner.

#### 3.2.2 Class Join Lifecycle
* **Requirement**: Toggling a join link creates or deletes class entry access tokens.
* **Actions**: Enable, Disable, or Regenerate the join link. Disable action returns 404 to students attempting to join.

---

### 3.3 Attendance Marking Ledger

#### 3.3.1 Recording Attendance
* **Requirement**: Admins record student attendance on a per-period basis.
* **Process**: Save attendance array (student reference, status `P`/`A`/`L`, date, period number). Enforces unique compound index `(class_id, student_id, date, period_number)` to prevent duplicates.

#### 3.3.2 Attendance Calculations & CSV Export
* **Requirement**: System calculates attendance summaries and exports spreadsheets.
* **Math**: $\text{Attendance \%} = \frac{\text{Present} + \text{Late}}{\text{Total Periods}} \times 100$.
* **Export**: Trigger CSV file response containing student names, roll numbers, individual period sheets, and final status ratios.

---

### 3.4 Resource & Timetable Storage

#### 3.4.1 Timetable Uploads
* **Requirement**: Upload image file schedules.
* **Auditing**: History record is written to `timetable_history` showing uploader and action time.

#### 3.4.2 Streaming Document Uploads
* **Requirement**: Support streaming file uploads with size checks.
* **Validation**: Restricts upload sizes to a maximum of 50 MB. If upload fails, cleanup temporary files immediately to preserve storage space.

---

## 4. External Interface Requirements

### 4.1 User Interfaces
* **Frontend**: React-based responsive UI.
* **UI Fallbacks**: An `<ErrorBoundary>` glassmorphic fallback screen displays in place of viewport crashes.

### 4.2 Software Interfaces
* **MongoDB**: Connected via ASGI `motor.asyncio.AsyncIOMotorClient`.
* **Google API Gateway**: Communicates using `httpx` to verify OAuth session tokens.
* **SMTP Server**: Relies on outgoing SMTP (SSL port 465 or TLS port 587) for notification configurations.

---

## 5. Non-Functional Requirements

### 5.1 Performance
* **Response Bounds**: Core JSON endpoints return responses in $< 200\text{ms}$ under normal operations.
* **File Streaming**: Large document downloads use backend buffered chunk streams to prevent memory exhaustion.

### 5.2 Security
* **Session Cookie Configuration**:
  ```python
  response.set_cookie(
      key="auth_token",
      value=token,
      httponly=True,
      secure=COOKIE_SECURE,
      samesite=COOKIE_SAMESITE
  )
  ```
* **Authentication Rate Limits**: In-memory sliding-window limiter blocks IP addresses after 5 failed authentication attempts within 60 seconds.

### 5.3 Reliability & Availability
* **Database Resiliency**: Backend includes standard FastAPI handlers that return 503 errors when MongoDB ping requests fail.
* **Robust Error Handling**: Unhandled exceptions are logged with full tracebacks, and users receive a sanitized `500 Internal Server Error` message.
