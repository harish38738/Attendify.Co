# Database Design Document — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Initial release compilation detailing all MongoDB collections, schemas, and index policies. | Principal Software Architect |

---

## Table of Contents
1. [Overview](#1-overview)
2. [Collection Schemas & Data Models](#2-collection-schemas--data-models)
3. [Database Indexes](#3-database-indexes)
4. [Startup Data Seeding & Migrations](#4-startup-data-seeding--migrations)

---

## 1. Overview

Attendify uses MongoDB as its primary transactional data store. The backend application uses `motor` (an asynchronous MongoDB driver for Python) to execute non-blocking CRUD operations.

Since MongoDB is schema-less, data validation is enforced at the application boundary using Pydantic schemas in the FastAPI application. All document keys conform to standard JSON types (strings, integers, booleans, dates/ISO timestamps).

---

## 2. Collection Schemas & Data Models

### 2.1 Collection: `sessions`
Tracks active user session tokens.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `auth_token` (String): Secure 32-character hexadecimal token.
  * `user_id` (String): Reference to user's administrative or student ID.
  * `role` (String): User role boundary (`admin` or `student`).
  * `created_at` (Date): UTC timestamp when session was initialized.
  * `expires_at` (Date): UTC expiration timestamp (default duration is 7 days from creation).

### 2.2 Collection: `admins`
Stores registered administrative accounts verified via Google OAuth.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `id` (String): Unique administrative ID.
  * `email` (String): Faculty Gmail address.
  * `name` (String): Admin user's full name.
  * `picture` (String): URL reference to Google profile picture.
  * `role` (String): Set to `admin` or `super_admin`.
  * `created_at` (String): ISO 8601 UTC timestamp.

### 2.3 Collection: `approved_admins`
Whitelist registries of approved admin email addresses.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `email` (String): Target Gmail address.
  * `is_owner` (Boolean): Master system owner flag (cannot be deleted or modified).
  * `added_at` (String): ISO 8601 UTC timestamp.

### 2.4 Collection: `classes`
Stores information about created classes.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `id` (String): Unique class identifier.
  * `name` (String): Human-readable name (e.g. "Computer Networks Lab").
  * `code` (String): Academic course code.
  * `department` (String): Academic department (e.g. "CSE").
  * `year` (Integer): Target academic year (e.g., 3).
  * `semester` (Integer): Target semester (e.g., 6).
  * `section` (String): Student section (e.g., "A").
  * `max_students` (Integer): Maximum capacity cap.
  * `periods_per_day` (Integer): Standard periods count (default is 7).
  * `admin_id` (String): Reference to owning admin `id`.
  * `join_code` (String): Unique shareable join string.
  * `join_enabled` (Boolean): Flag to toggle self-enrollment.
  * `created_at` (String): ISO 8601 UTC timestamp.

### 2.5 Collection: `students`
Stores registered student credentials.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `id` (String): Unique student identifier.
  * `class_id` (String): Reference to target Class `id`.
  * `name` (String): Student's full name.
  * `roll_number` (String): Student roll number.
  * `password_hash` (String): Decryptable hash computed using `bcrypt`.
  * `must_change_password` (Boolean): Force password reset flag on first login.
  * `joined_at` (String): ISO 8601 UTC timestamp.

### 2.6 Collection: `attendance`
Stores marked daily period attendance ledgers.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `class_id` (String): Reference to Class `id`.
  * `student_id` (String): Reference to Student `id`.
  * `date` (String): Target date in `YYYY-MM-DD` format.
  * `period_number` (Integer): Number representing active class slot.
  * `status` (String): Student status (`Present`, `Absent`, or `OD`).
  * `marked_by` (String): Reference to logging Admin ID.
  * `marked_at` (String): ISO 8601 UTC timestamp.

### 2.7 Collection: `resource_subjects`
Categorized folders for file storage.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `id` (String): Subject folder ID.
  * `name` (String): Subject folder title.
  * `admin_id` (String): Reference to owning Admin ID.
  * `created_at` (String): ISO 8601 UTC timestamp.

### 2.8 Collection: `resources`
Stores file metadata for uploaded academic material.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `id` (String): Unique resource ID.
  * `filename` (String): Physical file name on disk storage.
  * `displayName` (String): User-facing filename.
  * `subject_id` (String): Reference to parent Subject Folder `id`.
  * `category` (String): Chosen class category (e.g. "Notes", "PYQs").
  * `fileType` (String): File extension (e.g., "pdf").
  * `mimeType` (String): Media descriptor (e.g., "application/pdf").
  * `fileSize` (Integer): Byte count.
  * `uploadedBy` (String): Admin email of publisher.
  * `uploadedAt` (String): ISO 8601 UTC timestamp.
  * `downloadCount` (Integer): Statistics counter.
  * `file_path` (String): Absolute storage system directory path reference.

### 2.9 Collection: `timetables` & `timetable_history`
Stores visual timetable allocations.
* **Fields**:
  * `timetable_id` (String): Timetable ID.
  * `class_id` (String): Reference to Class `id`.
  * `filename` (String): Disk filename.
  * `image_path` (String): Physical system path.
  * `image_url` (String): Public download endpoint.
  * `version` (Integer): File revision count.
  * `uploaded_by` (String): Admin email.
  * `uploaded_at` (String): ISO 8601 UTC timestamp.

### 2.10 Collection: `announcements`
Stores broadcast messages.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `class_id` (String): Reference to Class `id`.
  * `title` (String): Subject title.
  * `description` (String): Details text.
  * `created_by` (String): Publisher email.
  * `created_at` (String): ISO 8601 UTC timestamp.

### 2.11 Collection: `notifications`
Stores alerts targeted at student portal navigation bars.
* **Fields**:
  * `_id` (ObjectId): MongoDB internal identifier.
  * `id` (String): Unique notification ID.
  * `student_id` (String): Target Student ID.
  * `title` (String): Headline text.
  * `message` (String): Details payload.
  * `read` (Boolean): Alert status flag.
  * `created_at` (String): ISO 8601 UTC timestamp.

---

## 3. Database Indexes

To optimize query lookups and enforce system constraints, the following database indexes are applied:

| Collection | Index Fields | Order / Properties | Constraint / Purpose |
|---|---|---|---|
| **`sessions`** | `auth_token` | Single Index (1) | `unique`: Prevents duplicate auth session hashes |
| | `expires_at` | TTL Index (1) | `expireAfterSeconds = 0`: Removes expired sessions |
| **`approved_admins`** | `email` | Single Index (1) | `unique`: Prevents duplicate entries |
| **`admins`** | `email` | Single Index (1) | `unique`: Enforces unique admin profile emails |
| | `id` | Single Index (1) | `unique`: Enforces unique system IDs |
| **`students`** | `id` | Single Index (1) | `unique`: Enforces unique student records |
| | `class_id`, `roll_number` | Compound (1, 1) | `unique`: Prevents duplicate student roll numbers within the same class |
| **`classes`** | `department`, `year`, `section`, `semester` | Compound (1, 1, 1, 1) | `unique`, `sparse`: Prevents duplicate course sections |
| **`resource_subjects`**| `id` | Single Index (1) | `unique`: Unique folder key lookup |
| | `admin_id`, `name` | Compound (1, 1) | `unique`: Prevents duplicate subject folders under the same admin |
| **`resources`** | `id` | Single Index (1) | `unique`: Unique document reference |
| | `subject_id`, `category` | Compound (1, 1) | Query performance index for filtering folders |
| **`notifications`** | `id` | Single Index (1) | `unique`: Unique alert key |
| | `student_id`, `created_at` | Compound (1, -1) | Query performance for loading the notification bell |
| **`academic_updates`** | `id` | Single Index (1) | `unique`: Unique update key |
| | `class_id`, `type`, `created_at` | Compound (1, 1, -1) | Query performance for feed generation |
| **`attendance`** | `class_id`, `student_id`, `date`, `period_number` | Compound (1, 1, 1, 1) | `unique`: Prevents double marking a student for the same slot |

---

## 4. Startup Data Seeding & Migrations

Every time the FastAPI server starts, the following database hooks execute in order:
1. **Approved Admins Seeding**: Ensures the primary owner configuration (from `OWNER_EMAIL` or fallback) is created and set to `is_owner = true`.
2. **Index Assertions**: Ensures all unique and compound indexes listed in Section 3 exist. Re-creates missing indexes automatically.
3. **Data Deduplication Check**: Before creating the composite unique index on `attendance`, the server runs an aggregation query. If duplicate markings exist, the server keeps the oldest entry and deletes the duplicates to prevent index creation failures.
