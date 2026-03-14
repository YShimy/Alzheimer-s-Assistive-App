# Event Taxonomy

Events are lightweight telemetry used for thesis evaluation and progress tracking. All events are batched and sent to `POST /events/batch`.

## Event Shape

```typescript
interface AnalyticsEvent {
  id: string;            // UUID, generated client-side
  userId: string;        // UUID
  category: string;      // Event category
  action: string;        // Specific action
  metadata?: object;     // Additional context
  occurredAt: string;    // ISO 8601 timestamp
}
```

## Event Categories

### Onboarding
| Action | Description | Metadata |
|--------|-------------|----------|
| `onboarding.started` | User opened the app for the first time | `{ role }` |
| `onboarding.completed` | User finished setup | `{ role, durationMs }` |

### Caregiver Linking
| Action | Description | Metadata |
|--------|-------------|----------|
| `carelink.invite_created` | Caregiver generated invite code | |
| `carelink.accepted` | Patient accepted invite | `{ caregiverId }` |

### Reminder Adherence
| Action | Description | Metadata |
|--------|-------------|----------|
| `reminder.fired` | Reminder notification shown | `{ reminderId, category }` |
| `reminder.done` | Patient marked reminder done | `{ reminderId, delayMs }` |
| `reminder.snoozed` | Patient snoozed reminder | `{ reminderId }` |
| `reminder.dismissed` | Patient dismissed reminder | `{ reminderId }` |
| `reminder.missed` | Reminder expired with no action | `{ reminderId }` |

### Checklist Completion
| Action | Description | Metadata |
|--------|-------------|----------|
| `checklist.started` | Patient began a checklist | `{ templateId }` |
| `checklist.step_completed` | Patient completed a step | `{ runId, stepIndex }` |
| `checklist.completed` | Patient finished all steps | `{ runId, durationMs }` |
| `checklist.abandoned` | Patient left without finishing | `{ runId, lastStep }` |

### Game Engagement
| Action | Description | Metadata |
|--------|-------------|----------|
| `game.started` | Patient started a game | `{ gameType }` |
| `game.completed` | Patient finished a game | `{ gameType, score, durationMs }` |

### Progress Viewed
| Action | Description | Metadata |
|--------|-------------|----------|
| `progress.viewed` | Caregiver viewed weekly progress | `{ patientId }` |

### Help
| Action | Description | Metadata |
|--------|-------------|----------|
| `help.opened` | User opened help screen | |
| `help.topic_viewed` | User viewed specific help topic | `{ topic }` |

### Errors
| Action | Description | Metadata |
|--------|-------------|----------|
| `error.occurred` | An error happened | `{ code, message, screen }` |
