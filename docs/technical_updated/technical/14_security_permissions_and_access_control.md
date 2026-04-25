# 14 — Security, Permissions, and Access Control

---

## 1. Authentication Model

### 1.1 Current primary: Email + OTP

The primary authentication mechanism is email-based one-time password (OTP):

1. User submits their email address to `POST /api/auth/send-otp`.
2. Backend generates a 6-digit OTP, hashes it (bcrypt), stores it with an expiry timestamp, and sends it to the user's email via SMTP.
3. User submits the OTP to `POST /api/auth/verify-otp`.
4. Backend validates the OTP (hash match, not expired, not already used).
5. On success, backend upserts the User record (creates on first login) and issues a signed JWT.
6. JWT is returned to the mobile client and stored in SecureStore.

Password-based signup (`POST /api/auth/signup`) is also implemented as an alternative for users who prefer persistent passwords.

### 1.2 Originally designed: Google Sign-In

The blueprint and early implementation included a Google Sign-In flow (`POST /api/auth/google/mobile`). The mobile client would obtain a Google ID token via the Expo Google auth libraries and exchange it at the backend for a JWT. This flow is still present in the codebase but is secondary to the current email-OTP primary flow.

### 1.3 JWT session model

The backend issues JWTs with:
- Payload: `{ userId, role, email }`
- Signing key: `JWT_SECRET` environment variable
- Expiry: `JWT_EXPIRES_IN` environment variable (default: `7d`)

The JWT is stateless. The backend does not maintain a server-side session store. Logout is handled on the client by deleting the stored token from SecureStore. There is no token blacklisting in the current implementation.

**Security implication:** If a JWT is compromised before its expiry, it remains valid until it expires. For the research prototype, this is an acceptable trade-off. A production system would implement token blacklisting or use short-lived access tokens with refresh tokens.

### 1.4 Token storage on device

The JWT is stored in `expo-secure-store` on iOS and Android (device-level encrypted storage). On the web build, it falls back to `localStorage`, which is less secure. The web build is used only for development testing, not production patient use.

---

## 2. Backend-Enforced Access Control

### 2.1 Auth middleware

All API routes except the auth endpoints themselves require a valid JWT. The `auth.middleware.ts` middleware:

1. Reads the `Authorization: Bearer <token>` header.
2. Verifies the JWT signature using `JWT_SECRET`.
3. Checks the token expiry.
4. Attaches the decoded user context (`{ id, role, email }`) to `req.user`.
5. Returns 401 if the token is missing, invalid, or expired.

### 2.2 Role guard

The `roleGuard(role)` middleware factory is applied to routes that require a specific role:

```typescript
router.post('/invite', roleGuard('CAREGIVER'), asyncHandler(carelinksController.createInvite));
```

It returns 403 if `req.user.role !== requiredRole`. This prevents patients from accessing caregiver-only endpoints and caregivers from accessing patient-only endpoints.

### 2.3 CareLink guard

The `careLinkGuard` middleware is the primary caregiver access control mechanism. It is applied to all routes under `/api/patients/:patientId/` that a caregiver may call.

It validates:
1. The authenticated user has role `CAREGIVER`.
2. An ACTIVE `CareLink` record exists with `caregiverId = req.user.id` and `patientId = req.params.patientId`.
3. The specific permission flag required for this operation is `true` on that CareLink's permissions object.

If any condition fails, the middleware returns 403 with an error code explaining which condition failed (`NO_ACTIVE_CARE_LINK`, `INSUFFICIENT_PERMISSION`, etc.).

**Critical principle:** The careLinkGuard is the reason a caregiver cannot access arbitrary patient data. Without it, a caregiver who knew a patient's UUID could theoretically call patient-scoped endpoints. The guard prevents this at the middleware layer, before any controller or service logic runs.

### 2.4 Patient self-access

Patients access their own data via endpoints that check `req.user.id === patientId` in the service layer. A patient cannot access another patient's data.

### 2.5 Frontend access control is for UX only

The mobile app hides or shows UI elements based on the authenticated user's role. For example, a patient user does not see the caregiver management tabs. However, this frontend access control is **UX-only**. The backend enforces all security independently. The mobile client must not be trusted as an access control source.

