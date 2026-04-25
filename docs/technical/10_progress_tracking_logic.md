# 10 — Progress Tracking Logic

---

## 1. Core Design Principle: Derived Metrics

**Progress is not stored as primary truth. It is derived on demand from raw behavioral records.**

The three primary sources for all progress computation are:
- `ReminderEvent` — records every reminder action (Done, Snoozed, Skipped)
- `ChecklistRun` — records every checklist execution session
- `GameSession` — records every game session

No weekly summary table exists. No streak value is stored in the database. Every metric is computed at query time by the Progress module service from these raw records.

### Why this design is correct

1. **Accuracy:** If a record is updated or a new past record is added, the computed metric immediately reflects it. There is no stale cached aggregate to invalidate.
2. **Simplicity:** The data model has no summary refresh jobs, invalidation queues, or consistency maintenance concerns.
3. **Trustworthiness:** The thesis can cite specific raw records as the source of evidence, not computed summaries that might diverge from the original data.
4. **Flexibility:** New metric types can be added to the progress service without requiring schema migrations or backfill jobs.

The trade-off is that some progress queries require joins and aggregations that are more complex than a simple table lookup. For the data volume expected in a thesis research deployment, this cost is negligible.

---

## 2. Progress API Endpoints

The Progress module exposes the following endpoints, all scoped to `/api/patients/:patientId/progress/`:

| Endpoint | Response Shape | Description |
|---|---|---|
| `GET /overview` | `ProgressOverviewResponse` | Streaks, comparison deltas, priority/guided metrics |
| `GET /weekly` | `WeeklyProgressResponse` | Simple weekly reminder/checklist/game totals |
| `GET /charts` | `ProgressChartsResponse` | Time-series data for charts (7 or 30 days) |
| `GET /categories` | `ProgressCategoriesResponse` | Metrics broken down by reminder/checklist category |
| `GET /checklists` | `ProgressChecklistTrackingResponse` | This week / last week / this month / last month |
| `GET /streaks` | `ProgressStreaksResponse` | All streak types |
| `GET /priority-breakdown` | `ProgressPriorityBreakdownResponse` | Adherence by normal/high/critical priority |
| `GET /games/:gameType` | `GameProgressSummary` | Per-game type performance summary |
| `GET /escalation-alerts` | Alerts array | Recent high/critical skips |

---

## 3. Reminder Adherence Logic

### 3.1 What is measured

Reminder adherence answers: "When a reminder fires, does the patient act on it?"

The source of truth is the `ReminderEvent` table. Each row represents one action taken by a patient on one reminder occurrence.

### 3.2 Adherence rate computation

```
adherence_rate = done_count / (done_count + snoozed_count + skipped_count)
```

**Period filtering:** All adherence metrics are computed within a time window (last 7 days, last 30 days). The window is determined by the `scheduledFor` field on `ReminderEvent`, not by `actedAt`, to correctly attribute events to their scheduled period.

### 3.3 Priority-aware breakdown

The `priority-breakdown` endpoint groups ReminderEvents by the parent Reminder's `priority` field. This produces three separate adherence metrics: for `normal`, `high`, and `critical` priority reminders.

Why priority-aware metrics matter:
- Critical reminders (e.g., essential medication) may have very different adherence from normal reminders.
- Caregivers need to see whether high-stakes reminders are being acted on consistently.
- Escalation alerts are triggered specifically by skipped `critical` or `high` priority reminders.

### 3.4 Trend delta

The `trendDelta` field on `PriorityBreakdownItem` compares the current period's completion rate to the equivalent previous period (e.g., this week vs. last week). A positive delta indicates improvement; negative indicates regression.

```
trendDelta = current_period_completionRate - previous_period_completionRate
```

### 3.5 Missed reminders

