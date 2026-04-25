# 11 — Reminders, Checklists, and Games Design

---

## 1. Conceptual Relationship

The three activity domains — reminders, checklists, and games — are intentionally related but not equivalent.

- **Reminders** are the time-based trigger layer
- **Checklists** are the guided execution layer for multi-step routines
- **Games** are a separate engagement layer and are not the same as adherence evidence

A useful simplified relationship model is:

```text
Reminder
  → patient action (done / snooze / skip / start now where supported)
  → ReminderEvent recorded
  → optional linked checklist run started/completed
  → contributes to progress evidence

GameSession
  → contributes to engagement/progress evidence
  → does not automatically imply routine adherence
```

This relationship is important because the app is not just a set of isolated screens. The intended model is a support flow from scheduled prompt to guided action to measurable evidence.

---

## 2. Locked Intended Design

### 2.1 Reminders

A `Reminder` is intended to define:

- **what** needs to happen
- **when** it should happen
- **how important** it is
- **how the patient is expected to act on it**
- **whether it is a simple one-step prompt or a guided entry point into a checklist**

The design intentionally separates:

- `Reminder` — the definition
- `ReminderEvent` — the history of actual actions and outcomes

### 2.2 Checklists

Checklists are intended to support routines that are too complex to be represented by a single reminder action. The design distinguishes:

- `ChecklistTemplate` — reusable routine definition
- `ChecklistRun` — one actual patient execution instance

### 2.3 Games

Games are intended as **light cognitive engagement** and should be interpreted differently from reminders/checklists. They may contribute to progress views, but they are not direct proxies for daily-task adherence.

---

## 3. Current Implementation

### 3.1 Reminder behavior

The current prototype supports core reminder concepts and action history, but the exact reminder model should still be read alongside current backend/module implementation.

In the intended-and-partially-implemented model:

- simple reminders are handled directly through reminder actions
- guided reminders can connect to a checklist flow
- reminder actions are recorded as reminder history/evidence

This core flow is present in the project design and is reflected in current implementation work, but the phrase “the flow is complete” should not be interpreted as meaning every notification, deep link, checklist linkage path, and progress side effect is already perfectly finalized.

### 3.2 Checklist behavior

The current project structure supports the template/run distinction and patient-facing step-by-step execution model. Checklist logic is one of the main ways the system turns reminders into practical support for multi-step tasks.

### 3.3 Games behavior

The current prototype includes lightweight game support and records game-related data for progress/engagement purposes. These game flows should still be treated as evolving product features rather than as final clinically validated modules.

---

## 4. Traceability to Current Code

The main implementation locations to verify this relationship are:

- reminder domain logic: `backend/src/modules/reminders/`
- checklist domain logic: `backend/src/modules/checklists/`
- game domain logic: `backend/src/modules/games/`
- progress aggregation: `backend/src/modules/progress/`
- patient-facing and caregiver-facing client flows under `mobile/app/` and `mobile/src/features/`

When documenting a specific reminder or checklist behavior for thesis use, it should be checked against these code locations rather than relying only on this conceptual file.

---

## 5. Known Gaps / Current Limitations

1. **Reminder-to-checklist linkage should be treated as an evolving integration area.** The intended design is clear, but all edge cases and side effects may not yet be equally mature.
2. **Notification action behavior and deep linking should not be assumed fully identical across all environments.** Prototype and device/runtime differences may still exist.
3. **Game maturity differs from reminder/checklist maturity.** Games may be implemented enough for engagement/progress recording without being as operationally central as reminders and checklists.
4. **Progress interpretation depends on implementation completeness.** Some reminder/checklist/game interactions are designed to feed progress, but not every intended derived metric may yet be fully present.

---

## 6. Documentation Use Note

This file is best read together with:

- `06_data_model.md`
- `09_event_logging_and_instrumentation.md`
- `10_progress_tracking_logic.md`
- `12_notifications_sync_and_local_cache.md`

Those files explain how the conceptual relationship here becomes recorded evidence, notification behavior, and summary/progress logic.
