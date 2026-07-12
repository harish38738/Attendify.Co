# Admin Manual — Attendify

**Version:** v1.0.0  
**Status:** Engineering Complete & Feature Frozen  
**Last Updated:** 2026-07-12  
**Audience:** Verified Class Administrators (Faculty/Staff)

---

## Revision History

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-12 | v1.0.0 | Initial admin-facing operational manual compiled from source code inspection. | Technical Writer |

---

## Source Traceability

| Management Area | Primary Frontend Source File | Verification Target |
|---|---|---|
| **Google Authentication** | `Login.jsx`, `AuthContext.js` | OAuth login flow |
| **Class Setup** | `Classes.jsx` | API router `/api/classes` |
| **Student Rosters** | `Students.jsx` | CSV parsers & password reset |
| **Attendance Sheet** | `AttendanceMarking.jsx` | Period validation routines |
| **Resources Storage** | `Resources.jsx` | Upload forms & size limits |
| **Announcements** | `Announcements.jsx` | API router `/api/announcements` |
| **Academic Updates** | `AcademicUpdates.jsx` | Contextual update category endpoints |
| **Timetable Files** | `Timetable.jsx` | Local storage updates |
| **System Profile** | `AdminProfile.jsx` | Dynamic managed classes count |

---

## Table of Contents
1. [Authentication & Portal Access](#1-authentication--portal-access)
2. [Class Management](#2-class-management)
3. [Student Management & Enrollment](#3-student-management--enrollment)
4. [Attendance marking & Editing](#4-attendance-marking--editing)
5. [Resource Management](#5-resource-management)
6. [Announcements & Academic Updates](#6-announcements--academic-updates)
7. [Timetable & Day Orders](#7-timetable--day-orders)
8. [Admin Profile & Stats](#8-admin-profile--stats)

---

## 1. Authentication & Portal Access

Attendify enforces strict access controls for administrators. Regular registration forms are not available to prevent unauthorized admin accounts.

### 1.1 Whitelist Verification & Google Sign-In
* **Access Method**: Administrators must log in via the **Google Authentication** flow.
* **Security Gate**: When you click **Sign in with Google**, the backend verifies your email address against a database whitelist (`approved_admins` collection).
  * If your email is not in the whitelist, the login is rejected and an error is displayed.
  * To get whitelisted, contact the system Super Admin.

---

## 2. Class Management

Navigate to **Classes** from the navigation sidebar to manage your classes.

### 2.1 Creating a Class
1. Click the **Create Class** button.
2. Complete the form:
   * **Class Name**: e.g., `B.Tech CSE - Section A`.
   * **Class Code**: A unique code, e.g., `CS-2026-A`.
   * **Department**: e.g., `Computer Science`.
   * **Periods per Day**: Total lecture periods per day (default is `6`, maximum `10`).
   * **Max Students**: Enrollment limit (default `100`).
   * **Year, Section, Semester, Academic Year**: Operational metadata.
3. Click **Create Class**.

### 2.2 Class Actions & The Trash System
* **Edit**: Click the **Edit** (pencil) icon to update class metadata (e.g., changing Max Students or Department).
* **View Students**: Click the **Users** icon to view the student directory for that class.
* **Join Details**: Click **Join Link** to copy a direct student enrollment URL or class join code.
* **Delete Class**:
  * Clicking the **Delete** (trash) icon moves the class to the **Class Trash** folder.
  * A class in the Trash is deactivated but not permanently deleted.
  * *Super Admin privilege*: Regular class admins cannot permanently delete a class containing active attendance or resource data. This prevents accidental data loss.

---

## 3. Student Management & Enrollment

Navigate to **Students** from the sidebar or click **View Students** inside a class card.

### 3.1 Individual Student Creation
1. Select the target **Class** from the dropdown menu.
2. Click **Add Student**.
3. Provide the student's **Full Name** and a unique institutional **Roll Number**.
4. Click **Submit**.
   * The student's default login password will match their Roll Number.

### 3.2 Batch Import via CSV
To enroll multiple students at once:
1. Click the **Upload CSV** button.
2. Prepare a `.csv` file using the following header row format:
   ```csv
   name,roll_number
   John Doe,CSE-2026-001
   Jane Smith,CSE-2026-002
   ```
3. Upload the file and select the target **Class**.
4. The system will parse the records and register all valid students in a single batch. Any duplicate roll numbers or formatting issues will flag validation warnings.

### 3.3 Password Resets
If a student forgets their password, they must contact you.
1. Locate the student in the student directory table.
2. Click the **Reset Password** key icon.
3. Confirm the action. The student's password is reset to their **Roll Number**. They will be prompted to change it when they next log in.

---

## 4. Attendance Marking & Editing

Navigate to **Mark Attendance** from the sidebar.

### 4.1 Daily Attendance Entry
1. Select the **Class**, **Date**, and **Period Number** (e.g., Period 1, Period 2).
2. The student roster is loaded automatically. By default, all students are marked as **Present**.
3. Toggle individual statuses:
   * **Present** (Green / ✓)
   * **Absent** (Red / ✗)
   * **On Duty / OD** (Amber / OD) — Used for students representing the institution at official events.
4. Click **Submit Attendance**. This broadcasts instant push alerts to affected students' notification feeds.

### 4.2 Editing Attendance
If you select a class, date, and period that has already been submitted:
1. The page switches to **Edit Mode** automatically.
2. Adjust the student statuses as needed.
3. Click **Update Attendance**. The history is updated and students are notified of any changes.

---

## 5. Resource Management

Navigate to **Resources** from the sidebar to share study material with your students.

### 5.1 Organizing by Subjects
* Administrators must first create a **Subject Folder** (e.g., `Data Structures`, `Operating Systems`) before uploading files.
* Click **Create Subject**, enter the subject name, and confirm.

### 5.2 Uploading Files
1. Click **Upload File** inside a subject folder.
2. Select a file from your device.
   * **Size Guard**: Files larger than **50 MB** are rejected automatically on upload to protect server storage.
3. Choose a category (e.g., `Notes`, `Syllabus`, `Assignments`).
4. Click **Upload**. The file is stored securely on the server and is immediately accessible to students in that class.

---

## 6. Announcements & Academic Updates

### 6.1 Academic Announcements
* Use **Announcements** to share general alerts (e.g., "Class suspended tomorrow").
* Announcements appear on the main student dashboard feed immediately.

### 6.2 Structured Academic Updates
Use **Academic Updates** to publish categorized coursework information:
* **Tomorrow's Tests**: Post syllabus and timing reminders for exams.
* **What to Study**: Share specific reading material references.
* **Pending Work**: Create assignment reminders with due dates.
* **Faculty Instructions**: Share class-specific requirements (e.g., "Bring lab coats").
* **Missed While Absent**: Post content summaries for students who were absent from a lecture.

---

## 7. Timetable & Day Orders

Navigate to **Timetable** from the sidebar.

### 7.1 Timetable Upload
1. Choose the class from the dropdown menu.
2. Drag and drop or upload an image file (PNG/JPG) of the timetable.
3. Click **Upload**. Students see this updated image on their dashboards immediately.

### 7.2 Day Order Selection
To rotate daily schedules (if your institution uses a Day Order system):
1. Select the current **Day Order** number (e.g., Day 1 to Day 6) from the dropdown.
2. Click **Set Day Order**. This updates the daily period layouts on all student dashboards.

---

## 8. Admin Profile & Stats

Navigate to **My Profile** from the sidebar to check your account details:
* Displays your registered Google Account **avatar picture**, **Name**, **Email**, and **Role** (Admin).
* **Managed Classes count**: Shows the list of classes you actively administer.
* **Logout**: Click the logout button to clear your secure HTTP-Only session cookies.
