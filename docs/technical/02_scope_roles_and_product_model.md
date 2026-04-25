# 02 — Scope, Roles, and Product Model

---

## 1. Roles

The application supports exactly two product roles, plus a non-primary admin/test role.

### 1.1 Patient Role

The patient is the individual with early-stage Alzheimer's disease. This role is the primary daily user of the app. All personal content — reminders, checklist templates, checklist runs, game sessions, contacts — is scoped to the patient.

**Core patient capabilities:**
- Authenticate and restore session
- View a "Today" home screen with upcoming reminders and quick actions
- Receive and act on reminders (Done, Snooze, Skip)
- Start and complete checklist runs
- Play cognitive games
- View their own progress summary (streaks, adherence)
- Access their contacts directory
- Switch the app language between English and Arabic at any time

**Design constraints for patients:**
The patient experience is intentionally low-friction and low-cognitive-load. Buttons are large. Actions require as few steps as possible. Wording is calm and supportive. No complex settings or configuration is surfaced to the patient.

### 1.2 Caregiver Role

The caregiver is a family member, professional carer, or trusted person who supports a linked patient remotely. The caregiver's experience is management-oriented, not daily-routine-oriented.

**Core caregiver capabilities:**
- Authenticate and restore session
- Generate an invite code to link with a patient
- Manage linked patients (view their list, manage permissions)
- Create and edit reminders for linked patients
- Create and edit checklist templates for linked patients
- View patient progress summaries (if permission granted)
- View and annotate patient contacts
- Switch the app language between English and Arabic at any time

**Design constraints for caregivers:**
The caregiver experience requires clarity and organisation. The caregiver must be able to see which patient they are managing and what permissions they hold. They must not be able to access patient data outside their linked relationship.

### 1.3 Admin/Test Role

An admin or tester role may exist in the User entity's role enum for controlled development and evaluation scenarios. This role is not a product experience and does not have dedicated UI flows. It must not interfere with patient or caregiver design.

---

## 2. Caregiver-Patient Relationship Model

### 2.1 The CareLink Entity

The relationship between a caregiver and a patient is represented by a **CareLink** record. A CareLink is a first-class domain entity, not simply an association table. It carries:

- **Identity**: unique link ID
- **Participants**: references to both the caregiver user and the patient user
- **Status lifecycle**: `pending → active → revoked`
- **Permissions**: a structured object that explicitly grants or denies specific caregiver capabilities
- **Audit fields**: who initiated the link, when it was created, when it was accepted, when it was revoked

### 2.2 Status Lifecycle

```
Caregiver generates invite code → CareLink created with status PENDING
Patient enters invite code     → CareLink transitions to ACTIVE
Caregiver (or system) revokes  → CareLink transitions to REVOKED
```

A PENDING link is a CareLink with an unaccepted invite code. A REVOKED link is preserved for historical record but grants no access. Only ACTIVE links are operationally effective.

### 2.3 Permission Flags

Each CareLink carries a `permissions` object with explicit boolean flags:

| Permission Flag | Meaning |
|---|---|
| `canCreateReminders` | Caregiver may create new reminders for the patient |
| `canEditReminders` | Caregiver may modify existing reminders |
| `canViewProgress` | Caregiver may access the patient's progress summaries |
| `canCreateChecklists` | Caregiver may create checklist templates for the patient |
| `canEditChecklists` | Caregiver may modify existing checklist templates |
| `canMarkTasksOnBehalf` | Caregiver may mark patient tasks as done (intended, not yet enforced in current implementation) |

**Critical rule:** Permissions are enforced by the backend, not the frontend. The mobile client may use permissions to hide/show UI elements for usability, but the authoritative check always occurs at the API layer.

### 2.4 One Caregiver to Many Patients

The data model explicitly supports a caregiver being linked to multiple patients. Each link is an independent CareLink record. This means:
- A single caregiver user can have multiple ACTIVE care links.
- Each link carries its own permission set independently.
- The caregiver's UI shows a patient list (the Linked Patients screen) and all management is scoped to the selected patient.

### 2.5 Patient Scoping of Caregiver Actions

All caregiver actions that affect patient data are scoped through the `patientId` parameter on the relevant API endpoints. The backend's `careLinkGuard` middleware verifies that:
1. The authenticated user is a caregiver.
2. An ACTIVE CareLink exists between this caregiver and the requested `patientId`.
3. The specific permission required for this operation is granted on that link.

A caregiver cannot access, read, or modify any data belonging to a patient they are not actively linked to.

---

## 3. What "Backend is Source of Truth" Means

This is a foundational design decision. The backend (PostgreSQL via Prisma) holds the definitive state of all persistent data. The mobile client does not have authority over data correctness.

**Implications:**
- When the app restarts or recovers from offline, it fetches from the backend, not from local cache.
- When a caregiver edits a reminder, the patient device must fetch the updated version from the backend. It cannot trust its local copy indefinitely.
- Access control is never computed on the mobile client. Even if the frontend code checks permissions, those checks are for UX only. The backend re-validates every mutating request.
- Local SQLite cache is an optimisation and resilience layer. It holds copies of backend records for fast reads and offline fallback, but is always subordinate to backend truth.

**Why this design:**
- Caregiver and patient operate on different devices. Consistency requires a shared authority.
- Permission checks cannot be trusted to a device the user controls.
- Progress summaries and analytics must be computed from centrally stored records.

---

## 4. How Features Fit Together

The app's features form a coherent domain, not a collection of disconnected tools:

```
Reminder
  ↓ triggers
Patient Action (Done / Snooze / Skip)
  ↓ stored as
ReminderEvent
  ↓ aggregated by
Progress Module

ChecklistTemplate (defined by caregiver)
  ↓ started by patient or linked to reminder
ChecklistRun
  ↓ stores step-by-step completion state
  ↓ aggregated by
Progress Module

GameSession
  ↓ records engagement evidence
  ↓ aggregated by
Progress Module

All of the above
  ↓ emit
AnalyticsEvents (telemetry, evaluation)
```

This design means that reminder adherence, checklist completion behavior, and game engagement are not separate data islands. They are unified under a single patient context and contribute jointly to progress summaries and research evidence.

---

## 5. Caregiver Support is Mandatory

This is a scope constraint, not an optional feature. The application is designed from the ground up to require caregiver support as a first-class concern. This means:

- The auth model distinguishes patient and caregiver roles at the user level.
- The CareLink entity is a core domain entity, not a post-hoc addition.
- Backend endpoints that manage patient content are explicitly designed for caregiver access.
- The caregiver UI is a full, independent experience within the same codebase.
- Progress summaries are explicitly labelled with `viewType` (patient-friendly vs. caregiver-friendly) to ensure appropriate information is shown to each role.

---

*Cross-references: [06_data_model.md](06_data_model.md) for entity-level detail; [14_security_permissions_and_access_control.md](14_security_permissions_and_access_control.md) for enforcement model; [08_api_contracts.md](08_api_contracts.md) for the CareLink API.*
