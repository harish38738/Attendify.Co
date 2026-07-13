# Archived Reference: Attendify Project Architecture

> [!NOTE]
> This document (`project.md`) is **archived** as of the V1.0.0 release. It is preserved for historical reference and context only.
> For the official, verified, and complete engineering documentation, please refer to:
> - **[Project README](README.md)** (the central index of the documentation suite)
> - **[Core Documentation Suite](docs/)** (comprehensive guides `01_prd.md` through `20_release_certificate.md`)

---

## Historical Documentation Snapshot

*Below is a record of historical notes and system states from earlier stabilization phases. For current implementation details, see the official docs.*

### Historical Notes on Student Password Migration
* Legacy students initially did not have password hashes. A default `password_hash` matching their `roll_number` was assigned with `must_change_password = True` to force them to change it on their first login.
* The codebase enforces unique indexes on `(class_id, roll_number)` allowing a student to belong to multiple classes using the same roll number.

### Historical Notes: Consistent Loading Experience (June 2026)

#### Problem Resolved
Several pages had ad-hoc inline spinner markup (`animate-spin rounded-full …`) that caused:
- Inconsistent visual style across different pages.
- A blank white flash between route transitions.
- An uncaught `SyntaxError: 'return' outside of function` in `Resources.jsx` caused by a partially-applied edit that left two `return` statements inside a single `if` block — plus a stray `}` — making the module unparseable and crashing the entire React build.

#### Root Cause of the Syntax Error
When `Resources.jsx` was migrated to `<LoadingScreen />`, a failed automated edit:
1. Inserted `if (loading) return <LoadingScreen … />;` on one line.
2. Left the original `return ( … ); }` block below it intact.
3. This produced two `return` statements outside any enclosing block, triggering a Babel parse error.

#### Fix Applied
- Removed the orphaned spinner `return` block from `Resources.jsx`.
- Restored the `resourcesLoading` ternary expression that had been overwritten with a dangling `<LoadingScreen>` tag.
- Cleaned up a stray `}` that was left over from the original `if (loading) { … }` structure.

#### Pages Migrated to `<LoadingScreen />`
All pages now use the shared `src/components/LoadingScreen.jsx` component for page-level loading states:

| Page | Props used |
|------|-----------|
| `Dashboard.jsx` | `text="Loading dashboard..."` |
| `StudentDashboard.jsx` | `text="Loading dashboard..."` |
| `Classes.jsx` | `text="Loading classes..."` |
| `Students.jsx` | `text="Loading students..."` |
| `AttendanceMarking.jsx` | `text="Loading attendance..."` |
| `AttendanceReport.jsx` | `text="Loading attendance report..."` |
| `Resources.jsx` | `text="Loading resources..."` |
| `Timetable.jsx` | `text="Loading timetable..."` |
| `Announcements.jsx` | `text="Loading announcements..."` |
| `JoinClass.jsx` | `fullScreen text="Loading class info..."` |
| `PrivateRoute.jsx` | `fullScreen text="Checking authentication..."` |
| `AdminProfile.jsx` | `text="Loading profile..."` |
| `AcademicUpdates.jsx` | `text="Loading updates..."` |
| `StudentClassmates.jsx` | `text="Loading classmates..."` |
| `StudentHistory.jsx` | `text="Loading history..."` |
| `StudentNotifications.jsx` | `text="Loading notifications..."` |
| `StudentAcademicUpdates.jsx` | `text="Loading updates..."` |

#### `LoadingScreen` Component API
Located at `src/components/LoadingScreen.jsx`.

Props:
- `fullScreen` (bool, default `false`) — if true, covers the entire viewport; otherwise fills its parent container.
- `text` (string, default `"Loading…"`) — message displayed below the spinner.

---

For current details on components, routing, and database schema, please consult the official documents.
