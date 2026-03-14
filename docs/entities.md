# Domain Entities

## User

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| googleId | string | From Google Sign-In |
| email | string | Unique |
| displayName | string | |
| role | UserRole | PATIENT or CAREGIVER |
| createdAt | DateTime | |
| updatedAt | DateTime | |

## CareLink

Links a caregiver to a patient.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| caregiverId | UUID | FK → User |
| patientId | UUID | FK → User |
| inviteCode | string | One-time use |
| status | string | PENDING, ACTIVE, REVOKED |
| createdAt | DateTime | |

## Reminder

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| patientId | UUID | FK → User |
| createdById | UUID | FK → User (patient or caregiver) |
| title | string | |
| description | string? | Optional |
| category | ReminderCategory | MEDICATION, MEAL, EXERCISE, etc. |
| scheduledAt | DateTime | |
| recurrence | string? | RRULE or simple pattern |
| isActive | boolean | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

## ReminderEvent

Logs what happened with a reminder occurrence.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| reminderId | UUID | FK → Reminder |
| action | ReminderAction | DONE, SNOOZED, DISMISSED |
| occurredAt | DateTime | |

## ChecklistTemplate

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| patientId | UUID | FK → User |
| createdById | UUID | FK → User |
| title | string | e.g. "Morning Routine" |
| steps | JSON | Array of step objects |
| createdAt | DateTime | |

## ChecklistRun

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| templateId | UUID | FK → ChecklistTemplate |
| patientId | UUID | FK → User |
| status | ChecklistRunStatus | NOT_STARTED, IN_PROGRESS, COMPLETED, ABANDONED |
| progress | JSON | Step completion state |
| startedAt | DateTime? | |
| completedAt | DateTime? | |

## GameSession

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| patientId | UUID | FK → User |
| gameType | string | e.g. "memory_match", "word_recall" |
| score | int? | |
| durationMs | int | |
| metadata | JSON? | Extra game-specific data |
| playedAt | DateTime | |

## Enums

### UserRole
`PATIENT` | `CAREGIVER`

### ReminderAction
`DONE` | `SNOOZED` | `DISMISSED`

### ReminderCategory
`MEDICATION` | `MEAL` | `EXERCISE` | `HYGIENE` | `APPOINTMENT` | `SOCIAL` | `OTHER`

### ChecklistRunStatus
`NOT_STARTED` | `IN_PROGRESS` | `COMPLETED` | `ABANDONED`
