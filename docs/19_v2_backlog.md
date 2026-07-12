# V2 Backlog — Attendify

**Version:** v2.0.0 (Proposed)  
**Status:** Planning Backlog  
**Last Updated:** 2026-07-12  

---

## Table of Contents
1. [Overview](#1-overview)
2. [High-Priority Scalability Upgrades](#2-high-priority-scalability-upgrades)
3. [Performance Optimizations](#3-performance-optimizations)
4. [Functional Enhancements](#4-functional-enhancements)
5. [Reliability & Messaging Queues](#5-reliability--messaging-queues)

---

## 1. Overview

This backlog outlines the planned features and architectural changes proposed for the **Attendify V2** release. These tasks address the known limitations of V1, focusing on scalability, performance under high concurrent loads, and user experience.

---

## 2. High-Priority Scalability Upgrades

### 2.1 Cloud Object Storage Migration
* **Goal**: Move away from storing files on the local disk.
* **Proposal**: Migrate study resource and timetable storage to a cloud object store (e.g., AWS S3, Google Cloud Storage, or MinIO).
* **Impact**: Enables horizontal scaling of the backend services by removing the local filesystem dependency.

### 2.2 Distributed Rate Limiting
* **Goal**: Replace in-memory dictionaries with a distributed rate limiting architecture.
* **Proposal**: Implement Redis to store rate-limiting sliding windows.
* **Impact**: Ensures consistent rate limiting across multiple instances behind a load balancer.

---

## 3. Performance Optimizations

### 3.1 Redis-Based Session Cache
* **Goal**: Remove session validation database queries on every API request.
* **Proposal**: Store session tokens in an in-memory Redis cache with automatic TTL expiration.
* **Impact**: Drastically reduces database read operations and improves API response times.

---

## 4. Functional Enhancements

### 4.1 Domain-Based Admin Sign-Up
* **Goal**: Replace manual admin email whitelisting.
* **Proposal**: Allow self-service administrator registrations if their email domain matches an approved school domain list (e.g., `@school.edu`).

### 4.2 Push Notifications via FCM
* **Goal**: Deliver notifications to devices even when the app is closed.
* **Proposal**: Integrate Firebase Cloud Messaging (FCM) to send push notifications to mobile and desktop browsers for attendance status updates and announcements.

---

## 5. Reliability & Messaging Queues

### 5.1 Asynchronous Task Broker (Celery)
* **Goal**: Decouple slow operations from the HTTP request-response cycle.
* **Proposal**: Integrate Celery with Redis or RabbitMQ as the message broker.
* **Impact**: Handles emails, database cleanups, and report generation in the background. If a task fails (e.g., email delivery failure), it is automatically retried using exponential backoff.
