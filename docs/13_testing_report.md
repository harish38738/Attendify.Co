# Testing Report — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Compiled test suite mappings, verification guidelines, and calculation formulas. | QA Lead |

---

## Source Traceability

| Test Module | Primary Target | Verification Focus |
|---|---|---|
| `test_attendance_calc.py` | `server.py` | 75% eligibility rounding & calculations |
| `test_cookie_fix.py` | `server.py` (Session Middleware) | Cookie headers (Secure, SameSite) |
| `test_attendify_api.py` | `server.py` (API Router) | REST API JSON schema validation |
| `test_attendance_e2e.py` | `server.py` (Attendance/Class) | End-to-end attendance workflows |
| `test_new_features.py` | `server.py` (CSV / Join / Edit) | Student edit, join links, and CSV imports |

---

## Table of Contents
1. [Overview & Testing Strategy](#1-overview--testing-strategy)
2. [Unit Test Suite: Attendance Calculations](#2-unit-test-suite-attendance-calculations)
3. [Integration Test Suite: Cookie & Session Headers](#3-integration-test-suite-cookie--session-headers)
4. [Functional REST API Test Suites](#4-functional-rest-api-test-suites)
5. [Local Test Execution Instructions](#5-local-test-execution-instructions)

---

## 1. Overview & Testing Strategy

Attendify V1 contains a comprehensive automated test suite consisting of **75 test cases** split across unit, integration, and functional layers.

### 1.1 Test Topology
* **Unit Tests**: Executed instantly without external database dependencies. Focused on mathematical precision (attendance percentages, eligibility rules).
* **Integration & API Tests**: Executed against a test database instance to validate schema integrity, routing, cookie middleware, and authorization gates.

---

## 2. Unit Test Suite: Attendance Calculations

File: `Backened/tests/test_attendance_calc.py`  
Status: **100% Passing** ✅

This suite isolates the core math logic to verify that students' attendance is calculated and displayed correctly.

### 2.1 Verified Formulas
1. **Raw Percentage**: `(Present + OD) / Conducted * 100`
2. **Display Rounding**: Rounded to exactly two decimal places.
3. **75% Eligibility**: Uses the raw, unrounded percentage. A student with `74.95%` is correctly flagged as having an **attendance shortage** (no rounding up to `75%`).

### 2.2 Test Case Details
* `test_example_108_of_121`: Verifies that 108 present periods out of 121 equals `89.26%` and is marked eligible.
* `test_od_counts_as_present`: Verifies that "On Duty" (OD) statuses are counted as present (e.g., 3 out of 4 periods present/OD equals `75%` and is eligible).
* `test_exactly_75_is_eligible`: Verifies that exactly `75%` passes the eligibility check.
* `test_just_below_75_is_shortage`: Verifies that `74.95%` fails eligibility (shortage).
* `test_no_records_is_zero`: Verifies that new enrollments with 0 periods are handled without division-by-zero errors.

---

## 3. Integration Test Suite: Cookie & Session Headers

File: `Backened/test_cookie_fix.py`  
Status: **100% Passing** ✅

This suite tests the FastAPI session cookie middleware.

### 3.1 Verified Behaviors
* **Secure Cookie Transmission**: Confirms that when `COOKIE_SECURE=true`, the `Set-Cookie` header includes the `Secure` flag.
* **SameSite Controls**: Validates that cookie configurations (Lax, Strict, None) are parsed and attached to HTTP response headers.

---

## 4. Functional REST API Test Suites

Files: `Backened/tests/test_attendify_api.py`, `Backened/tests/test_attendance_e2e.py`, `Backened/tests/test_new_features.py`  
Status: **Verified in CI/Staging** (Requires live MongoDB connection)

These suites cover the end-to-end REST API endpoints of the Attendify backend:

### 4.1 Authenticated Flows
* **Student Logins**: Password verification via bcrypt.
* **Google OAuth Callback**: Mock token validation and super-admin check.

### 4.2 Class Operations
* Creating, editing, and archiving classes.
* Validating that class deletion is blocked for non-super-admins when data exists.

### 4.3 Student & Roster Controls
* Bulk importing via CSV data streams.
* Editing student names and roll numbers.
* Restricting duplicate roll numbers within the database.

---

## 5. Local Test Execution Instructions

### 5.1 Prerequisites
1. Ensure your local virtual environment is active.
2. Ensure MongoDB is running locally on port `27017` (required for functional and E2E test suites).

### 5.2 Commands

To run all unit tests (no database required):
```bash
venv/bin/pytest tests/test_attendance_calc.py
```

To run the complete test suite (requires local MongoDB):
```bash
# Set test environment variables
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="attendify_test"

# Run all test scripts
venv/bin/pytest
```
*(On Windows, replace `export` with `$env:` in PowerShell or `set` in CMD).*
