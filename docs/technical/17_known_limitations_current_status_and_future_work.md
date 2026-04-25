# 17 — Known Limitations, Current Status, and Future Work

---

## 1. What This Document Is For

This document provides a rigorous, thesis-grade account of:
- What is **implemented and available in the current prototype**.
- What is **partially implemented** (present in code but incomplete).
- What is **planned but not yet started**.
- The known **architectural limitations** of the current build.

This distinction is mandatory. Claiming complete implementation where partial implementation exists is avoided here to ensure academic and engineering honesty.

---

## 2. Implemented and Available in the Prototype

The following capabilities are implemented and function in the current main flows:

### 2.1 Authentication & Security
- Email + OTP authentication flow (`backend/src/modules/auth`).
- JWT session management with device-level storage via `expo-secure-store`.
- CareLink system: Invite generation, acceptance, and status lifecycle.
- **Middleware Security:** `careLinkGuard` actively enforces permission flags on backend routes (`backend/src/shared/middleware/carelink.middleware.ts`).

### 2.2 Reminders & Checklists
- Reminder CRUD (Create, Read, Update, Archive).
- Priority levels (Normal, High, Critical) and Reminder Types (Simple, Guided).
- Local notification scheduling (`mobile/src/infrastructure/notifications`).
- Checklist Template definition and step creation.
- Checklist Run execution on the patient client.

### 2.3 Progress & Events
- Derived progress metrics (Streaks, Adherence Rates) computed dynamically (`backend/src/modules/progress/progress.service.ts`).
- Event batch ingestion endpoint for telemetry logging.
- Escalation alerts surfaced for missed High/Critical priority tasks.

### 2.4 Localization
- Full Arabic/English translations via `i18next`.
- RTL layout mirroring via React Native's `I18nManager`.
- Locale-appropriate Eastern Arabic numeral formatting.

---

## 3. Partially Implemented Features

These features exist in the codebase but have known functional gaps:

### 3.1 Sync Engine
**State:** The SQLite cache layer stores data, and bootstrap endpoints exist. 
**Gap:** The offline mutation queue (`syncQueue.ts`) is unimplemented. Actions like marking a reminder "Done" require an active internet connection to succeed.

### 3.2 Real-Time Updates (Socket.IO)
**State:** The backend initializes a WebSocket server.
**Gap:** Mobile-side subscriptions are incomplete. The app relies on polling or app-restarts to fetch new caregiver-created reminders.

### 3.3 Multi-Day Notification Recurrence
**State:** Notifications are scheduled locally upon app startup or sync.
**Gap:** Multi-day pre-scheduling is limited. If the app is closed for several days, future occurrences of a recurring reminder may not trigger.

### 3.4 Checklist Run API Coverage
**State:** `ChecklistRun` creation is implemented.
**Gap:** Specific step-by-step update endpoints (e.g., `PATCH /checklists/runs/:id/steps`) return HTTP 501 Not Implemented in some backend routes, causing silent failures on the client during complex flows.

---

## 4. Planned but Not Started

These features were designed in the blueprint but have no current code implementation:

| Feature | Notes |
|---|---|
| **Accessibility Settings UI** | Text size and contrast preferences defined in the User model blueprint are absent from the Prisma schema and UI. |
| **Push Notifications** | Server-side FCM/APNs integration for remote alerts. |
| **Invite Code Expiry** | CareLink invite codes currently remain valid indefinitely. |
| **Data Export** | Exporting progress summaries to PDF for medical review. |

---

## 5. Architectural Limitations & Workarounds

| Limitation | Impact | Current Workaround |
|---|---|---|
| **Local Filesystem Media** | Media uploaded to `backend/uploads/` is lost on server redeployment in stateless clouds. | Acceptable for local dev; requires `ngrok` for remote device testing. |
| **Media URL Fragility** | URLs hardcoded in the DB break if the backend host URL changes. | Admin utility `POST /api/media/restamp-urls` must be run manually. |
| **Stateless JWT** | Compromised tokens remain valid until expiry (7 days). | Acceptable for low-risk prototype; requires token blacklisting in production. |
| **RTL Android Bug** | Layout may not immediately mirror on language change on some Android devices. | User is prompted to restart the app. |

---

## 6. Architectural Strengths

Despite limitations, the prototype successfully demonstrates several rigorous design decisions:
1. **Derived Progress:** Computing metrics from raw `ReminderEvent` records prevents stale data and provides auditable thesis evidence.
2. **Access Control:** The `careLinkGuard` makes unauthorized patient data access structurally impossible at the middleware layer.
3. **Archive-Not-Delete:** Preserving historical `Reminder` records maintains analytics integrity.
4. **First-Class Arabic Support:** Treating RTL and Arabic localization as a core architectural feature rather than a cosmetic add-on successfully serves the target demographic.
