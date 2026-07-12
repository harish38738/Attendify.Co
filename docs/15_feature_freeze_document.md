# Feature Freeze Document — Attendify

**Version:** v1.0.0  
**Status:** Frozen  
**Freeze Commit Hash:** `1b80a926cbcdc2531e12d7deb81193f7ca727988`  
**Effective Date:** 2026-07-12  

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Declared official feature lock boundaries and change management guidelines. | Release Engineer |

---

## Source Traceability

| Hardening Area | Primary Target | Scope Definition |
|---|---|---|
| **API Endpoints** | `server.py` | Locked routes and REST contracts |
| **Frontend Layouts** | `Frontend/src/` | Visual feature freeze and page layout locks |
| **Testing Checks** | `tests/` | QA validation constraints |

---

## Table of Contents
1. [Declaration of Feature Freeze](#1-declaration-of-feature-freeze)
2. [Official List of Locked V1 Modules](#2-official-list-of-locked-v1-modules)
3. [Permitted Modifications During Freeze](#3-permitted-modifications-during-freeze)
4. [Freeze Change Management Rules](#4-freeze-change-management-rules)

---

## 1. Declaration of Feature Freeze

As of **2026-07-12**, Attendify V1 has officially entered **Feature Freeze**. No new features, interface modifications, or functional enhancements are permitted in this release branch. The code is locked at commit hash:

`1b80a926cbcdc2531e12d7deb81193f7ca727988`

The goal of this freeze is to ensure stability, document the code, and fix critical regressions before public release.

---

## 2. Official List of Locked V1 Modules

The following functional areas are frozen and cannot be changed:

1. **Authentication**: Google OAuth login flow (Admins), student roll number login (Students), and password force-change checks on first login.
2. **Student Dashboard**: The main dashboard screen showing announcements, class timetables, daily attendance metrics, and today's classes grid.
3. **Class Administration**: Creating classes, updating class metadata, and moving classes to the Class Trash folder.
4. **Student Enrollment**: Individual student profile registration, batch enrollment via CSV, and password resets to default credentials.
5. **Attendance Sheets**: Period-wise daily attendance marking and editing (Present, Absent, On Duty).
6. **Study Resources**: Folder creation by subject, 50MB file size upload limits, and student resource downloads.
7. **Announcements**: Broadcast alerts published by admins or super-admins.
8. **Academic Updates**: Submitting categorized tasks (Tests, Study, Homework, Lab instructions).
9. **Timetable & Day Orders**: Timetable image uploads and setting day order values.
10. **Issue Reports**: Bug and suggestion submissions and status updates (Open, Reviewing, Resolved).

---

## 3. Permitted Modifications During Freeze

Only the following changes are permitted during this phase:

* **Critical Bug Fixes**: Correcting logic errors or crashes (e.g., removing duplicate routes or fixing database lookup failures).
* **Security Patches**: Correcting vulnerabilities (e.g., configuring cookie properties or updating security middleware headers).
* **Documentation**: Finalizing user manuals, deployment steps, testing reports, and release notes.

---

## 4. Freeze Change Management Rules

To maintain codebase stability, any changes allowed during the freeze must follow these rules:

1. **Strict Target Scope**: Fixes must target only the specific lines of code causing the bug. Refactoring unrelated code is not permitted.
2. **Mandatory Compile Validation**: Any code modifications must pass basic compilation checks (`python -m py_compile server.py`) and AST checks.
3. **Local Regression Testing**: The complete test suite (`pytest`) must be run locally before proposing any changes.
4. **Zero API Contract Alterations**: Endpoint paths, HTTP methods, and JSON response formats must not be modified.
