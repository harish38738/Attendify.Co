# Super Admin Manual — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  
**Audience:** System Owners & Institutional Platform Managers

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Initial Super Admin operations guide compiled from source code inspection. | Technical Writer |

---

## Source Traceability

| Management Area | Primary Backend Source File | Verification Target |
|---|---|---|
| **Super Admin Role Identification** | `server.py` (lines 97, 1106, 1146) | Environment variable `OWNER_EMAIL` |
| **Admin Whitelisting** | `server.py` (lines 1587, 1614), `AdminManagement.jsx` | API router `/api/auth/approved-admins` |
| **Forced Class Deletion** | `server.py` (lines 1454, 1508, 1520, 1533) | API router `/api/classes/{class_id}` |
| **Global Onboarding Settings** | `server.py` (lines 1804, 1827, 1850), `StudentDashboard.jsx` | API router `/api/settings/onboarding` |
| **Bug & Feedback Audits** | `server.py` (lines 3029, 3041), `Reports.jsx` | API router `/api/reports` |
| **Student Password Resets** | `server.py` (line 1357), `Students.jsx` | API router `/api/admin/students/{student_id}/reset-password` |

---

## Table of Contents
1. [Defining the Super Admin Role](#1-defining-the-super-admin-role)
2. [Admin Whitelist Administration](#2-admin-whitelist-administration)
3. [Forced Class Deletion & Data Override](#3-forced-class-deletion--data-override)
4. [Student Password Resets](#4-student-password-resets)
5. [Global Onboarding & Walkthrough Settings](#5-global-onboarding--walkthrough-settings)
6. [User Feedback & Bug Reports Management](#6-user-feedback--bug-reports-management)

---

## 1. Defining the Super Admin Role

The **Super Admin** is the highest authority in the Attendify platform. Unlike regular Class Administrators, the Super Admin has full platform clearance, allowing them to override data constraints, manage administrative access, and edit system-wide parameters.

### 1.1 Identity Mapping
* **Super Admin Definition**: The Super Admin role is linked directly to the `OWNER_EMAIL` environment variable defined on the hosting server.
* **Role Promotion**: During Google OAuth login, if the authenticated user's email matches the configured `OWNER_EMAIL`, the backend database automatically promotes their user role record to `"super_admin"`. All other whitelisted logins are designated as `"admin"`.

---

## 2. Admin Whitelist Administration

To prevent unauthorized access, Attendify does not allow open administrator registrations. Access is restricted to emails that have been explicitly whitelisted by the Super Admin.

Navigate to **Admin Management** from the sidebar to manage access:

### 2.1 Whitelisting a New Admin Email
1. Locate the **Approved Admins** section.
2. Enter the administrator's Google email address in the input field.
3. Click **Add Email**.
   * The backend validates the email format and adds it to the `approved_admins` database collection.
   * The administrator can now log in immediately using their Google account.

### 2.2 Revoking Administrative Access
1. Locate the target email address in the approved admins list.
2. Click the **Trash / Revoke** icon next to the email address.
3. Confirm the action in the prompt.
   * Revoking an email address immediately blocks the user from logging in.
   * *Active Session Revocation*: To ensure immediate access removal, the backend automatically terminates all active sessions associated with the revoked email address.

---

## 3. Forced Class Deletion & Data Override

Attendify enforces strict data integrity rules to prevent accidental loss of student attendance histories and uploaded files.

### 3.1 Regular Admin vs. Super Admin Deletion Rules
* **Regular Administrators**: Can only move a class to the **Class Trash** folder if the class has no active attendance records or student accounts.
* **Super Administrators**: Can delete *any* class, even if it contains active data.

### 3.2 Executing a Forced Deletion (Override)
1. Navigate to the **Classes** dashboard.
2. Locate the class and click the **Delete** (trash) icon.
3. If the class contains active student profiles or attendance data, the system will prompt for confirmation.
4. Type the class name exactly as shown in the verification prompt to confirm.
5. Click **Confirm Deletion**.
   * The class is moved to the **Class Trash** folder.
   * This action marks the class metadata as inactive, removing it from all active student dashboards and period logs.

---

## 4. Student Password Resets

Although regular class administrators can reset student passwords, the Super Admin has direct control over student password management in the database.

* If a student cannot access their portal, go to the student directory table under the class details.
* Click the **Reset Password** key icon and confirm.
* The backend will immediately clear the password hash and set the student's password back to their default **Roll Number**.
* The student will be prompted to change their password when they next log in.

---

## 5. Global Onboarding & Walkthrough Settings

The onboarding settings control the student introduction walkthrough shown upon login. The Super Admin can configure these parameters directly via the API or database settings:

### 5.1 Onboarding Parameters
* `enableOnboarding` (Boolean): Enables or disables the walkthrough experience globally.
* `onboardingMode` (String):
  * `first_login_only` (Default): The walkthrough is shown only on the student's first login and is hidden once they click complete.
  * `every_login`: The walkthrough is shown every time a student logs in, useful for new announcements or testing.

### 5.2 Resetting Onboarding Status
* To show the walkthrough again for all students (e.g., after a major update), the Super Admin can reset the onboarding status.
* This clears the `hasCompletedOnboarding` flag for all student accounts, causing the walkthrough to display on their next login.

---

## 6. User Feedback & Bug Reports Management

Students and administrators can submit issue reports and feedback directly from their profiles. The Super Admin is responsible for reviewing and managing these submissions.

Navigate to **Reports** from the sidebar:

### 6.1 Reviewing Submissions
* The reports dashboard displays all submitted feedback.
* You can filter submissions by type:
  * `Bug`
  * `Feature Request`
  * `Problem`
  * `Suggestion`
* Each card displays the issue description, submitter's details (name, email, role), date, and current status.

### 6.2 Updating Status
1. Click the status dropdown menu on the target report card.
2. Choose the appropriate status:
   * **Open**: Default status for new reports.
   * **Reviewing**: Work in progress / investigating.
   * **Resolved**: Issue fixed or feedback addressed.
3. The change is saved immediately.
