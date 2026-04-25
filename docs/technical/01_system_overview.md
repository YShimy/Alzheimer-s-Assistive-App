# 01 — System Overview

**Cognitive and Memory Support Application for People with Early-Stage Alzheimer's Disease**

---

## 1. Purpose and Context

This application is a mobile-first, person-centred assistive support system designed for individuals living with early-stage Alzheimer's disease. It is developed as a bachelor thesis project in software engineering, with the dual goal of delivering a practically useful product and producing measurable, academically defensible evidence of engagement, usage, and adherence.

The fundamental premise is that early-stage Alzheimer's disease is characterised by manageable but significant cognitive challenges: difficulty tracking daily schedules, forgetting routines, losing track of time, and struggling with multi-step tasks. The app directly addresses these challenges through structured daily support, not through diagnosis or clinical intervention.

---

## 2. What the App Is

The application is a **structured daily support and routine assistance tool**. Its capabilities are:

| Domain | Description |
|---|---|
| Orientation & Today Awareness | Patients see their upcoming reminders, the current date/time context, and a quick-action home view that anchors daily functioning. |
| Reminder Management | Caregivers create and manage time-based reminders for patients. Patients receive and act on them via Done, Snooze, and Skip actions. |
| Step-by-Step Checklists | Patients follow multi-step routine guides (e.g., morning routine, medication preparation). Caregivers define these templates. |
| Cognitive Game Engagement | Patients engage with lightweight brain games (memory, sequencing) for optional cognitive stimulation. |
| Caregiver Collaboration | Caregivers manage patient content remotely, view progress, and stay informed without being physically co-located. |
| Progress Visibility | Both patient and caregiver can view derived usage summaries showing adherence, streaks, and engagement trends. |
| Arabic & English Localization | The full application interface — all screens, labels, navigation, and messages — is available in both English and Arabic with full RTL layout support. |

---

## 3. System Capabilities Summary

- **Authentication**: Email + OTP verification with JWT session management. Legacy Google Sign-In pathway was originally designed but email-based authentication is the current primary implementation.
- **Role separation**: Patient and caregiver users share one codebase but see completely different navigation and feature sets.
- **Backend-authoritative data model**: All persistent state lives in PostgreSQL. The mobile client uses a local SQLite cache for resilience, not as a competing source of truth.
- **Local notification scheduling**: Reminder notifications are scheduled locally on the patient device using Expo Notifications for reliability, even with intermittent connectivity.
- **Caregiver-patient care links**: Caregivers and patients are connected via an invitation-and-acceptance flow. Permissions are stored per-link and enforced by the backend.
- **Event instrumentation**: The app logs structured telemetry events to support usage analysis and thesis evaluation. Events are designed with a consistent envelope, privacy-first principles, and explicit taxonomy.
- **Progress derivation**: Weekly summaries and adherence metrics are computed from raw records (ReminderEvent, ChecklistRun, GameSession) rather than stored as primary truth.
- **Media handling**: Checklist steps and contact photos can have associated media (images, short videos). Media is stored on the backend with public URL references.
- **Contacts/People module**: Patients can import and manage a personal contacts list, with caregivers able to annotate contacts with helpful notes.

---

## 4. What the App Is NOT

It is important to be explicit about scope exclusions, both for product and thesis integrity:

- **Not a medical device.** The application makes no diagnostic or clinical claims. It does not assess cognitive decline, measure clinical outcomes, or provide medical advice.
- **Not a telehealth platform.** There is no video calling, clinical messaging, or integration with healthcare systems.
- **Not a full-featured notification push platform.** Notifications are scheduled locally on the patient device. The backend does not operate a push notification server.
- **Not a medication management system.** While reminders can be categorised as "medication", the app has no medication database, dispensing logic, or clinical safety logic.
- **Not a social or community platform.** The contacts module is a simple personal directory, not a social network.
- **Not a permanent cloud product.** The current deployment is development/research-oriented (local or tunnelled public URL). Production infrastructure deployment is future work.

---

## 5. Target Users

### 5.1 Primary User — Patient

Adults in the early stage of Alzheimer's disease. They use the app daily for routine support. Design constraints for this group:

- Minimal cognitive load: large buttons, plain wording, as few steps as possible per action.
- Calm and supportive tone: no alarmist language, no complex settings.
- Language accessibility: full Arabic support, since this is relevant to the target population in the regional context.
- Reliable reminders: the patient must be able to trust that scheduled reminders will appear.

### 5.2 Secondary User — Caregiver

Family members or professional carers who support a linked patient. They use the app to manage the patient's digital support environment. Design constraints for this group:

- Organised management view: ability to see and manage multiple patients.
- Trustworthy access control: caregiver can only act within their granted permissions.
- Progress visibility: summarised adherence and engagement data.
- Remote management: caregiver and patient do not have to be on the same device or location.

### 5.3 Admin/Test User

A non-primary role used during development and controlled testing. Not a product experience. Must not distort patient/caregiver design.

---

## 6. System Module Overview

| Module | Layer | Description |
|---|---|---|
| Auth | Backend + Mobile | Authentication, token management, session restore |
| Users | Backend + Mobile | User profile, language preference, role metadata |
| CareLinks | Backend + Mobile | Caregiver-patient relationship, permissions, invite flow |
| Reminders | Backend + Mobile | Reminder definitions, patient-side action handling |
| Checklists | Backend + Mobile | Routine templates and per-session checklist runs |
| Games | Backend + Mobile | Brain game sessions, score storage, game-specific logic |
| Events | Backend + Mobile | Telemetry event ingestion, batch submission, taxonomy |
| Progress | Backend + Mobile | Derived adherence metrics, streaks, weekly summaries |
| Sync | Backend + Mobile | Bootstrap sync payload, incremental change retrieval |
| Notifications | Mobile | Local reminder scheduling via expo-notifications |
| Media | Backend + Mobile | File upload, storage, public URL management |
| Contacts | Backend + Mobile | Patient contacts import, caregiver annotation |
| i18n | Mobile | Arabic/English translation, RTL layout management |

---

## 7. Product Rationale

The rationale for building this application as described is grounded in three observations:

**7.1 Gap in accessible Arabic-supporting tools.** Many cognitive support tools in the literature were developed for English-speaking populations. Arabic-speaking patients and their caregivers face an accessibility deficit. This application treats Arabic support as a first-class requirement, not an afterthought.

**7.2 Caregiver exclusion in existing patient-only apps.** Simple reminder apps exist, but few are explicitly designed around a caregiver-patient collaboration model. This application requires caregiver support as a mandatory design element, not an optional extension.

**7.3 Research evidence generation.** A thesis project on assistive technology requires measurable evidence that the system works as designed. The event logging and progress derivation infrastructure is purpose-built to generate that evidence in a structured, privacy-aware way.

---

## 8. Relationship Between Patient Support, Caregiver Support, and Research Evidence

These three concerns reinforce each other:

- Patient-facing features (reminders, checklists, games) generate the raw behavioral data.
- Caregiver-facing features (progress visibility, remote management) depend on the same data and also contribute to it (caregiver actions are recorded as events).
- Research evidence (adherence rates, engagement trends, caregiver involvement metrics) is derived from the combined behavioral record.

This means the system is not just a helpful tool; it is also a research instrument. The architecture is designed so these two roles coexist without compromising either.

---

*Cross-references: [02_scope_roles_and_product_model.md](02_scope_roles_and_product_model.md) for detailed role/permission model; [03_architecture_overview.md](03_architecture_overview.md) for system-level decisions; [09_event_logging_and_instrumentation.md](09_event_logging_and_instrumentation.md) for the instrumentation model.*
