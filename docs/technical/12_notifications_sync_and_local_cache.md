# 12 — Notifications, Sync, and Local Cache

---

## 1. Local Notification Scheduling

### 1.1 Why local scheduling

Patient reminder notifications are scheduled locally on the patient's device using `expo-notifications`, not delivered via a push notification server.

This design decision is intentional and important:

- **Reliability.** A local notification fires regardless of whether the backend is reachable at that moment. Push notifications depend on the network, the push notification server, and the backend being able to trigger them. For a patient who depends on medication reminders, local reliability is a safety concern.
- **No push infrastructure needed.** Running a push notification server (FCM/APNs) requires device token management, token refresh, delivery tracking, and failure handling. This is substantial infrastructure for a thesis project where the core value is in the patient support system, not the delivery mechanism.
- **Simplicity.** The backend stores reminder definitions. The mobile app derives the local notification schedule from those definitions. There is one source of truth for the definition; the notification delivery is a local runtime concern.

The trade-off is that caregiver-initiated changes to reminders require the patient device to sync before the updated notification schedule takes effect. This is handled by the Sync module.

### 1.2 How scheduling works

On the mobile side, the notification layer (`src/infrastructure/notifications/notifications.ts`) provides:

```typescript
notifications.requestPermission()
// → requests OS permission; creates Android notification channel

notifications.scheduleReminder({ id, title, body, scheduledAt })
// → schedules a one-time local notification at scheduledAt
// → if scheduledAt is in the past, fires immediately
// → returns a notification identifier for cancellation

notifications.cancelReminder(notificationId)
// → cancels a single scheduled notification

notifications.cancelAll()
// → cancels all scheduled notifications
```

The patient app is responsible for:
1. Fetching active reminders from the backend on startup (via bootstrap sync).
2. Cancelling all previously scheduled notifications.
3. Scheduling new notifications for upcoming reminder occurrences based on the fetched definitions.

When a reminder is added, edited, or archived, the app must re-fetch and reschedule.

### 1.3 Recurrence handling

The current notification scheduler schedules one notification per reminder occurrence at a time — it does not pre-schedule weeks of recurring notifications. The expectation is that on each app launch, the schedule is refreshed from the latest backend reminder definitions.

**Known limitation:** If the patient does not open the app for multiple days, recurring reminders may not fire on days when the app was not opened and the notification schedule was not refreshed. Full recurrence scheduling (pre-scheduling multiple future occurrences) is a known improvement area.

### 1.4 Android notification channel

For Android, a notification channel (`reminders`) is created with HIGH importance and vibration enabled. This is required by Android 8.0+ for reliable notification delivery.

### 1.5 Foreground notification handling

The app configures `Notifications.setNotificationHandler` to show alerts, play sound, and set badges even when the app is in the foreground. This ensures that reminders are visible even if the patient has the app open.

---

## 2. Sync Architecture

### 2.1 Purpose of sync

The sync layer bridges two realities:
- The **backend is source of truth** for reminder definitions, checklist templates, care links, and user profile.
- The **mobile client needs current data** at startup and when things change.

Sync ensures the mobile client has an up-to-date view of backend truth without fetching everything from scratch on every operation.

### 2.2 Bootstrap sync

**`GET /api/sync/bootstrap`**

This endpoint returns a full initial data payload consumed on app startup:

```json
{
  "user": { ... },
  "careLinks": [ ... ],
  "reminders": [ ... ],
  "checklistTemplates": [ ... ],
  "progressOverview": { "todayPendingCount": 2 },
  "syncCursor": "2026-04-25T09:00:00Z"
}
```

On first launch or after logout+login, the app calls bootstrap to populate its local cache and derive the initial notification schedule. The `syncCursor` timestamp is stored locally for subsequent incremental sync calls.

### 2.3 Incremental sync

**`GET /api/sync/changes?since=<ISO_timestamp>`**

Returns only records that have changed since the given timestamp:

```json
{
  "changedReminders": [ ... ],
  "changedChecklistTemplates": [ ... ],
  "updatedCareLinks": [ ... ],
  "newSyncCursor": "2026-04-25T12:00:00Z"
}
```

The mobile client:
1. Calls `/sync/changes?since=<last_sync_cursor>`.
2. Merges changed records into the local cache.
3. Updates the stored sync cursor to `newSyncCursor`.
4. If reminder definitions changed, cancels and reschedules local notifications.

