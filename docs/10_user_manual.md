# User Manual (Student) — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  
**Audience:** Students enrolled in Attendify-managed classes

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Initial student-facing user manual compiled from source code inspection. | Technical Writer |

---

## Source Traceability

| Section | Primary Source File | Verification Method |
|---|---|---|
| Login & Onboarding | `Login.jsx`, `OnboardingExperience`, `StudentDashboard.jsx` | Source code inspected |
| Dashboard | `StudentDashboard.jsx` | Source code inspected |
| Profile & Password | `StudentProfile.jsx` | Source code inspected |
| Notifications | `StudentNotifications.jsx` | Source code inspected |
| Resources | `StudentResources.jsx`, `ResourceViewer.jsx` | Source code inspected |
| Academic Updates | `StudentAcademicUpdates.jsx` | Source code inspected |
| Attendance History | `StudentHistory.jsx` | Source code inspected |
| Classmates | `StudentClassmates.jsx` | Source code inspected |
| Joining a Class | `JoinClass.jsx` | Source code inspected |
| Password Change | `ForceChangePassword.jsx`, `StudentProfile.jsx` | Source code inspected |

---

## Table of Contents
1. [Getting Started](#1-getting-started)
2. [Dashboard — My Dashboard](#2-dashboard--my-dashboard)
3. [Notifications](#3-notifications)
4. [Resources](#4-resources)
5. [Academic Updates](#5-academic-updates)
6. [Attendance History](#6-attendance-history)
7. [Classmates](#7-classmates)
8. [My Profile](#8-my-profile)
9. [Joining a Class via Link](#9-joining-a-class-via-link)
10. [Changing Your Password](#10-changing-your-password)
11. [Reporting an Issue](#11-reporting-an-issue)

---

## 1. Getting Started

### 1.1 First-Time Login

Attendify uses a **Roll Number + Password** login for students. Your account is created by your class administrator when they add you to the class roster.

**Steps:**
1. Open your institution's Attendify URL in a web browser.
2. On the login screen, select the **Student Login** tab.
3. Enter your **Roll Number** (case-insensitive; the system normalises it to uppercase automatically).
4. Enter your **Password**. For first-time users, your initial password is typically your roll number unless your administrator specified otherwise.
5. Click **Login**.

### 1.2 First-Login Password Change (Forced)

If your administrator flagged your account as requiring a password change, you will be redirected to a **Force Change Password** screen immediately after login.

> [!IMPORTANT]
> You cannot access the dashboard until you set a new personal password. Your new password must be at least 6 characters long.

**Steps:**
1. Enter your current password (your roll number or the temporary password provided by your admin).
2. Enter your new password.
3. Confirm the new password.
4. Click **Change Password**. You will be redirected to the dashboard upon success.

### 1.3 Onboarding Experience

First-time users may be shown a 6-screen onboarding walkthrough introducing the Attendify platform. This is controlled by your institution's administrator.

* You can click **Skip** at any time to bypass onboarding and go directly to the dashboard.
* If the onboarding is set to **Every Login** mode by your admin, you will see it on each login.

---

## 2. Dashboard — My Dashboard

The dashboard is your primary screen and the first thing you see after logging in. It gives you a real-time summary of your academic status.

**Automatic Refresh:** The dashboard silently refreshes data every **30 seconds** in the background.

### 2.1 Attendance Hero Card
The large card at the top of the dashboard displays:
* **Your overall attendance percentage** (animated counter).
* **Attendance Status badge**: `Safe`, `Warning`, or `Critical`.
* **Delta indicator**: Shows whether your attendance went up (↑) or down (↓) compared to the previous recorded period.
* **Working Hours Attended / Total Working Hours**: A breakdown of your present and total class periods.
* **Last Updated**: Timestamp of the most recent attendance entry.

### 2.2 Summary Info Cards
Four quick-reference cards below the hero:
| Card | What It Shows |
|---|---|
| **Roll Number** | Your institutional roll number |
| **Class** | Your enrolled class name |
| **Working Hours Attended** | Total periods you were present or on-duty |
| **Total Working Hours** | Total periods conducted so far |

### 2.3 Timetable Panel
* Displays your class's uploaded timetable image.
* Shows **Today's Day Order** (e.g., Day 1, Day 2) if set by your administrator.
* If no Day Order has been set or no timetable has been uploaded, a placeholder message is shown.
* Click **View Timetable** to open the full-screen timetable viewer.

### 2.4 Latest Announcements Panel
* Displays the most recent announcements published by your class administrator.
* Each announcement shows a title, description (truncated to 3 lines), and publication timestamp.

### 2.5 Today's Attendance Grid
* Shows each period for today with a colour-coded status badge:
  * **Green / ✓**: Present
  * **Red / ✗**: Absent
  * **Amber**: On Duty (OD)
  * **Grey / ○**: Pending (not yet marked)

---

## 3. Notifications

Navigate to **Notifications** from the sidebar to view all system alerts sent to your account.

* Notifications are generated automatically when your attendance is marked or edited.
* Each notification card shows:
  * **Title** (e.g., "Attendance recorded", "Marked absent")
  * **Message** describing the specific period and date
  * **New / Read** badge — unread notifications are highlighted with a blue border
  * **Timestamp** of when the notification was created
  * **View details** link (if a relevant link is attached)
* Click the **Refresh** button in the page header to manually reload notifications.

---

## 4. Resources

Navigate to **Resources** from the sidebar to browse and download academic files uploaded by your administrator.

### 4.1 Browsing by Subject
* Resources are organised into subject folders created by your administrator.
* Click on a subject card to expand and view all uploaded files within that subject.

### 4.2 Browsing by Category
Each file is tagged with one of these categories:
`Notes` · `PYQs` · `Important Questions` · `Assignments` · `Lab Manuals` · `Practical Files` · `PPTs` · `Books` · `Syllabus` · `Question Bank` · `Others`

### 4.3 Viewing & Downloading Files
* Click a file card to open the **Resource Viewer**.
* **PDF files** open in an in-browser viewer.
* **Image files** (JPG, PNG, WebP) are displayed inline.
* Use the **Download** button on the viewer to save the file to your device.

---

## 5. Academic Updates

Navigate to **Academic Updates** (also shown as "Updates" in the sidebar) to view instructor-published items that go beyond standard announcements.

Academic Updates are categorised into the following sections:
| Section | Description |
|---|---|
| **Tomorrow's Tests** | Upcoming tests and exam reminders |
| **What to Study** | Study material references from your instructor |
| **Pending Work** | Assignments and tasks with optional due dates |
| **Faculty Instructions** | Specific directives, notices, or purchase requests |
| **Missed While Absent** | Content posted for students who were absent |

Each update card displays a title, description, optional due date, and creation timestamp.

---

## 6. Attendance History

Navigate to **Attendance History** from the sidebar to view a date-wise historical log of your attendance records.

* Filter by date range to view records for a specific period.
* Each row shows the **date**, **period number**, and **status** (Present / Absent / OD).
* This view is read-only; only administrators can edit attendance records.

---

## 7. Classmates

Navigate to **Classmates** from the sidebar to view the list of other students in your class.

* Displays each student's **name** and **roll number**.
* This is a read-only directory; no contact details are exposed.

---

## 8. My Profile

Navigate to **My Profile** from the sidebar to view your full account and academic details.

The profile page displays:
* **Name** and **avatar initial**.
* **Attendance percentage** with status badge.
* **Academic details**: Roll Number, Class, Department, Semester, Academic Year.

### 8.1 Changing Your Password (From Profile)
1. Click the **Change Password** button at the bottom of the profile card.
2. Enter your **Current Password**.
3. Enter and confirm your **New Password** (minimum 6 characters).
4. Click **Save Password**.

### 8.2 Logging Out
Click the **Logout** button at the bottom of the profile page. You will be redirected to the login screen and your session cookie will be cleared.

---

## 9. Joining a Class via Link

If your administrator shares a **Join Link** or **Join Code** with you:

1. Open the join link in your browser. It will navigate to the **Join Class** page pre-filled with the class's join code.
2. Fill in the form:
   * **Full Name** (2–80 characters; letters, spaces, hyphens, apostrophes, and periods only)
   * **Roll Number** (2–32 characters; automatically converted to uppercase)
   * **Password** (minimum 6 characters — this becomes your login password)
   * **Confirm Password**
3. Click **Join Class**.
4. On success, your account is created and you can log in immediately using your roll number and the password you set.

> [!NOTE]
> Join links are rate-limited to **10 attempts per minute per IP address** to prevent abuse. If you see a "Too many requests" error, wait 60 seconds and try again.

---

## 10. Changing Your Password

Students can change their password from two places:

1. **From the Profile page** — Click **Change Password** (see [Section 8.1](#81-changing-your-password-from-profile)).
2. **Forced on first login** — If your account was flagged by the administrator (see [Section 1.2](#12-first-login-password-change-forced)).

**Password requirements:**
* Minimum **6 characters**.
* Must match the confirmation field exactly.

---

## 11. Reporting an Issue

If you encounter a problem with the application or your attendance records:

1. Navigate to **My Profile**.
2. Click the **Report Issue** button.
3. Fill in the issue description form and submit.

Your report will be reviewed by the system administrator.
