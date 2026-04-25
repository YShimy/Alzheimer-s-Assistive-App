# 07 — Backend Module Spec

---

## 1. Locked Intended Design

The backend is composed of discrete modules. Each module encapsulates a single domain concern and follows the controller/service/repository pattern. This structural boundary is essential for the academic defensibility of the thesis, proving that the system is maintainable and extensible.

### Modular Boundaries

| Module | Core Responsibility |
|---|---|
| `auth` | Identity, OTP generation, JWT issuance |
| `users` | Profile management, language preference |
| `carelinks` | Edge relationships and permissions between Patient and Caregiver |
| `reminders` | Schedule definitions and ReminderEvent logging |
| `checklists` | Template definitions and ChecklistRun execution |
| `games` | Passive recording of GameSession scores |
| `progress` | Dynamic derivation of streaks, rates, and alerts |
| `events` | Batch ingestion of AnalyticsEvent telemetry |
| `media` | File uploads and URL public resolution |
| `contacts` | Patient directory with caregiver memos and photos |

---

## 2. Current Implementation State

The module specification is currently implemented in `backend/src/modules/`. Each module typically contains:
*   `*.controller.ts` (HTTP request handling, Zod validation)
*   `*.service.ts` (Business logic)
*   `*.routes.ts` (Express router definitions)

### Traceability Example: Reminders Module
*   **Path:** `backend/src/modules/reminders/`
*   **Routing:** Registered in `backend/src/app/routes.ts` under `/api/patients/:patientId/reminders` and protected by `careLinkGuard`.
*   **Database:** Accesses the `Reminder` and `ReminderEvent` Prisma models.

### Traceability Example: Progress Module
*   **Path:** `backend/src/modules/progress/`
*   **Service:** `progress.service.ts` computes the `WeeklyProgressResponse` purely from raw `ReminderEvent` and `ChecklistRun` data, rather than querying a cached summary table.

---

## 3. Known Limitations / Future Work

*   **Service Coupling:** Currently, some services query other models directly via Prisma rather than calling a neighboring service (e.g., `ProgressService` querying `ReminderEvent` directly). In a strict microservice design, this would be an anti-pattern, but it is acceptable in the current Modular Monolith scope.
*   **Sync Module Gap:** The `sync` module intended to handle delta comparisons and offline mutation resolution is only partially implemented as a stub.
