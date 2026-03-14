# API Contract

Base URL: `http://localhost:3000/api`

All endpoints return JSON. Authenticated endpoints require `Authorization: Bearer <token>`.

## Auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/google/mobile` | Exchange Google ID token for JWT | No |
| GET | `/auth/me` | Get current authenticated user | Yes |

### POST `/auth/google/mobile`
```json
// Request
{ "idToken": "string" }

// Response 200
{
  "token": "string",
  "user": { "id": "string", "email": "string", "displayName": "string", "role": "PATIENT | CAREGIVER" }
}
```

## Users

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/users/me` | Get own profile | Yes |

## CareLinks

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/carelinks/invite` | Create invite code | Yes (Caregiver) |
| POST | `/carelinks/accept` | Accept invite code | Yes (Patient) |
| GET | `/carelinks/me` | List linked users | Yes |

### POST `/carelinks/invite`
```json
// Response 201
{ "inviteCode": "string", "expiresAt": "ISO8601" }
```

### POST `/carelinks/accept`
```json
// Request
{ "inviteCode": "string" }

// Response 200
{ "careLink": { "id": "string", "caregiverId": "string", "patientId": "string" } }
```

## Reminders

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/patients/:patientId/reminders` | List reminders | Yes |
| POST | `/patients/:patientId/reminders` | Create reminder | Yes |
| PATCH | `/reminders/:id` | Update reminder | Yes |
| POST | `/reminders/:id/actions` | Log action (done/snooze/dismiss) | Yes |

### POST `/patients/:patientId/reminders`
```json
// Request
{
  "title": "string",
  "description": "string?",
  "category": "MEDICATION | MEAL | EXERCISE | HYGIENE | APPOINTMENT | SOCIAL | OTHER",
  "scheduledAt": "ISO8601",
  "recurrence": "string?"
}

// Response 201
{ "reminder": { "id": "string", "title": "string", ... } }
```

### POST `/reminders/:id/actions`
```json
// Request
{ "action": "DONE | SNOOZED | DISMISSED" }
```

## Checklists

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/patients/:patientId/checklists/templates` | List templates | Yes |
| POST | `/patients/:patientId/checklists/templates` | Create template | Yes |
| POST | `/patients/:patientId/checklists/runs` | Start a run | Yes |
| PATCH | `/checklists/runs/:id` | Update run progress | Yes |

## Games

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/patients/:patientId/game-sessions` | Log game session | Yes |

## Events (Analytics)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/events/batch` | Submit batch of telemetry events | Yes |

## Progress

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/patients/:patientId/progress/weekly` | Weekly summary | Yes |

## Sync

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/sync/bootstrap` | Full initial sync payload | Yes |
| GET | `/sync/changes?since=ISO8601` | Incremental changes | Yes |

## Error Format

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 500 | Internal server error |
