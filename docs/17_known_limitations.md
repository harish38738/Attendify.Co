# Known Limitations — Attendify

**Version:** v1.0.0  
**Status:** Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Table of Contents
1. [Overview](#1-overview)
2. [Architectural & Deployment Limits](#2-architectural--deployment-limits)
3. [Resource Storage Limits](#3-resource-storage-limits)
4. [Session & Authentication Limits](#4-session--authentication-limits)
5. [Email & Notification Limits](#5-email--notification-limits)

---

## 1. Overview

This document outlines the architectural limits and constraints of the **Attendify V1** release. These limitations represent intentional design decisions for V1 and should be reviewed by hosting administrators before deployment.

---

## 2. Architectural & Deployment Limits

### 2.1 Single-Node Boundary
* **Limitation**: The Attendify V1 backend is designed to run on a single hosting server.
* **Reason**: 
  * Timetable and study resource files are stored on the local disk (`timetable_storage` and `resource_storage` directories).
  * Rate limiters are maintained in-memory using Python dictionaries (`_InMemoryRateLimiter`).
* **Impact**: If traffic is distributed across multiple nodes (e.g., behind a load balancer), file downloads will fail and rate limiting thresholds will not be synchronized.

---

## 3. Resource Storage Limits

### 3.1 Local Disk Capacity
* **Limitation**: Shared files are stored directly on the server's local file system.
* **Risk**: High-frequency uploads of large documents (up to **50 MB** per file) can saturate the server's disk space over time.
* **Workaround**: System administrators must set up automated backup policies and disk space monitoring.

---

## 4. Session & Authentication Limits

### 4.1 Database Lookups for Session Validation
* **Limitation**: User sessions are validated via query lookups in the MongoDB `sessions` collection on every API request.
* **Impact**: High concurrent traffic may increase database load and slow down responses.
* **Workaround**: Compound indexes on the `sessions` collection help optimize performance, but scaling to large student populations (e.g., >10,000 active users) may require a memory-cached session store like Redis.

### 4.2 Manual Admin Whitelisting
* **Limitation**: Administrators must be whitelisted manually by the Super Admin before they can log in via Google OAuth.
* **Impact**: No self-service registration or domain-based sign-in is supported.

---

## 5. Email & Notification Limits

### 5.1 Simple Asynchronous Emailing
* **Limitation**: System emails (e.g., bug reports) are processed asynchronously using `asyncio.to_thread`.
* **Impact**: There is no persistent message queue (e.g., Celery) or retry logic. If the server loses internet connectivity or restarts while sending an email, the message is lost and will not be retried.