---

## 3. CareLink Permission Model

### 3.1 Permission flags

Each ACTIVE CareLink carries a `permissions` JSON object:

```typescript
interface CareLinkPermissions {
  canCreateReminders: boolean;
  canEditReminders: boolean;
  canViewProgress: boolean;
  canCreateChecklists: boolean;
  canEditChecklists: boolean;
  canMarkTasksOnBehalf: boolean;  // Intended; not yet enforced in all cases
}
```

### 3.2 Enforcement per endpoint

| Operation | Required Permission |
|---|---|
| `POST /patients/:id/reminders` | `canCreateReminders` |
| `PATCH /reminders/:id` | `canEditReminders` |
| `PATCH /reminders/:id/archive` | `canEditReminders` |
| `GET /patients/:id/progress/*` | `canViewProgress` |
| `POST /patients/:id/checklists/templates` | `canCreateChecklists` |
| `PATCH /checklists/templates/:id` | `canEditChecklists` |

### 3.3 Default permission set at invite creation

When a caregiver generates an invite code, the new CareLink is created with this default permission set:

```json
{
  "canCreateReminders": true,
  "canEditReminders": true,
  "canViewProgress": true,
  "canCreateChecklists": true,
  "canEditChecklists": false,
  "canMarkTasksOnBehalf": false
}
```

Permissions can be updated via `PATCH /api/carelinks/:id/permissions` after the link is established.

---

## 4. Archive-Not-Delete Policy

The system follows an archive-rather-than-delete approach for the following entities:
- **Reminder:** `PATCH /reminders/:id/archive` sets `isActive = false`, `archivedAt = now()`. The record is retained.
- **ChecklistTemplate:** Similarly archived, not deleted.

### Why this matters for security and integrity

1. **History preservation:** Archiving retains the record for analytics. A deleted reminder would orphan its `ReminderEvent` history and corrupt adherence metrics.
2. **Caregiver accountability:** If a caregiver archives a patient's reminder, the record of that reminder's existence is preserved, along with `createdById` traceability.
3. **Recovery:** An archived reminder can potentially be restored (not currently implemented but possible with this model).
4. **Data minimisation:** Old contact records and archived content are retained but never surfaced in active views, balancing historical integrity with clean UX.

---

## 5. Media and Contact Privacy

### 5.1 Media access

Currently, uploaded media files are served from a public endpoint (`/uploads/:filename`) without authentication. This means any client with the URL can access the file.

**Risk:** If a media URL is leaked, anyone with it can access the file. This is acceptable for the development/research prototype context but is a known gap for a privacy-conscious production deployment.

**Future direction:** Signed, time-limited URLs and authentication-gated media serving.

### 5.2 Contact data handling

Contact data (names, phone numbers, relationships, caregiver memos) is patient-scoped. Only the patient or their linked caregiver may read or modify contact records. Contact data is not included in analytics event payloads.

---

## 6. Privacy-Aware Event Logging

Event logging (`AnalyticsEvent`) follows these privacy principles:

- **IDs instead of content:** Event payloads store entity IDs (reminderId, checklistId), not content (reminder title, checklist step labels).
- **Categories instead of specifics:** `reminderCategory: "medication"` rather than medication name.
- **No free text from user input:** Note fields, reminder descriptions, and checklist step content never appear in event payloads.
- **Language-as-metadata:** The `language` field is metadata about the user's locale, not about their content.

This approach ensures the telemetry dataset is useful for evaluation while minimising exposure of personal health details.

---

## 7. Data Minimisation Principles

The user model does not currently store:
- Device identifiers
- Location data
- Browsing or navigation history beyond structured screen-name fields in events
- Health metrics or clinical data
- Communication content (no in-app messaging)

These are deliberate exclusions. The application's data footprint is limited to what is necessary for the assistive support and research evaluation functions.

---

*Cross-references: [02_scope_roles_and_product_model.md](02_scope_roles_and_product_model.md) for the permission model design; [05_backend_architecture.md](05_backend_architecture.md) for middleware detail; [09_event_logging_and_instrumentation.md](09_event_logging_and_instrumentation.md) for privacy rules in telemetry.*
