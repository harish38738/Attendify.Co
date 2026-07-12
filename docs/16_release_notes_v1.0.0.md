# Release Notes — Attendify v1.0.0

**Release Tag:** `v1.0.0`  
**Target Commit:** `1b80a926cbcdc2531e12d7deb81193f7ca727988`  
**Release Date:** 2026-07-12  
**Status:** Hardened & Verified Production Release  

---

## Table of Contents
1. [Overview](#1-overview)
2. [What's New in v1.0.0](#2-whats-new-in-v100)
3. [Stabilization & Bug Fixes](#3-stabilization--bug-fixes)
4. [Deployment Prerequisites](#4-deployment-prerequisites)

---

## 1. Overview

Attendify v1.0.0 is the first official production-ready release of the platform. This release provides a stable foundation for class attendance tracking, study resource sharing, notifications, and student feedback. 

---

## 2. What's New in v1.0.0

### 2.1 Student Portal
* **Student Dashboard**: Quick access to cumulative attendance metrics, class announcements, and a daily periods schedule.
* **Onboarding Experience**: Guided tour for first-time student users.
* **Academic Section**: Categorized coursework notifications, upcoming tests, homework assignments, and shared resources.
* **Class Roster**: View classmate lists and check profiles.
* **Issue Reporting**: Direct feedback submission form for bugs or suggestions.

### 2.2 Administrator Portal
* **Roster Management**: Individual student registration or batch enrollment using CSV imports.
* **Attendance marking**: Period-by-period daily attendance log (Present, Absent, On Duty) with support for editing existing logs.
* **Resource Center**: Create subject folders and upload study materials.
* **Announcements**: Publish alerts that display on all student dashboards.
* **Timetables**: Upload class timetables and configure daily day order values.

### 2.3 Super Administrator Operations
* **Admin Access Controls**: Direct whitelist administration (adding and revoking administrator access).
* **Data Overrides**: Forced class deletion bypass rules.
* **System Feedback Audit**: Review and update the status of user-submitted bug reports and feedback.

---

## 3. Stabilization & Bug Fixes

This release includes the following stabilization fixes from the hardening phase:

* **Route Deduplication**: Cleaned up a duplicate `/api/admin/profile` endpoint definition in `server.py` that was causing UI errors.
* **Admin Profile Stats**: Fixed the profile endpoint to return the dynamic count of managed classes from the database instead of a static value.
* **Report NameError**: Corrected a variable runtime error in the feedback report email delivery process.
* **File Upload Size Guard**: Implemented file validation to reject files larger than **50 MB** before they are saved to disk.
* **Database Cleanups**: Added hooks to clean up session tokens and notification histories when a student is deleted.
* **Attendance Double-Submit Guard**: Configured compound unique database indexes to prevent duplicate attendance logs for the same student on the same date/period.

---

## 4. Deployment Prerequisites

To deploy Attendify v1.0.0, the target hosting server must meet these requirements:

* **Python**: v3.10 or higher.
* **Node.js**: v18 or higher (for the frontend production build).
* **MongoDB**: v6.0 or higher.
* **Process Manager**: PM2 recommended for managing the backend background service.
* **Reverse Proxy**: Nginx recommended with SSL certificates enabled.