A reminder occurrence is considered "missed" when it was scheduled but no corresponding `ReminderEvent` exists within a reasonable window after `scheduledFor`. The system detects this by comparing expected occurrences (derived from the reminder's schedule) with actual ReminderEvent records.

---

## 4. Checklist Completion Logic

### 4.1 What is measured

Checklist completion tracks: "When a patient starts a routine, do they complete it?"

Source: `ChecklistRun` records with `status = COMPLETED`, `ABANDONED`, or `IN_PROGRESS`.

### 4.2 Completion rate

```
completion_rate = COMPLETED_runs / (COMPLETED_runs + ABANDONED_runs)
```

IN_PROGRESS runs are excluded from rate computation but counted separately as "active runs."

### 4.3 Guided task metrics

`GuidedTaskMetrics` (from `ProgressOverviewResponse`) captures:
- `started` — total runs created
- `completed` — runs with status COMPLETED
- `abandoned` — runs with status ABANDONED
- `completionRate` — `completed / (completed + abandoned)`

This is specifically for checklist runs triggered from the guided reminder flow (`startedFrom = 'reminder_prompt'`), distinguishing routine-adherence-driven checklist use from voluntary checklist use.

### 4.4 Period breakdowns

The `checklists` endpoint returns four period views:
- This week (current calendar week)
- Last week
- This month (current calendar month)
- Last month

Each includes total runs, completed runs, completion rate, and a list of individual run details.

---

## 5. Game Engagement Logic

### 5.1 What is measured

Game engagement tracks: "Is the patient playing games? Are their scores improving?"

Source: `GameSession` records for the specific patient.

### 5.2 Per-game type summary

The `GET /progress/games/:gameType` endpoint returns a `GameProgressSummary` for a specific game type:
- `sessionsPlayed` — total sessions
- `bestScore` — highest score ever
- `latestScore` — most recent session score
- `averageScore` — mean across all sessions
- `highestTierEver` — highest difficulty tier reached
- `lastPlayedAt` — timestamp of most recent session
- `scoreSeries` — chronological score data for charting
- `tierSeries` — chronological tier data for charting
- `comparison.deltaVsPreviousSession` — last score minus second-to-last score
- `comparison.deltaVsBest` — last score minus best score

### 5.3 Game types

Currently implemented: `safe_path`, `routine_sequence`.

Chart endpoints separate game-specific series: `safePathScoreSeries`, `safePathTierSeries`, `routineSequenceScoreSeries`, `routineSequenceAccuracySeries`.

---

## 6. Streak Logic

### 6.1 What is a streak

A streak is the count of consecutive calendar days on which a positive engagement event occurred.

The `ProgressStreaksResponse` includes six streak types:

| Streak Type | Condition |
|---|---|
| `reminders` | At least one `ReminderEvent` with `eventType = DONE` |
| `checklists` | At least one `ChecklistRun` with `status = COMPLETED` |
| `games` | At least one `GameSession` with `completed = true` |
| `general` | At least one positive action of any type |
| `highPriorityReminders` | At least one Done action on a `high` or `critical` reminder |
| `guidedTasks` | At least one completed guided checklist run |

### 6.2 Streak computation

For each streak type, the service:
1. Fetches all relevant events with their dates.
2. Sorts dates descending from today.
3. Counts consecutive calendar days with at least one qualifying event.
4. Stops at the first gap day.

`current` is the count of the current active streak.
`best` is the highest streak ever achieved.
`lastActiveDate` is the most recent date on which the streak-qualifying event occurred.

---

## 7. Caregiver Involvement Indicators

Caregiver involvement is measurable through:

1. **Created content:** Reminders and checklist templates where `createdById` belongs to a caregiver. This is visible in the `reminder_created` event payload with `createdBy: 'caregiver'`.
2. **Progress views:** `progress_viewed` events with `actorRole: 'caregiver'`.
3. **Caregiver action events:** Any caregiver-originated ReminderEvent or ChecklistRun action.

The `caregiverActionsCount` field in the weekly summary aggregates these. This is an indicator of caregiver engagement level, not just patient engagement.

---

## 8. Patient-Friendly vs. Caregiver-Friendly Views

Some progress responses carry a `viewType` field indicating whether the response is formatted for patient or caregiver consumption.

**Patient view:** Emphasises streaks, encouraging framing, simple counts. Avoids clinical or analytical language.

**Caregiver view:** Includes priority breakdowns, escalation alerts, comparison deltas, guided task completion rates. Provides the detail caregivers need to make informed adjustments.

On the mobile frontend, the Progress screen renders differently depending on the authenticated user's role, consuming the same API data but applying different component trees and visual emphasis.

---

## 9. Escalation Alerts

The `escalation-alerts` endpoint returns recent instances of skipped `critical` or `high` priority reminders. These are not push notifications; they are data points surfaced in the caregiver progress view to flag potential concerns.

An escalation is detected when:
- A `ReminderEvent` has `eventType = SKIPPED`
- The parent `Reminder` has `priority = critical` or `priority = high`
- The event occurred within the last 7 days (configurable)

`escalationCount` on the `PriorityBreakdownItem` counts how many of a priority tier's skips triggered this condition.

---

## 10. Current Implementation Status

| Feature | Status |
|---|---|
| Weekly summary | ✓ Implemented |
| Overview (streaks + deltas) | ✓ Implemented |
| Charts (7/30-day series) | ✓ Implemented |
| Category breakdown | ✓ Implemented |
| Checklist tracking (4 periods) | ✓ Implemented |
| Streak computation | ✓ Implemented |
| Priority breakdown | ✓ Implemented |
| Per-game summary | ✓ Implemented |
| Escalation alerts | ✓ Implemented |
| Missed reminder detection | Partial — depends on schedule interpretation logic |
| Progress export / sharing | Planned, not implemented |

---

*Cross-references: [06_data_model.md](06_data_model.md) for entity definitions; [09_event_logging_and_instrumentation.md](09_event_logging_and_instrumentation.md) for the event taxonomy that feeds progress metrics.*
