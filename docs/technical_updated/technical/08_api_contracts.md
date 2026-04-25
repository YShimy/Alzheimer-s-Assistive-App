# 08 — API Contracts

---

## 1. Locked Intended Design

The API acts as the strict boundary between the mobile client and the backend. The intended design principles are:

- **JSON-first API design** for most domain endpoints
- **clear patient scoping** for caregiver actions on patient-owned data
- **backend-enforced authorization**, especially through CareLink-aware checks
- **schema-validated input** at the API boundary
- **stable domain separation** by module (auth, carelinks, reminders, checklists, games, progress, sync, media, contacts)

The API contract is therefore both a communication surface and a security boundary.

---

## 2. Current Implementation

The current prototype includes a meaningful API surface, but this file should not be read as a guarantee that every route or payload is final and frozen.

### Route ownership in the current backend

The main route entry point is in:

- `backend/src/app/routes.ts`

Validation and domain behavior are then distributed under:

- `backend/src/modules/*`

In practice, the current implementation includes API areas for:

- authentication and user profile
- caregiver/patient linking
- reminders and reminder actions
- checklist template and run behavior
- games and progress retrieval
- event ingestion or event-related support
- media and contacts, where implemented in the current codebase

### Important reality note

This document describes the **main API shape and intended contract direction**. Before using any individual endpoint description as thesis-final text, it should be cross-checked against the active module/controller implementation.

---

## 3. Representative Current Route Areas

The following route groups are representative of the current system design and current implementation direction.

### Auth and user profile

Typical endpoints include:

- `POST /api/auth/...`
- `GET /api/auth/me`
- `GET /api/users/me`
- `PATCH /api/users/me`

These routes are intended to support identity, session bootstrap, and user settings such as language preference.

### CareLinks / patient scoping

Typical endpoints include:

- caregiver invite / code generation flows
- patient acceptance flows
- linked-patient listing and caregiver-side patient context queries

These routes are important because they define who can act on which patient.

### Reminders

Typical route patterns include:

- `GET /api/patients/:patientId/reminders`
- `POST /api/patients/:patientId/reminders`
- reminder action/event endpoints

Reminder routes should be read together with reminder-action and checklist-linking behavior rather than as isolated CRUD routes.

### Checklists

Typical route patterns include:

- template creation and retrieval
- checklist run creation/update/completion
- patient-scoped checklist access

### Progress

Typical route patterns include:

- overview-style progress endpoints
- weekly or period-based summary endpoints
- patient-scoped progress access

---

## 4. Traceability to Current Code

When validating API behavior, the primary implementation locations are:

- `backend/src/app/routes.ts`
- `backend/src/modules/auth/`
- `backend/src/modules/users/`
- `backend/src/modules/carelinks/`
- `backend/src/modules/reminders/`
- `backend/src/modules/checklists/`
- `backend/src/modules/games/`
- `backend/src/modules/progress/`
- `backend/src/modules/events/`
- `backend/src/modules/media/` and `backend/src/modules/contacts/` where present

Validation rules are typically located in controller-level or module-level validation/schema files, depending on the module structure in the current repository.

---

## 5. Known Gaps / Current Limitations

1. **The API surface is still evolving.** Route names and payload shapes may still change as unfinished modules stabilize.
2. **Some flows are only partially implemented end-to-end.** A route may exist while some downstream behavior, realtime updates, or progress side effects are still incomplete.
3. **WebSocket/event-push behavior should not be assumed from HTTP route documentation alone.** Socket-based or push-style behaviors require separate validation.
4. **Pagination/filtering is not yet a mature concern in every list route.** Current prototype behavior may return active sets directly rather than using fully designed pagination contracts.

---

## 6. Documentation Use Note

This file should be used as a **technical contract map**, not as a substitute for final controller-by-controller verification. For thesis writing, it is most useful when paired with:

- `07_backend_module_spec.md`
- `06_data_model.md`
- `09_event_logging_and_instrumentation.md`
- `10_progress_tracking_logic.md`
