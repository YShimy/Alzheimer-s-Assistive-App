# 08 — API Contracts

---

## 1. Locked Intended Design

The API contracts act as the strict boundary between the React Native frontend and the Express backend. All requests and responses are strongly typed using TypeScript interfaces shared conceptually across the stack.

### Principles
*   **RESTful Conventions:** Standard HTTP methods (GET, POST, PATCH, DELETE) map to semantic actions.
*   **JSON Only:** All endpoints (except the multipart `media` upload) consume and return `application/json`.
*   **Standardized Errors:** All errors must return a consistent shape: `{ error: { code, message, details? } }`.
*   **Patient-Scoped Routes:** Any action performed on a patient's data must be scoped to `/api/patients/:patientId/...` to ensure the `careLinkGuard` middleware intercepts it.

---

## 2. Current Implementation State

The API contracts are implemented in the current prototype and mapped within `backend/src/app/routes.ts`. Input validation is strictly enforced via `zod` schemas inside the controllers.

### Core API Routes (Implemented)

**Auth & Users**
*   `POST /api/auth/send-otp`
*   `POST /api/auth/verify-otp`
*   `GET /api/users/me`
*   `PATCH /api/users/me` (Used for language preference updates)

**CareLinks**
*   `POST /api/carelinks/invite` (Caregiver generates code)
*   `POST /api/carelinks/accept` (Patient accepts code)
*   `GET /api/carelinks/patients` (Caregiver lists linked patients)

**Reminders (Protected by `careLinkGuard`)**
*   `GET /api/patients/:patientId/reminders`
*   `POST /api/patients/:patientId/reminders`
*   `POST /api/patients/:patientId/reminders/:id/events` (Marks Done/Snooze/Skip)

**Checklists**
*   `GET /api/patients/:patientId/checklists/templates`
*   `POST /api/patients/:patientId/checklists/templates`
*   `POST /api/patients/:patientId/checklists/runs`

**Progress**
*   `GET /api/patients/:patientId/progress/overview`
*   `GET /api/patients/:patientId/progress/weekly`

---

## 3. Known Limitations / Future Work

*   **Incomplete Endpoints:** The `PATCH /api/patients/:patientId/checklists/runs/:id` endpoint for step-by-step progress tracking returns a 501 Not Implemented in some execution paths.
*   **Pagination:** List endpoints (like `GET /reminders` or `GET /contacts`) do not currently support cursor or offset pagination. They return the entire active set. This is acceptable for the prototype's data volume but is a limitation for long-term scalability.
*   **Realtime Sockets:** Contract documentation for the WebSocket layer (`Socket.IO` event payloads) is omitted as the mobile subscription logic is not fully active.

---

*Traceability: Route structures are defined in `backend/src/app/routes.ts`. Payload validation schemas are located in respective controller files (e.g., `backend/src/modules/reminders/reminders.controller.ts`).*
