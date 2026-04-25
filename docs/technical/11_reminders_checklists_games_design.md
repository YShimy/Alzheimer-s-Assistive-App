# 11 — Reminders, Checklists, and Games Design

---

## 1. Conceptual Relationship

The three core activity domains — reminders, checklists, and games — are not independent features. They form an integrated support structure for the patient's daily life. Their relationship is:

```
Reminder
  → fires at scheduled time
  → patient acts: Done (simple) or StartNow (guided)
  ↓                    ↓
ReminderEvent      Checklist Run (via linkedChecklistId)
  ↓                    ↓
Progress evidence   Progress evidence

Game Session
  ↓
Progress evidence (engagement, not routine adherence)
```

Understanding this hierarchy is important for the architecture: reminders are the time-based trigger layer; checklists provide the step-by-step execution layer; games are a separate engagement layer that does not interact with reminders or checklists.

---

## 2. Reminders

### 2.1 What a reminder is

A `Reminder` is a recurring or one-time task definition. It specifies:
- What needs to happen (`title`, `category`, optional `notes`)
- When it happens (`scheduledTime`, `daysOfWeek`, `startDate`, `endDate`)
- How important it is (`priority`: normal, high, critical)
- How the patient interacts with it (`reminderType`: simple or guided)
- Whether snoozing is allowed (`allowSnooze`, `snoozeDuration`)

A reminder does not record what happened when it fired. That is the job of `ReminderEvent`.

### 2.2 The simple reminder type

A `simple` reminder is the most common type. The patient sees a notification, opens the app or acts from the notification, and taps Done, Snooze, or Skip. One action creates one `ReminderEvent`. The flow is complete.

Use cases: Take medication, drink water, make a phone call.

### 2.3 The guided reminder type

A `guided` reminder links to a `ChecklistTemplate` via `linkedChecklistId`. When the patient taps "Start Now" on a guided reminder, they are taken into the step-by-step checklist flow. The reminder's `ReminderEvent` is initially created with `eventType = START_NOW`. When the checklist run is completed, a follow-up `ReminderEvent` with `eventType = CHECKLIST_COMPLETED` is created.

This design connects the time-based scheduling layer with the guided execution layer. The reminder's schedule ensures the checklist is triggered at the right time; the checklist provides the structure to actually complete the task.

Use cases: Morning routine, medication preparation, leaving-home checklist.

### 2.4 Reminder action flow

```
Patient receives notification
  ↓
Opens reminder (from notification or app)
  ↓
  [simple] → Taps Done → ReminderEvent(DONE)
  [simple] → Taps Snooze → ReminderEvent(SNOOZED) → new notification scheduled
  [simple] → Taps Skip → ReminderEvent(SKIPPED)
  [guided] → Taps "Start Now" → ReminderEvent(START_NOW) → ChecklistRun starts
  [guided] → Checklist completed → ReminderEvent(CHECKLIST_COMPLETED) + ChecklistRun(COMPLETED)
```

### 2.5 Reminder history and timeline

The full history of all actions on all reminders is queryable through the `ReminderEvent` table. This creates an immutable timeline of patient behavior that the Progress module uses for adherence metrics, and which the caregiver can inspect for the patient's specific reminders.

---

## 3. Checklists

### 3.1 Template vs. Run

The distinction between `ChecklistTemplate` and `ChecklistRun` is fundamental:

| Concept | ChecklistTemplate | ChecklistRun |
|---|---|---|
| What it is | The routine definition | One actual execution of that routine |
| Who creates it | Patient or caregiver | System (when patient starts) |
| How many | One per routine | Many per template, over time |
| What it stores | Step definitions, category, title | Completion state, timestamps, duration |
| When it changes | When caregiver edits the routine | Never; each run is a snapshot |

If a caregiver edits a template (adds a step, changes wording), existing runs are not affected. Future runs will reflect the updated template. This preserves the historical record of what the patient actually did.

### 3.2 Step structure

Each step in a template is a JSON object:
```json
{
  "id": "step_1",
  "label": "Wash face",
  "order": 1,
  "hint": "Use warm water",
  "mediaId": "uuid-of-optional-image"
}
```

The `mediaId` field is optional. When present, the mobile client fetches the MediaAsset and displays the image or video alongside the step label. This is particularly useful for patients who benefit from visual cues.

### 3.3 Checklist run lifecycle