**When incremental sync is triggered:**
- On app foreground (when the app comes back from background).
- After a caregiver action (patient device is expected to sync soon after).
- Periodically (configurable interval) if the app is open.

### 2.4 Realtime change signaling (designed, partial implementation)

The architecture includes a Socket.IO-based realtime signaling layer. When a caregiver creates or edits a reminder, the backend can emit a socket event to the patient device, prompting it to trigger an incremental sync immediately.

**Current implementation status:** The backend registers Socket.IO and the module exists. The mobile-side socket connection and subscription management are not fully implemented. In the current version, the patient device relies on periodic sync and app-foreground sync rather than push-based change signaling.

---

## 3. Local SQLite Cache

### 3.1 Purpose

The local SQLite database (`cognitive_support_cache.db`) provides:

1. **Fast initial render.** On app launch, cached data can be displayed immediately while the network fetch is in flight. This reduces perceived load time for patients.
2. **Offline resilience.** If the backend is temporarily unavailable, the patient can still see their reminders from the cache.

### 3.2 Scope and limitations

The SQLite cache is intentionally minimal. It does not mirror the full backend schema. It stores:

```sql
-- Reminder copies (JSON blobs)
CREATE TABLE IF NOT EXISTS cached_reminders (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,      -- JSON-serialised Reminder object
  synced_at TEXT NOT NULL  -- ISO timestamp of when this was cached
);

-- Checklist template copies (JSON blobs)
CREATE TABLE IF NOT EXISTS cached_checklists (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  synced_at TEXT NOT NULL
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Key: 'last_sync', Value: ISO timestamp
```

**What is NOT cached:**
- User profile (fetched fresh on login)
- Care links (fetched on login and on demand)
- Progress summaries (always fetched fresh; never cached locally)
- Events (collected in memory, submitted to backend; not cached to SQLite)
- Contacts (fetched on demand)

### 3.3 Cache write pattern

When the app fetches reminders from the backend, it writes each reminder to `cached_reminders`. This is an `INSERT OR REPLACE` operation, so updates from the backend naturally overwrite stale cache entries.

When a reminder is archived on the backend, the app removes it from the local cache on the next sync by processing the `changedReminders` array.

### 3.4 Cache invalidation

The cache does not use time-based expiry. Validity is determined by the sync cursor: if the cache was populated during the current session, it is considered valid for UI display. On the next sync cycle, it is refreshed. There is no background refresh without a sync trigger.

---

## 4. Boundaries: Synced Backend Truth vs. Local Runtime State

| Concern | Owner | Notes |
|---|---|---|
| Reminder definition (title, schedule, priority) | Backend (PostgreSQL) | Synced to local cache |
| Reminder event history (done/snoozed/skipped) | Backend (PostgreSQL) | Not cached locally |
| Local notification schedule | Mobile device | Derived from synced definitions |
| Progress summaries | Backend (PostgreSQL, computed on demand) | Not cached locally |
| JWT token | Mobile device (SecureStore) | Not in SQLite |
| Language preference | Mobile device (SecureStore) | Also persisted on User record in backend |
| Sync cursor | Mobile device (SQLite sync_meta) | Mirrors backend record cursor |
| Game session state (in-progress game) | Mobile device (React state) | Committed to backend on session end |

---

## 5. Known Limitations and Future Work

| Limitation | Description |
|---|---|
| Recurring notification pre-scheduling | Current implementation schedules one notification per reminder at a time. Multi-day recurring pre-scheduling not implemented. |
| Socket.IO realtime | Mobile-side Socket.IO client connection not fully implemented. Push-based sync signals not active. |
| Offline write queue | There is no queue for offline mutations (e.g., reminder actions taken while offline). Actions require connectivity. |
| Cache eviction | SQLite cache grows indefinitely. No eviction strategy for old archived reminder entries. |
| Full sync engine | The blueprint described a `syncEngine.ts`, `syncQueue.ts`, and `syncCursorStore.ts`. Only the cursor storage (via SQLite `sync_meta`) is partially implemented. |

---

*Cross-references: [04_frontend_architecture.md](04_frontend_architecture.md); [11_reminders_checklists_games_design.md](11_reminders_checklists_games_design.md); [17_known_limitations_current_status_and_future_work.md](17_known_limitations_current_status_and_future_work.md).*
