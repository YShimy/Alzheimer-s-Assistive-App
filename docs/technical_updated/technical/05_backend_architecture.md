# 05 — Backend Architecture

---

## 1. Locked Intended Design

The backend is a **Node.js / Express 5 Modular Monolith**. It avoids microservices in favor of strong internal module boundaries, making it easier to deploy and maintain for the thesis prototype while preserving the ability to split services later if needed.

### Design Principles
*   **Controller-Service-Repository Pattern:** 
    *   *Controllers* handle HTTP, routing, and Zod validation.
    *   *Services* contain all business logic.
    *   *Repositories* (via Prisma) handle database access.
*   **Shared Middleware:** Security (JWT verification, CareLink authorization) is applied via middleware, preventing controllers from accidentally exposing data.
*   **Centralized Error Handling:** All errors throw an `AppError` and are caught by a global error handler to ensure consistent JSON responses.

---

## 2. Current Implementation State

The architecture is implemented in the `backend/` directory.

### Core Traceability

| Layer / Concern | Implementation Location |
|---|---|
| **Entry Point** | `backend/src/app/server.ts` |
| **Global Routing** | `backend/src/app/routes.ts` |
| **Modules** | `backend/src/modules/` (e.g., `auth`, `carelinks`, `reminders`) |
| **Auth Middleware** | `backend/src/shared/middleware/auth.middleware.ts` |
| **CareLink Guard** | `backend/src/shared/middleware/carelink.middleware.ts` |
| **Error Handling** | `backend/src/shared/middleware/error.middleware.ts` |
| **Schema/DB** | `backend/prisma/schema.prisma` |

### Implemented Middleware Pipeline
The security pipeline is actively enforced on patient-scoped routes. For example, accessing `GET /api/patients/:patientId/reminders` passes through:
1. `authenticate` (Validates JWT)
2. `roleGuard('CAREGIVER')` (Ensures actor is a caregiver)
3. `careLinkGuard('canViewProgress')` (Queries DB to ensure the caregiver has an active link and the correct permission flag for this patient).

---

## 3. Known Limitations / Future Work

*   **File Uploads:** The `media` module relies on `multer` to write files to the local `backend/uploads/` directory. This is not scalable and breaks if the server restarts in a stateless cloud environment. It is planned to be replaced with S3-compatible object storage.
*   **Event Batch Processing:** The `events` module currently inserts `AnalyticsEvent` records synchronously. Under heavy load, this should be offloaded to a background queue (like Redis/BullMQ).
*   **Socket.IO:** The WebSocket server is initialized, but active event emission (e.g., broadcasting `REMINDER_UPDATED` to specific patient rooms) is only partially implemented across the service layer.
