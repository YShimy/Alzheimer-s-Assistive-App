# 09 — Event Logging and Instrumentation

---

## 1. Locked Intended Design

The event logging system is designed to serve two distinct purposes:
1. **Thesis evaluation evidence:** Generating measurable, structured evidence of how users interact with the app.
2. **Operational observability:** Providing telemetry on error rates, sync failures, and notification problems.

**Key Distinction:** Analytics events (stored in `AnalyticsEvent`) are telemetry. The authoritative business truth about a reminder lives in `ReminderEvent`, and checklist truth lives in `ChecklistRun`.

### Standard Event Envelope
Every event submitted to the backend must share a common structure to support cross-feature queries:
```typescript
interface AnalyticsEvent {
  id: string;                  // UUID
  eventName: string;           // e.g., 'reminder_done'
  occurredAt: string;          // ISO 8601
  actorUserId: string;
  actorRole: 'patient' | 'caregiver' | 'system';
  patientUserId?: string;
  sessionId?: string;
  screenName?: string;
  platform?: 'ios' | 'android' | 'web';
  appVersion?: string;
  language?: string;           // Critical for Arabic usage metrics
  payload?: Record<string, unknown>; // Sanitized JSON
}
```

---

## 2. Current Implementation State

The event logging taxonomy is currently implemented and usable in the present prototype.

*   **Submission Endpoint:** Events are ingested via `POST /api/events/batch` (`backend/src/modules/events/events.controller.ts`).
*   **Database Storage:** Stored directly into PostgreSQL via the Prisma `AnalyticsEvent` model.
*   **Privacy Rules:** Payload serialization explicitly strips PII (like free-text notes or medication names) before transmittal, logging only UUIDs, roles, and action types.

### Available Minimum Event Set
The following events are actively collected to support thesis metrics:
`onboarding_completed`, `caregiver_linked`, `reminder_created`, `reminder_fired`, `reminder_done`, `reminder_snoozed`, `reminder_skipped`, `checklist_started`, `checklist_completed`, `game_started`, `game_completed`, `progress_viewed`.

---

## 3. Known Limitations / Future Work

*   **Mobile Batching Pipeline:** The intended client-side queuing mechanism (accumulating events while offline and flushing them in batches upon reconnection) is only partially implemented. Events generated while completely offline may currently be dropped.
*   **Write Performance:** The backend currently inserts events synchronously into PostgreSQL. In a production scenario, this would be offloaded to an asynchronous message queue (e.g., Redis/Kafka) to prevent database bottlenecking under heavy write loads.

---

*Traceability: Route defined in `backend/src/modules/events/events.routes.ts`, schema in `backend/prisma/schema.prisma` under `AnalyticsEvent`.*
