# Archived Reference: Attendify Project Architecture (Legacy)

> [!NOTE]
> This document (`PROJECT_ARCHITECTURE.md`) is **archived** and represents a legacy snapshot of the system structure.
> For the official, verified, and complete engineering documentation, please refer to:
> - **[Project README](README.md)** (the central index of the documentation suite)
> - **[Core Documentation Suite](docs/)** (comprehensive guides `01_prd.md` through `20_release_certificate.md`)

---

## Historical Documentation Snapshot

*Below is a record of historical notes and system states from earlier stabilization phases. For current implementation details, see the official docs.*

### Historical Notes on Test Suite Auth (Legacy)
* `Backened/tests/` historically included legacy test cases that referenced a deprecated `/api/auth/login` endpoint. The current codebase uses external Google auth and `/api/auth/google-session` for admin login, so those tests were flagged as an unreliable baseline until updated.
* `COOKIE_SECURE=true` in `.env` prevents Python `requests` from sending cookies over plain HTTP; this was noted as expected behavior for local automated integration tests but did not affect browser-based usage.

---

For current details on components, routing, and database schema, please consult the official documents.