```
Patient starts checklist → ChecklistRun created (status: IN_PROGRESS)
  ↓
Patient completes steps one by one
  ↓ (all steps done)
ChecklistRun updated (status: COMPLETED, completedAt set)
  ↓
  OR
  ↓ (patient exits without finishing)
ChecklistRun updated (status: ABANDONED, abandonedAt set)
```

### 3.4 `startedFrom` attribution

The `startedFrom` field on `ChecklistRun` captures how the patient entered the checklist:
- `'reminder_prompt'` — from a guided reminder "Start Now" action
- `'home'` — from the home screen quick-access checklist card
- `'checklist_list'` — from the checklist list screen

This attribution is useful for understanding which entry paths lead to higher completion rates.

### 3.5 Guided checklists and the reminder link

When a checklist is linked to a reminder (`reminderType = guided`), the expected flow is:
1. Reminder fires at scheduled time.
2. Patient taps "Start Now" on the reminder.
3. App creates a `ChecklistRun` with `startedFrom = 'reminder_prompt'`.
4. Patient completes the run.
5. Both the checklist run and the reminder event are updated.

If the patient completes the checklist from the checklist list directly (without the reminder triggering it), the run still counts toward checklist completion metrics, but is not credited as a reminder action.

---

## 4. Games

### 4.1 Role of games in the app

Games are not a primary support mechanism. They are:
- An optional enrichment for patients who enjoy them.
- A light cognitive engagement tool (memory, sequencing) that aligns with the supportive philosophy of the app.
- A source of engagement evidence for the thesis evaluation.

Games are explicitly **not** diagnostic tools. Their scores do not indicate clinical cognitive state. The app makes no such claim.

### 4.2 Implemented games

**Safe Path Memory Game:**
A spatial memory game where patients navigate a path from memory. Difficulty is tiered. Score reflects how accurately the path is recreated. Session data includes `score`, `tier`, `durationSeconds`.

**Routine Sequence Game:**
A sequencing game where patients arrange daily routine steps in the correct order. Score reflects accuracy. Session data includes `score`, accuracy metrics in `metadata`.

### 4.3 Backend role in games

The backend is passive: it receives and stores the completed session summary. It does not drive game logic, validate moves, or manage game state. All game logic runs on the mobile frontend.

On session completion, the mobile app posts to `POST /api/games/sessions`. The backend stores the session and makes it available for progress queries.

### 4.4 Game progress metrics

The progress service computes game-specific summaries:
- Score trend (is the patient improving over time?)
- Tier progression (is the patient attempting harder levels?)
- Session frequency (how often is the patient engaging?)
- Comparison to personal best

These metrics are available in the `GET /progress/games/:gameType` endpoint.

---

## 5. How These Features Support Daily Functioning

The combination of reminders, checklists, and games creates a layered daily support structure:

| Layer | Mechanism | Effect |
|---|---|---|
| Time-based anchoring | Reminders fire at scheduled times | Reduces forgetting |
| Guided execution | Checklists walk through complex tasks step by step | Reduces cognitive load on multi-step routines |
| Habitual reinforcement | Recurring reminders and checklists become predictable | Builds reliable routines |
| Caregiver oversight | Caregivers create/edit content and view progress | Remote support without dependency |
| Engagement | Games provide optional cognitive stimulation | Encourages app interaction beyond reminders |
| Evidence | All activities generate measurable records | Thesis evaluation data |

The system is not designed as a generic task manager. It is specifically structured to reduce the burden on patients with early-stage Alzheimer's — by doing the scheduling, sequencing, and tracking on their behalf while keeping their interaction simple.

---

## 6. What the App Does Not Do

To maintain appropriate scope:
- Reminders do not adjust automatically based on past behavior (no adaptive scheduling).
- Checklists do not self-modify based on completion history.
- Games do not adapt difficulty automatically based on cognitive performance trends.
- No AI or machine learning is involved in any part of the current system.

These are potential future directions but are explicitly outside the current scope, both for implementation feasibility and to avoid any implication that the system is making clinical inferences.

---

*Cross-references: [06_data_model.md](06_data_model.md) for entity definitions; [10_progress_tracking_logic.md](10_progress_tracking_logic.md) for how these are aggregated into evidence; [12_notifications_sync_and_local_cache.md](12_notifications_sync_and_local_cache.md) for reminder scheduling mechanics.*
