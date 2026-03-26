Cognitive and Memory Support Application for People with Early-Stage Alzheimer’s Disease
Detailed App Design, Architecture, Features, Data Model, Implementation Blueprint,
Event Logging / Instrumentation, and Backend Module Specification

Prepared for: Seif

====================================================================
1. PRODUCT DESIGN VISION AND OVERALL APP DESCRIPTION
====================================================================

The application is a mobile-first, person-centered assistive support system designed for people with early-stage Alzheimer’s disease. Its purpose is not diagnosis, treatment, or medical decision-making. Instead, it focuses on improving daily functioning, reducing cognitive load, supporting routines, and enabling caregiver collaboration in a structured, low-friction digital environment.

The app is intentionally designed around daily life support rather than abstract productivity. The core experience is built around simple, meaningful assistance:
- orientation and “today” awareness
- reminders and routine support
- step-by-step checklists
- light cognitive engagement through simple games
- caregiver support and collaboration
- progress visibility and research-friendly evidence

The patient experience must feel calm, supportive, and easy to understand. The caregiver experience must feel organized, actionable, and trustworthy. Both experiences exist inside the same mobile codebase, but they are separated at the routing, feature, and UI flow levels so that each role sees the right information architecture and level of control.

The app is intended to look technically serious and academically defensible. This means:
- the UI should have low cognitive load
- labels should be supportive and plain
- interactions should require as few steps as possible
- large buttons and clear actions should be favored
- reminder actions and checklist completion should become measurable evidence
- caregiver permissions and access rules must be enforced by the backend
- analytics should be deliberate, privacy-aware, and tied to evaluation goals

The app is not designed as a generic “notes + tasks” system. It is a structured support application whose architecture is driven by the realities of the domain:
- daily schedules matter
- routines matter
- caregiver support matters
- adherence and usage evidence matter
- reliability of reminders matters
- backend truth and role-based control matter

The design language should therefore feel:
- calm
- structured
- accessible
- supportive
- modern but restrained
- professional enough for thesis defense and supervisor review

====================================================================
2. CORE USER ROLES AND EXPERIENCE DESIGN
====================================================================

2.1 Patient

The patient role is the primary end-user in terms of daily support. This experience must be simple, calm, and low-friction. The patient side should emphasize:
- today’s context
- upcoming reminders
- quick actions
- step-by-step guidance
- minimal configuration burden
- support rather than complexity

The patient should be able to:
- authenticate and restore session
- view a home/today screen
- view reminders
- act on reminders using simple actions such as done, snooze, skip
- start and complete checklist runs
- view lightweight progress summaries
- access help content
- use light cognitive games later in the roadmap
- effortlessly switch the app language between English and Arabic

2.2 Caregiver

The caregiver role is mandatory in project scope. The caregiver experience is not a duplicate of the patient side. It is more management-oriented and more informational, while still needing to remain clean and understandable.

The caregiver should be able to:
- authenticate and restore session
- link to a patient through CareLink flows
- create and edit reminders for a linked patient
- create and edit checklist templates for a linked patient
- view progress summaries if permission exists
- understand current relationship permissions
- support the patient remotely from another device/account
- effortlessly switch the app language between English and Arabic

2.3 Admin / Tester

An admin/tester role may exist for implementation and controlled testing, but it is not a primary product experience. It should not distort the patient/caregiver design.

====================================================================
3. APP FEATURE SET
====================================================================

3.1 Orientation / Today View

The today view is the patient’s anchor screen. It should help answer:
- What should I do next?
- What is scheduled today?
- What is pending right now?
- What is the quickest helpful action I can take?

The today view should include:
- current date/time context
- next reminder or next few reminders
- today’s pending reminder count
- shortcut into checklist or reminder actions
- simple progress glimpse rather than dense analytics

3.2 Reminders and Routines

Reminders are a primary value engine of the app. They support recurring and one-off tasks such as:
- medication
- appointments
- hydration
- meals
- calls
- general tasks
- routine support via linked checklist templates

Reminder support includes:
- reminder creation
- reminder editing
- reminder archival
- reminder fetching by patient context
- patient-side actions
- domain history via ReminderEvent
- local scheduling on the patient device for reliability

3.3 Step-by-Step Checklists

Checklists are a second major support feature after reminders. They are used for routines such as:
- morning routine
- leaving home routine
- evening routine
- medication preparation routine

The model distinguishes:
- ChecklistTemplate = reusable routine definition
- ChecklistRun = one actual execution session

This distinction is essential because the system needs to know not only that a routine exists, but how and when it was used.

3.4 Light Cognitive Engagement

The app can include lightweight brain games. These are not diagnostic and should not be treated as medical instruments. Their role is engagement support and optional routine enrichment.

Game support should stay lightweight:
- store session metadata
- record start/end/duration/score if applicable
- avoid building a complex game backend

3.5 Caregiver Support

Caregiver support is mandatory. This includes:
- caregiver invitation and linking
- role-aware access control
- permissions over reminders, checklists, and progress
- remote management of reminder/checklist definitions
- visibility into summary views if permitted

3.6 Progress Tracking and Research-Friendly Analytics

The app must provide basic progress tracking and light analytics. This is not decorative. It is central to thesis evidence. The system therefore needs:
- reminder adherence metrics
- checklist completion behavior
- game engagement summaries
- caregiver involvement indicators
- event logging that is structured and privacy-aware

3.7 Full Internationalization (i18n) & Arabic Support

All features in both the Patient and Caregiver roles are comprehensively built to dynamically support localizations.
- Right-to-Left (RTL) Layouts: The underlying UI shifts perfectly from LTR to RTL when Arabic is active.
- Translated Pages: ALL Application pages, including Home, Dashboard, Checklists, Reminders, Progress, Caregiver sub-routes natively contain Arabic translations via the i18next translation hooks framework.

====================================================================
4. HIGH-LEVEL SYSTEM ARCHITECTURE
====================================================================

The architecture is built around the following locked decisions:
- Expo mobile app
- one codebase for Android and iPhone
- separate patient and caregiver experiences in the same app
- custom Node.js / TypeScript backend
- backend as source of truth
- local mobile cache for resilience and performance
- local reminder scheduling on patient device for reliability
- centralized backend storage for analytics and evaluation data
- PostgreSQL + Prisma branch selected for the implementation direction

4.1 Why Backend as Source of Truth

The backend must be source of truth because:
- caregiver and patient may operate on different devices
- access control must be enforced centrally
- permissions must be checked centrally
- progress summaries must be derived from shared records
- analytics must be centralized for research evidence
- reminder definition consistency must be maintained across devices

4.2 Why Local Mobile Cache Exists

The local cache exists for:
- faster UI reads
- startup resilience
- temporary offline tolerance
- local reminder scheduling coordination
- event buffering if needed

The local cache does not replace backend truth.

4.3 Why Local Reminder Scheduling Happens on the Patient Device

Reminder reliability matters more than fancy remote push behavior. The reminder definition originates from the backend, but actual runtime scheduling should occur on the patient device because:
- local delivery is more reliable for recurring reminders
- it reduces backend coupling to runtime notification state
- it keeps the mobile product usable even with intermittent connectivity

====================================================================
5. IMPLEMENTATION BLUEPRINT
====================================================================

This implementation blueprint turns the architecture into something buildable. It has four major parts:
- Expo app folder structure
- backend folder structure
- build order
- final field-by-field entity spec

It is intended to be implementation-ready rather than conceptual only.

------------------------------------------------------------
5.1 Expo App Folder Structure
------------------------------------------------------------

Goal of the mobile structure:
The Expo app should be organized by feature rather than only by file type. This makes it easier to:
- scale the codebase
- keep patient and caregiver experiences separate
- place business logic outside screen files
- connect cache, sync, notifications, and events correctly

Recommended Expo structure:

mobile/
  app/
    (auth)/
      login.tsx
      onboarding-language.tsx
      onboarding-role-setup.tsx
      onboarding-caregiver-link.tsx
      onboarding-first-reminder.tsx
    (patient)/
      home.tsx
      reminders/
        index.tsx
        [id].tsx
      checklist/
        index.tsx
        run/[runId].tsx
      games/
        index.tsx
        [gameType].tsx
      progress/
        index.tsx
      help/
        index.tsx
    (caregiver)/
      home.tsx
      patients/
        [patientId].tsx
      reminders/
        index.tsx
        create.tsx
        [id].tsx
      checklists/
        index.tsx
        create.tsx
        [id].tsx
      progress/
        index.tsx
      carelinks/
        index.tsx
        [careLinkId].tsx
    _layout.tsx
    index.tsx

  src/
    features/
      auth/
        components/
        screens/
        hooks/
        services/
        validators/
        types.ts
      users/
        services/
        hooks/
        types.ts
      carelinks/
        components/
        hooks/
        services/
        validators/
        types.ts
      reminders/
        components/
        hooks/
        services/
        validators/
        mappers/
        reminderScheduler.ts
        types.ts
      checklists/
        components/
        hooks/
        services/
        validators/
        mappers/
        types.ts
      games/
        components/
        hooks/
        services/
        types.ts
      progress/
        components/
        hooks/
        services/
        mappers/
        types.ts
      help/
        components/
        services/
        types.ts
    shared/
      components/
        Button/
        Card/
        EmptyState/
        ErrorState/
        Header/
        LargeActionButton/
        Loading/
        SectionTitle/
      hooks/
        useAuth.ts
        useDebounce.ts
        useNetworkStatus.ts
      constants/
        routes.ts
        colors.ts
        spacing.ts
        typography.ts
        roles.ts
        reminderCategories.ts
        eventNames.ts
      utils/
        date.ts
        time.ts
        formatting.ts
        validation.ts
      types/
        common.ts
        api.ts
      i18n/
        locales/
          en.json
          ar.json
        index.ts
    infrastructure/
      api/
        client.ts
        endpoints.ts
        authTokenStore.ts
      storage/
        sqlite/
          db.ts
          migrations.ts
          tables.ts
        secure/
          secureStore.ts
      sync/
        syncEngine.ts
        syncQueue.ts
        syncCursorStore.ts
      notifications/
        notifications.ts
        permission.ts
        scheduler.ts
      events/
        eventLogger.ts
        eventBatchSender.ts
        eventQueue.ts
      realtime/
        socket.ts
        subscriptions.ts
    state/
      sessionStore.ts
      appBootstrapStore.ts
    tests/
      unit/
      integration/

Why this structure is good:
- app/ is the routing and navigation layer
- src/features/ owns business logic by feature
- shared/ contains reusable UI and helpers not tied to one feature
- infrastructure/ contains plumbing such as API, storage, sync, notifications, and events
- state/ is reserved for app-level shared state such as session/bootstrap and maybe selected patient in caregiver mode

------------------------------------------------------------
5.2 Backend Folder Structure
------------------------------------------------------------

Goal of the backend structure:
The backend should look like a modular monolith:
- serious
- organized
- not over-engineered
- easy to defend academically

Recommended backend structure:

backend/
  src/
    app/
      app.ts
      server.ts
      routes.ts
    modules/
      auth/
        controller/
          auth.controller.ts
        service/
          auth.service.ts
        repo/
          auth.repo.ts
        validation/
          auth.schemas.ts
        types/
          auth.types.ts
        router.ts
      users/
        controller/
          users.controller.ts
        service/
          users.service.ts
        repo/
          users.repo.ts
        validation/
          users.schemas.ts
        types/
          users.types.ts
        router.ts
      carelinks/
        controller/
          carelinks.controller.ts
        service/
          carelinks.service.ts
        repo/
          carelinks.repo.ts
        validation/
          carelinks.schemas.ts
        types/
          carelinks.types.ts
        router.ts
      reminders/
        controller/
          reminders.controller.ts
          reminderActions.controller.ts
        service/
          reminders.service.ts
          reminderActions.service.ts
        repo/
          reminders.repo.ts
          reminderEvents.repo.ts
        validation/
          reminders.schemas.ts
          reminderActions.schemas.ts
        types/
          reminders.types.ts
        router.ts
      checklists/
        controller/
          checklistTemplates.controller.ts
          checklistRuns.controller.ts
        service/
          checklistTemplates.service.ts
          checklistRuns.service.ts
        repo/
          checklistTemplates.repo.ts
          checklistRuns.repo.ts
        validation/
          checklistTemplates.schemas.ts
          checklistRuns.schemas.ts
        types/
          checklists.types.ts
        router.ts
      games/
        controller/
          games.controller.ts
        service/
          games.service.ts
        repo/
          games.repo.ts
        validation/
          games.schemas.ts
        types/
          games.types.ts
        router.ts
      events/
        controller/
          events.controller.ts
          clientErrors.controller.ts
        service/
          events.service.ts
        repo/
          events.repo.ts
        validation/
          events.schemas.ts
        types/
          events.types.ts
        router.ts
      progress/
        controller/
          progress.controller.ts
        service/
          progress.service.ts
        repo/
          progress.repo.ts
        validation/
          progress.schemas.ts
        types/
          progress.types.ts
        router.ts
      sync/
        controller/
          sync.controller.ts
        service/
          sync.service.ts
        repo/
          sync.repo.ts
        validation/
          sync.schemas.ts
        types/
          sync.types.ts
        router.ts
    shared/
      middleware/
        auth.middleware.ts
        roleGuard.middleware.ts
        careLinkGuard.middleware.ts
        error.middleware.ts
      errors/
        AppError.ts
        errorCodes.ts
      validation/
        validator.ts
      logger/
        logger.ts
      utils/
        date.ts
        time.ts
        pagination.ts
        permissions.ts
      types/
        common.types.ts
        roles.ts
      config/
        env.ts
      db/
        dbClient.ts
        transaction.ts

Why this backend structure is good:
- each bounded feature lives in its own module
- the app has distinct concerns: auth, care relationships, reminders, checklists, games, events, progress, sync
- controller/service/repo split keeps responsibilities clean
- module-specific validation prevents cross-feature confusion
- shared/ prevents duplication of auth, validation, errors, logging, config, and DB setup

Controller / Service / Repo split:
- Controller receives request and returns response
- Service owns use-case logic, permissions, orchestration, and validation-flow decisions
- Repo talks to database and owns query logic only

------------------------------------------------------------
5.3 Build Order
------------------------------------------------------------

The system should not be built all at once. The order must follow dependency and thesis value.

Build Order Overview:

Phase 1 — Foundation
1. Project setup
2. Auth
3. Users
4. CareLinks

Phase 2 — Core product value
5. Reminders
6. Reminder actions
7. Local notification scheduling
8. Patient Today/Home

Phase 3 — Daily functioning support
9. Checklist templates
10. Checklist runs

Phase 4 — Evaluation backbone
11. Events
12. Progress summaries

Phase 5 — Secondary feature
13. Games

Phase 6 — Experience strengthening
14. Sync / realtime
15. Help / error reporting
16. Polish + testing

Detailed rationale:

1. Project setup
Build first:
- Expo app skeleton
- backend skeleton
- routing
- shared constants
- environment config
- API client
- secure token storage
- database connection layer
- error handling foundation

Why first:
Everything else depends on this.

2. Auth
Build:
- Google sign-in mobile flow
- backend token exchange
- session storage
- /auth/google/mobile
- /auth/me
- logout

Why next:
No real caregiver/patient flow can work before identity exists.

3. Users
Build:
- basic user profile
- role
- language
- accessibility settings
- /users/me

Why next:
The app needs user context immediately after auth.

4. CareLinks
Build:
- caregiver invitation
- accept link
- store permissions
- validate caregiver access
- /carelinks/*

Why next:
Caregiver support is mandatory in scope.

5. Reminders
Build:
- create reminder
- edit reminder
- archive reminder
- fetch reminders
- caregiver-created vs patient-created tracking

Why next:
This is the main value engine of the app.

6. Reminder actions
Build:
- done
- snooze
- skip
- reminder event history
- /reminders/:id/actions

Why next:
Without actions, reminders are not measurable and not useful for evaluation.

7. Local notification scheduling
Build:
- notification permissions
- schedule reminder locally
- cancel old schedules
- reschedule after reminder update

Why next:
This is what makes patient reminders reliable.

8. Patient Today/Home
Build:
- orientation home
- next reminder
- today summary
- quick navigation

Why next:
Now the app starts feeling like a real patient product.

9. Checklist templates
Build:
- create/edit template
- fetch templates
- caregiver creation support

Why next:
Routines are the second major support feature after reminders.

10. Checklist runs
Build:
- start run
- step progress
- complete run
- abandon run if needed

Why next:
This gives daily functioning support, not just time-based reminders.

11. Events
Build:
- event logging interface in mobile
- /events/batch
- sanitized client error endpoint
- core event names

Why next:
Now there is enough real behavior to instrument meaningfully.

12. Progress summaries
Build:
- weekly summary aggregation
- patient-friendly view
- caregiver-friendly view
- /progress/weekly
- /progress/overview

Why next:
This turns raw records into thesis-usable evidence.

13. Games
Build:
- 1–2 simple games
- session start/end/score metadata
- minimal backend session storage

Why later:
Games matter, but they are not the first core dependency.

14. Sync / realtime
Build:
- bootstrap sync
- incremental sync
- change signaling
- reminder refresh on caregiver updates
- reschedule notifications after sync changes

Why later:
You can build and test core CRUD first, then add sync intelligence.

15. Help / error reporting
Build:
- help screen
- help_opened event
- client error reporting
- recovery states

Why later:
Improves robustness after real flows exist.

16. Polish + testing
Build:
- accessibility review
- empty states
- loading states
- error states
- usability test tasks
- logging verification
- progress correctness checks

Why last:
These are only meaningful after the real feature flows exist.

====================================================================
6. DATA MODEL
====================================================================

The app’s core domain is primarily structured, with some semi-structured nested fields.
Core entities:
- User
- CareLink
- Reminder
- ReminderEvent
- ChecklistTemplate
- ChecklistRun
- GameSession
- AnalyticsEvent (optional telemetry layer)
- SyncCursor / SyncMetadata (optional support entity)

------------------------------------------------------------
6.1 Entity Relationship Diagram (ERD) Logic
------------------------------------------------------------

Main relationships:
- One patient user can be linked to one or more caregivers through CareLink
- One caregiver user can be linked to one or more patients through CareLink
- One patient can have many reminders
- One reminder can generate many ReminderEvents
- One patient can have many ChecklistTemplates
- One ChecklistTemplate can have many ChecklistRuns
- One patient can have many GameSessions
- One user can generate many AnalyticsEvents

Relationship summary:
- User (patient) 1-to-many Reminder
- Reminder 1-to-many ReminderEvent
- User (patient) 1-to-many ChecklistTemplate
- ChecklistTemplate 1-to-many ChecklistRun
- User (patient) 1-to-many GameSession
- User (patient) 1-to-many CareLink
- User (caregiver) 1-to-many CareLink
- User 1-to-many AnalyticsEvent

------------------------------------------------------------
6.2 User
------------------------------------------------------------

Purpose:
Stores the main user record for patient, caregiver, or admin/test role.

Fields:
- id
  Type: string / UUID / ObjectId
  Required: Yes
  Example: usr_123
  Notes: unique user id

- role
  Type: enum
  Required: Yes
  Example: patient
  Notes: patient / caregiver / admin

- displayName
  Type: string
  Required: Yes
  Example: Ahmed
  Notes: user-facing name

- email
  Type: string
  Required: Usually
  Example: a@example.com
  Notes: useful for login/linking

- language
  Type: enum
  Required: Yes
  Example: ar
  Notes: Arabic or English

- timezone
  Type: string
  Required: Yes
  Example: Africa/Cairo
  Notes: useful for scheduling

- isActive
  Type: boolean
  Required: Yes
  Example: true
  Notes: account status

- settings / accessibility settings
  Type: object
  Required: No
  Example: { textSize: "large", highContrast: true, audioCuesEnabled: false }
  Notes: accessibility/preferences

- preferredNotificationMode
  Type: string
  Required: No
  Example: push
  Notes: optional setting

- createdAt
  Type: datetime
  Required: Yes
  Example: ISO date

- updatedAt
  Type: datetime
  Required: Yes
  Example: ISO date

- lastSeenAt
  Type: datetime
  Required: No
  Example: ISO date
  Notes: last app activity

Classification:
- User overall: Structured
- settings field: Semi-structured

------------------------------------------------------------
6.3 CareLink
------------------------------------------------------------

Purpose:
Stores the caregiver-patient relationship and permissions.

Fields:
- id
  Type: string / UUID / ObjectId
  Required: Yes
  Example: cl_1
  Notes: unique link id

- patientUserId
  Type: ref User.id
  Required: Yes
  Example: usr_patient_1
  Notes: linked patient

- caregiverUserId
  Type: ref User.id
  Required: Yes
  Example: usr_caregiver_1
  Notes: linked caregiver

- status
  Type: enum
  Required: Yes
  Example: active
  Notes: pending / active / revoked

- permissions
  Type: object
  Required: Yes
  Example:
    {
      canCreateReminders: true,
      canEditReminders: true,
      canViewProgress: true,
      canCreateChecklists: true,
      canEditChecklists: true,
      canMarkTasksOnBehalf: false
    }
  Notes: permission flags

- invitedByUserId
  Type: ref User.id
  Required: Usually
  Example: usr_caregiver_1
  Notes: who initiated link

- acceptedAt
  Type: datetime
  Required: No

- revokedAt
  Type: datetime
  Required: No

- createdAt
  Type: datetime
  Required: Yes

- updatedAt
  Type: datetime
  Required: Yes

Classification:
- CareLink overall: Structured
- permissions: Semi-structured

------------------------------------------------------------
6.4 Reminder
------------------------------------------------------------

Purpose:
Stores the reminder definition itself.

Fields:
- id
  Type: string / UUID / ObjectId
  Required: Yes
  Example: rem_1
  Notes: unique reminder id

- patientUserId
  Type: ref User.id
  Required: Yes
  Example: usr_patient_1
  Notes: owner

- title
  Type: string
  Required: Yes
  Example: Take medicine
  Notes: reminder label

- category
  Type: enum
  Required: Yes
  Example: medication
  Notes: reminder type

- scheduledTime
  Type: string / time
  Required: Yes
  Example: 09:00
  Notes: main reminder time

- repeatRule
  Type: object
  Required: Yes
  Example: { type: "daily" }
  Notes: recurrence definition

- startDate
  Type: date
  Required: No
  Example: 2026-03-12
  Notes: when reminder starts

- endDate
  Type: date
  Required: No
  Example: 2026-04-01
  Notes: when reminder ends

- daysOfWeek
  Type: array
  Required: No
  Example: ["mon", "wed"]
  Notes: repeat detail

- description
  Type: string
  Required: No
  Example: After breakfast
  Notes: optional note

- priority
  Type: string / enum
  Required: No
  Example: important
  Notes: optional priority

- linkedChecklistTemplateId
  Type: ref ChecklistTemplate.id
  Required: No
  Example: chk_t_1
  Notes: optional linked checklist

- snoozeEnabled
  Type: boolean
  Required: Yes
  Example: true
  Notes: allow snooze

- defaultSnoozeMinutes
  Type: integer
  Required: No
  Example: 10
  Notes: default snooze duration

- isActive
  Type: boolean
  Required: Yes
  Example: true
  Notes: active state

- archivedAt
  Type: datetime
  Required: No
  Example: ISO date
  Notes: soft delete / archive

- createdByUserId
  Type: ref User.id
  Required: Yes
  Example: usr_caregiver_1
  Notes: creator traceability

- lastEditedByUserId
  Type: ref User.id
  Required: No
  Example: usr_patient_1
  Notes: last editor

- createdAt
  Type: datetime
  Required: Yes

- updatedAt
  Type: datetime
  Required: Yes

Classification:
- Reminder overall: Structured
- repeatRule / daysOfWeek: Semi-structured

------------------------------------------------------------
6.5 ReminderEvent
------------------------------------------------------------

Purpose:
Stores the event history of reminders.

Fields:
- id
  Type: string / UUID / ObjectId
  Required: Yes
  Example: revt_1
  Notes: unique event id

- reminderId
  Type: ref Reminder.id
  Required: Yes
  Example: rem_1
  Notes: parent reminder

- patientUserId
  Type: ref User.id
  Required: Yes
  Example: usr_patient_1
  Notes: owner context

- eventType
  Type: enum
  Required: Yes
  Example: done
  Notes: created / edited / fired / done / snoozed / skipped / dismissed / deactivated / reactivated

- scheduledFor
  Type: datetime
  Required: Yes
  Example: ISO date
  Notes: reminder occurrence time

- timestamp
  Type: datetime
  Required: Yes
  Example: ISO date
  Notes: when event happened

- actorUserId
  Type: ref User.id
  Required: Yes
  Example: usr_patient_1
  Notes: who acted

- actorRole
  Type: enum
  Required: Yes
  Example: patient
  Notes: patient / caregiver / system

- source
  Type: string / enum
  Required: Yes
  Example: notification
  Notes: notification / home / reminder_list / caregiver_panel / system_scheduler

- actionValue
  Type: object / value
  Required: No
  Example: { snoozeMinutes: 10 }
  Notes: event-specific detail

- optionalReasonCode
  Type: string
  Required: No
  Example: busy
  Notes: optional skip reason

- createdAt
  Type: datetime
  Required: Yes
  Example: ISO date
  Notes: record time

Classification:
- ReminderEvent overall: Structured
- actionValue: Semi-structured

Notes:
- essential for adherence metrics
- one reminder can generate many ReminderEvents over time

------------------------------------------------------------
6.6 ChecklistTemplate
------------------------------------------------------------

Purpose:
Stores a reusable routine definition.

Fields:
- id
  Type: string / UUID / ObjectId
  Required: Yes
  Example: chk_t_1
  Notes: unique id

- patientUserId
  Type: ref User.id
  Required: Yes
  Example: usr_patient_1
  Notes: owner

- title
  Type: string
  Required: Yes
  Example: Morning routine checklist

- description
  Type: string
  Required: No
  Example: Start the day calmly
  Notes: optional context

- category
  Type: string / enum
  Required: No
  Example: morning
  Notes: optional grouping

- steps
  Type: array of objects
  Required: Yes
  Example: [{ label: "Wash face", order: 1 }]
  Notes: ordered steps

- estimatedDurationMinutes
  Type: integer
  Required: No
  Example: 10
  Notes: optional estimate

- isActive
  Type: boolean
  Required: Yes
  Example: true
  Notes: active state

- archivedAt
  Type: datetime
  Required: No
  Example: ISO date
  Notes: archive time

- createdByUserId
  Type: ref User.id
  Required: Yes
  Example: usr_caregiver_1
  Notes: creator

- lastEditedByUserId
  Type: ref User.id
  Required: No
  Example: usr_patient_1
  Notes: last editor

- createdAt
  Type: datetime
  Required: Yes

- updatedAt
  Type: datetime
  Required: Yes

Suggested step shape:
- stepId: string, example step_1, stable step id
- label: string, example Take medicine, visible text
- order: integer, example 2, sequence
- optionalHint: string, example Blue pill only, optional guidance

Classification:
- ChecklistTemplate overall: Structured
- steps: Semi-structured

------------------------------------------------------------
6.7 ChecklistRun
------------------------------------------------------------

Purpose:
Stores one actual usage session of a checklist.

Fields:
- id
  Type: string / UUID / ObjectId
  Required: Yes
  Example: chk_run_1
  Notes: unique run id

- checklistTemplateId
  Type: ref ChecklistTemplate.id
  Required: Yes
  Example: chk_t_1
  Notes: source template

- patientUserId
  Type: ref User.id
  Required: Yes
  Example: usr_patient_1
  Notes: owner

- status
  Type: enum
  Required: Yes
  Example: completed
  Notes: started / in_progress / completed / abandoned

- startedAt
  Type: datetime
  Required: Yes
  Example: ISO date
  Notes: start time

- completedAt
  Type: datetime
  Required: No
  Example: ISO date
  Notes: finish time

- abandonedAt
  Type: datetime
  Required: No
  Example: ISO date
  Notes: stopped early

- completedStepsCount
  Type: integer
  Required: Yes
  Example: 3

- totalStepsCount
  Type: integer
  Required: Yes
  Example: 4

- lastStepIndexReached
  Type: integer
  Required: No
  Example: 2
  Notes: progress point

- stepResults
  Type: array / object
  Required: No
  Example: [{ stepId: "s1", completed: true }]
  Notes: per-step results

- durationSeconds
  Type: integer
  Required: No
  Example: 180
  Notes: run duration

- actorUserId
  Type: ref User.id
  Required: Yes
  Example: usr_patient_1
  Notes: who ran/marked

- actorRole
  Type: enum
  Required: Yes
  Example: patient
  Notes: patient / caregiver

- startedFrom
  Type: string / enum
  Required: No
  Example: home
  Notes: entry source, e.g. home / reminder_prompt / checklist_list

- createdAt
  Type: datetime
  Required: Yes

- updatedAt
  Type: datetime
  Required: Yes

Classification:
- ChecklistRun overall: Structured
- stepResults: Semi-structured

Notes:
- important for daily-function evidence
- tracks not only that a checklist exists, but how it was used

------------------------------------------------------------
6.8 GameSession
------------------------------------------------------------

Purpose:
Stores one brain game session.

Fields:
- id
  Type: string / UUID / ObjectId
  Required: Yes
  Example: game_1
  Notes: unique session id

- patientUserId
  Type: ref User.id
  Required: Yes
  Example: usr_patient_1
  Notes: owner

- gameType
  Type: string / enum
  Required: Yes
  Example: matching_pairs
  Notes: which game

- difficultyLevel
  Type: string / int
  Required: No
  Example: easy
  Notes: optional difficulty

- startedAt
  Type: datetime
  Required: Yes
  Example: ISO date
  Notes: session start

- completedAt
  Type: datetime
  Required: No
  Example: ISO date
  Notes: session end

- durationSeconds
  Type: integer
  Required: No
  Example: 300
  Notes: duration

- score
  Type: integer
  Required: No
  Example: 8
  Notes: result

- completed
  Type: boolean
  Required: Yes
  Example: true
  Notes: finished or not

- quitEarly
  Type: boolean
  Required: No
  Example: false
  Notes: stopped before end

- actorUserId
  Type: ref User.id
  Required: Yes
  Example: usr_patient_1
  Notes: actor

- actorRole
  Type: enum
  Required: Yes
  Example: patient
  Notes: usually patient

- source
  Type: string
  Required: No
  Example: games_hub
  Notes: launch source

- createdAt
  Type: datetime
  Required: Yes

Classification:
- GameSession: Structured

------------------------------------------------------------
6.9 AnalyticsEvent
------------------------------------------------------------

Purpose:
Stores telemetry and app usage events.

Fields:
- id
  Type: string / UUID / ObjectId
  Required: Yes
  Example: evt_1
  Notes: unique analytics id

- eventName
  Type: string
  Required: Yes
  Example: progress_viewed
  Notes: event type

- occurredAt
  Type: datetime
  Required: Yes
  Example: ISO date
  Notes: event time

- patientUserId
  Type: ref User.id
  Required: Usually
  Example: usr_patient_1
  Notes: patient context

- actorUserId
  Type: ref User.id
  Required: Yes
  Example: usr_caregiver_1
  Notes: actor

- actorRole
  Type: enum
  Required: Yes
  Example: caregiver
  Notes: patient / caregiver / system

- sessionId
  Type: string
  Required: No
  Example: sess_1
  Notes: session grouping

- screenName
  Type: string
  Required: No
  Example: CaregiverProgressScreen
  Notes: screen context

- source
  Type: string
  Required: No
  Example: progress_screen
  Notes: origin context

- appVersion
  Type: string
  Required: No
  Example: 1.0.0
  Notes: debugging/versioning

- platform
  Type: string
  Required: No
  Example: android
  Notes: mobile platform

- language
  Type: string
  Required: No
  Example: ar
  Notes: locale

- payload
  Type: object
  Required: No
  Example: { rangeType: "weekly" }
  Notes: event-specific detail

- createdAt
  Type: datetime
  Required: Yes

Classification:
- AnalyticsEvent outer structure: Structured
- payload: Semi-structured

Notes:
- sanitize payloads
- do not store unnecessary personal free text

------------------------------------------------------------
6.10 SyncCursor / SyncMetadata (Optional Support Entity)
------------------------------------------------------------

Purpose:
Supports incremental sync.

Fields:
- id
- userId
- lastSyncAt
- lastSyncCursor
- updatedAt

Notes:
- useful for /sync/changes
- implementation may vary by final database choice

====================================================================
7. EVENT LOGGING / INSTRUMENTATION
====================================================================

The app requires deliberate instrumentation to support thesis evaluation, usage understanding, adoption observation, and error/recovery tracing.

------------------------------------------------------------
7.1 Standard Event Envelope
------------------------------------------------------------

Every event should share these common fields:
- eventName: identifies the event
- occurredAt: when it happened
- patientUserId: patient context
- actorUserId: who performed the action
- actorRole: patient / caregiver / system
- screenName: where it happened
- source: origin context
- sessionId: session grouping
- appVersion: debugging/version tracking
- platform: Android / iOS
- language: locale
- payload: event-specific details

This common envelope keeps analytics coherent across feature areas.

------------------------------------------------------------
7.2 Event Groups
------------------------------------------------------------

A. Onboarding / Setup Events

- onboarding_started
  When fired: onboarding begins
  Main properties: entryPoint, defaultLanguage
  Actor: patient / caregiver
  Main entity: AnalyticsEvent

- language_selected
  When fired: language chosen
  Main properties: selectedLanguage
  Actor: patient / caregiver
  Main entity: User / AnalyticsEvent

- caregiver_link_initiated
  When fired: caregiver flow starts
  Main properties: inviteMethod
  Actor: patient / caregiver
  Main entity: CareLink / AnalyticsEvent

- notification_permission_result
  When fired: user answers notification prompt
  Main properties: granted / denied
  Actor: patient / caregiver
  Main entity: AnalyticsEvent

- first_reminder_created
  When fired: first reminder saved during onboarding
  Main properties: reminderCategory, repeatType
  Actor: patient / caregiver
  Main entity: Reminder / AnalyticsEvent

- onboarding_completed
  When fired: onboarding ends successfully
  Main properties:
    caregiverLinkedBool
    notificationsEnabledBool
    firstReminderCreatedBool
  Actor: patient / caregiver
  Main entity: AnalyticsEvent

B. Caregiver Linking Events

Representative events include:
- caregiver_link_initiated
- caregiver_linked
- caregiver_permission_updated
- caregiver_link_revoked

These should capture:
- relationship state changes
- permission changes
- who initiated the change

C. Reminder Events

Reminder events are central to adherence evidence.

Representative event names include:
- reminder_created
- reminder_edited
- reminder_fired
- reminder_done
- reminder_snoozed
- reminder_skipped
- reminder_dismissed
- reminder_deactivated
- reminder_reactivated

Main properties may include:
- reminderCategory
- source
- scheduledFor
- snoozeMinutes
- reasonCode

D. Checklist Events

Representative event names include:
- checklist_started
- checklist_step_completed
- checklist_completed
- checklist_abandoned

Main properties may include:
- checklistTemplateId
- stepCount
- completedStepsCount
- startedFrom

E. Game Events

Representative event names include:
- game_started
- game_completed
- game_quit

Main properties may include:
- gameType
- score
- durationSeconds
- difficultyLevel

F. Progress Events

- progress_viewed
  When fired: progress screen opened
  Main properties: rangeType, viewType
  Actor: patient / caregiver
  Main entity: AnalyticsEvent

- progress_filter_changed
  When fired: progress filter changed
  Main properties: filterType, filterValue
  Actor: patient / caregiver
  Main entity: AnalyticsEvent

- progress_export_requested
  When fired: export/share requested later
  Main properties: rangeType, format
  Actor: patient / caregiver
  Main entity: AnalyticsEvent

G. Help / Support Events

- help_opened
  When fired: help screen opened
  Main properties: originatingScreen, helpTopic
  Actor: patient / caregiver
  Main entity: AnalyticsEvent

- help_topic_viewed
  When fired: specific help topic viewed
  Main properties: helpTopic
  Actor: patient / caregiver
  Main entity: AnalyticsEvent

H. Error / Recovery Events

- error_occurred
  When fired: meaningful handled error occurs
  Main properties: errorCode, screenName, actionAttempted, recoverableBool
  Actor: patient / caregiver / system
  Main entity: AnalyticsEvent

- sync_failed
  When fired: sync operation fails
  Main properties: operationType, retryCount
  Actor: system
  Main entity: AnalyticsEvent

- notification_schedule_failed
  When fired: local notification schedule/cancel fails
  Main properties: reminderId, failureStage
  Actor: system
  Main entity: AnalyticsEvent

------------------------------------------------------------
7.3 Required MVP Event Set
------------------------------------------------------------

Minimum events locked for MVP:
- onboarding_completed
- caregiver_linked
- reminder_created
- reminder_fired
- reminder_done
- reminder_snoozed
- reminder_skipped
- checklist_started
- checklist_completed
- game_started
- game_completed
- progress_viewed
- help_opened
- error_occurred

------------------------------------------------------------
7.4 Event-to-Entity Mapping
------------------------------------------------------------

- Onboarding / setup -> User, CareLink, Reminder
- Caregiver linking -> CareLink
- Reminder actions -> Reminder, ReminderEvent
- Checklist usage -> ChecklistTemplate, ChecklistRun
- Game usage -> GameSession
- Progress viewing -> derived from ReminderEvent, ChecklistRun, GameSession
- Help / errors -> AnalyticsEvent

------------------------------------------------------------
7.5 Metrics Supported by This Taxonomy
------------------------------------------------------------

- Reminder adherence = reminder_done / reminder_fired
- Reminder snooze rate = reminder_snoozed / reminder_fired
- Reminder skip rate = reminder_skipped / reminder_fired
- Checklist completion rate = checklist_completed / checklist_started
- Game completion rate = game_completed / game_started
- Caregiver involvement = caregiver-created reminders + caregiver checklist creation + caregiver progress views
- Onboarding completion = onboarding_completed / onboarding_started

------------------------------------------------------------
7.6 Privacy Notes for Instrumentation
------------------------------------------------------------

Good to log:
- ids
- categories
- timestamps
- action types
- actor role
- source screen
- summary counts

Avoid logging in analytics payloads:
- full free-text notes
- sensitive health descriptions
- unnecessary raw message content
- personal narrative text

Example:
Good:
- reminderCategory = medication

Avoid:
- exact medication name unless truly necessary

====================================================================
8. BACKEND MODULE SPECIFICATION
====================================================================

------------------------------------------------------------
8.1 Auth Module
------------------------------------------------------------

Purpose:
Handles authentication and session establishment.

Responsibilities:
- receive Google sign-in proof/token from mobile
- validate identity
- find or create user
- issue app session/token
- return role and basic identity context
- support session restore

Owns:
- login exchange
- auth token/session lifecycle
- auth guards integration

Does not own:
- caregiver linking logic
- user profile editing
- reminders

Main operations:
- authenticate mobile login
- return current authenticated user
- logout / invalidate session

------------------------------------------------------------
8.2 Users Module
------------------------------------------------------------

Purpose:
Stores and returns user profile and preference data.

Responsibilities:
- user profile retrieval
- language settings
- accessibility settings
- notification preference settings
- basic profile updates

Owns:
- displayName
- role metadata
- language
- accessibility preferences
- timezone
- active status

Does not own:
- permissions between caregiver and patient
- reminder definitions

------------------------------------------------------------
8.3 CareLinks Module
------------------------------------------------------------

Purpose:
Represents the caregiver-patient relationship.

Responsibilities:
- create caregiver invitation
- accept caregiver link
- revoke caregiver relationship
- manage caregiver permissions
- verify caregiver access to linked patient

Owns:
- caregiver-patient link
- permission flags
- link status

Critical rules:
- caregiver cannot access arbitrary patient data
- caregiver must be linked and active
- permissions must be checked before reminder/checklist changes

Permission examples:
- canCreateReminders
- canEditReminders
- canViewProgress
- canCreateChecklists
- canEditChecklists
- canMarkTasksOnBehalf

------------------------------------------------------------
8.4 Reminders Module
------------------------------------------------------------

Purpose:
Manages reminder definitions.

Responsibilities:
- create reminder
- update reminder
- deactivate/archive reminder
- fetch reminders for patient
- validate reminder schedule fields
- track who created/edited reminder

Owns:
- reminder definition
- recurrence pattern
- active status
- linked checklist relation if used

Does not own:
- final local scheduling on patient device
- global analytics ingestion

Important rule:
This module stores the definition of reminders, not every interaction occurrence.

------------------------------------------------------------
8.5 Reminder Actions / Reminder History
------------------------------------------------------------

Recommended split:

Reminders Module owns domain reminder action history:
- done
- snooze
- skip
- fired if stored as domain history
- reminder interaction timeline

Events Module owns analytics/telemetry ingestion for all features.

This split is cleaner than making Reminders handle all telemetry for the whole app.

------------------------------------------------------------
8.6 Checklists Module
------------------------------------------------------------

Purpose:
Manages routine templates and checklist runs.

Responsibilities:
- create/edit checklist template
- fetch checklist templates
- start checklist run
- update step progress
- complete or abandon run

Owns:
- checklist template definition
- checklist run records

Important rule:
Checklist templates and checklist runs are different things:
- template = reusable routine definition
- run = one actual usage session

------------------------------------------------------------
8.7 Games Module
------------------------------------------------------------

Purpose:
Stores light game session information.

Responsibilities:
- start or save game session
- complete session
- fetch recent sessions if needed
- keep game data lightweight

Owns:
- game session metadata
- score/duration if games have them

Important rule:
The backend should not become a complex game engine. Only session metadata matters for MVP.

------------------------------------------------------------
8.8 Events Module
------------------------------------------------------------

Purpose:
Handles app instrumentation and analytics events.

Responsibilities:
- receive app events in batch
- validate allowed event names/properties
- sanitize analytics payloads
- persist telemetry
- support usage analysis later

Owns:
- onboarding events
- help events
- progress viewed events
- generic analytics events
- sanitized error events

Important rule:
This module is for evaluation data, not business truth alone.

------------------------------------------------------------
8.9 Progress Module
------------------------------------------------------------

Purpose:
Produces role-aware summary views from existing data.

Responsibilities:
- compute weekly summary
- compute reminder adherence
- compute checklist completion behavior
- compute game engagement summary
- compute caregiver involvement indicators
- return patient-friendly and caregiver-friendly views

Owns:
- summary logic
- derived metrics
- report-style aggregation

Does not own:
- raw event capture itself
- reminder CRUD

------------------------------------------------------------
8.10 Sync / Realtime Module
------------------------------------------------------------

Purpose:
Notifies active clients that important data changed.

Responsibilities:
- signal reminder changes
- signal checklist updates
- support incremental sync behavior
- manage “changes since timestamp” logic

Important rule:
Keep this module thin. It is a coordination layer, not a full event-processing platform.

------------------------------------------------------------
8.11 Shared Module
------------------------------------------------------------

Purpose:
Common backend foundation.

Responsibilities:
- auth middleware
- role/carelink guards
- input validation
- common error model
- DTO helpers
- shared date/time logic
- logger

====================================================================
9. BACKEND ENDPOINT CONTRACTS
====================================================================

------------------------------------------------------------
9.1 Auth Endpoints
------------------------------------------------------------

POST /auth/google/mobile
Purpose:
Exchange Google mobile sign-in result for backend session.

Request body:
{
  "idToken": "google_id_token_or_auth_proof"
}

Response:
{
  "accessToken": "app_access_token",
  "user": {
    "id": "usr_123",
    "role": "patient",
    "displayName": "Seif",
    "language": "en"
  }
}

Notes:
- if first login, backend may create user
- role may already exist or be assigned by onboarding flow

GET /auth/me
Purpose:
Return currently authenticated user and role context.

Response:
{
  "user": {
    "id": "usr_123",
    "role": "caregiver",
    "displayName": "Mona",
    "language": "ar"
  },
  "careContext": {
    "linkedPatients": [
      {
        "patientId": "usr_p_1",
        "careLinkId": "cl_1",
        "permissions": {
          "canCreateReminders": true,
          "canEditReminders": true,
          "canViewProgress": true
        }
      }
    ]
  }
}

POST /auth/logout
Purpose:
End session.

Response:
{
  "success": true
}

------------------------------------------------------------
9.2 User Endpoints
------------------------------------------------------------

GET /users/me
Purpose:
Get user profile and settings.

Response:
{
  "id": "usr_123",
  "role": "patient",
  "displayName": "Seif",
  "language": "en",
  "timezone": "Africa/Cairo",
  "settings": {
    "textSize": "large",
    "highContrast": true,
    "audioCuesEnabled": false
  }
}

PATCH /users/me
Purpose:
Update own preferences.

Request body:
{
  "language": "ar",
  "settings": {
    "textSize": "large",
    "highContrast": true,
    "audioCuesEnabled": true
  }
}

Response:
{
  "success": true,
  "user": {
    "id": "usr_123",
    "language": "ar"
  }
}

------------------------------------------------------------
9.3 CareLink Endpoints
------------------------------------------------------------

POST /carelinks/invite
Purpose:
Start caregiver-patient link creation.

Request body:
{
  "patientUserId": "usr_patient_1",
  "caregiverEmail": "caregiver@example.com",
  "permissions": {
    "canCreateReminders": true,
    "canEditReminders": true,
    "canViewProgress": true,
    "canCreateChecklists": true,
    "canEditChecklists": true,
    "canMarkTasksOnBehalf": false
  }
}

Response:
{
  "careLinkId": "cl_1",
  "status": "pending"
}

POST /carelinks/accept
Purpose:
Accept caregiver invitation.

Request body:
{
  "careLinkId": "cl_1"
}

Response:
{
  "success": true,
  "careLink": {
    "id": "cl_1",
    "status": "active"
  }
}

GET /carelinks/me
Purpose:
List my current caregiver/patient links.

Response:
{
  "careLinks": [
    {
      "id": "cl_1",
      "status": "active",
      "patient": {
        "id": "usr_patient_1",
        "displayName": "Ahmed"
      },
      "permissions": {
        "canCreateReminders": true,
        "canEditReminders": true,
        "canViewProgress": true
      }
    }
  ]
}

PATCH /carelinks/:id/permissions
Purpose:
Update caregiver permissions.

PATCH /carelinks/:id/revoke
Purpose:
Revoke caregiver relationship.

------------------------------------------------------------
9.4 Reminder Endpoints
------------------------------------------------------------

GET /patients/:patientId/reminders
Purpose:
Return reminders for one patient.

POST /patients/:patientId/reminders
Purpose:
Create reminder for patient.

GET /reminders/:id
Purpose:
Return reminder detail.

PATCH /reminders/:id
Purpose:
Edit reminder.

PATCH /reminders/:id/archive
Purpose:
Archive reminder.

POST /reminders/:id/actions
Purpose:
Record reminder action.

Action examples:
- done
- snooze
- skip

------------------------------------------------------------
9.5 Checklist Endpoints
------------------------------------------------------------

Checklist-related endpoints are intended to support:
- checklist template create/edit/fetch
- checklist run start/update/complete/abandon

These align to the Checklists module and the distinction between template and run.

------------------------------------------------------------
9.6 Game Endpoints
------------------------------------------------------------

POST /patients/:patientId/game-sessions
Purpose:
Store a game session.

Request body:
{
  "gameType": "matching_pairs",
  "startedAt": "2026-03-09T10:00:00Z",
  "completedAt": "2026-03-09T10:05:00Z",
  "durationSeconds": 300,
  "score": 8
}

Response:
{
  "session": {
    "id": "game_1",
    "gameType": "matching_pairs",
    "durationSeconds": 300,
    "score": 8
  }
}

GET /patients/:patientId/game-sessions
Purpose:
Return recent sessions if needed.

Response:
{
  "sessions": [
    {
      "id": "game_1",
      "gameType": "matching_pairs",
      "durationSeconds": 300,
      "score": 8
    }
  ]
}

------------------------------------------------------------
9.7 Events Endpoints
------------------------------------------------------------

POST /events/batch
Purpose:
Send analytics events in batch.

Request body:
{
  "events": [
    {
      "eventName": "progress_viewed",
      "occurredAt": "2026-03-09T12:00:00Z",
      "actorRole": "caregiver",
      "patientUserId": "usr_patient_1",
      "source": "caregiver_progress_screen"
    }
  ]
}

Response:
{
  "accepted": 1
}

POST /errors/client
Purpose:
Optional client error reporting.

Request body:
{
  "screenName": "CreateReminderScreen",
  "errorCode": "REMINDER_SAVE_FAILED",
  "actionAttempted": "create_reminder",
  "recoverable": true
}

Response:
{
  "accepted": true
}

------------------------------------------------------------
9.8 Progress Endpoints
------------------------------------------------------------

GET /patients/:patientId/progress/weekly
Purpose:
Return weekly summary.

Response:
{
  "weekStart": "2026-03-09",
  "summary": {
    "remindersFired": 10,
    "remindersDone": 8,
    "remindersSnoozed": 1,
    "remindersSkipped": 1,
    "checklistsStarted": 3,
    "checklistsCompleted": 2,
    "gamesCompleted": 2,
    "caregiverActionsCount": 4
  },
  "viewType": "caregiver"
}

GET /patients/:patientId/progress/overview
Purpose:
Smaller dashboard summary.

Response:
{
  "nextReminderAt": "2026-03-09T18:00:00Z",
  "todayPendingCount": 2,
  "weeklyReminderCompletionRate": 0.8
}

------------------------------------------------------------
9.9 Sync Endpoints
------------------------------------------------------------

GET /sync/bootstrap
Purpose:
Initial app payload after login.

Response:
{
  "user": {
    "id": "usr_1",
    "role": "patient",
    "displayName": "Seif"
  },
  "careLinks": [],
  "reminders": [],
  "checklistTemplates": [],
  "progressOverview": {
    "todayPendingCount": 0
  },
  "syncCursor": "cursor_123"
}

GET /sync/changes?since=cursor_123
Purpose:
Incremental sync.

Response:
{
  "changedReminders": [],
  "changedChecklistTemplates": [],
  "updatedCareLinks": [],
  "newSyncCursor": "cursor_124"
}

Why this endpoint is important:
It avoids expensive full refetches and gives a clean sync story.

====================================================================
10. CONTRACT RULES TO LOCK
====================================================================

Rule 1 — Backend decides access
The client never decides:
- whether caregiver may edit
- whether patient is linked
- whether progress is viewable
That must be backend-enforced.

Rule 2 — Archive, don’t hard delete
Especially for reminders and checklist templates.
Why:
- better history
- better analytics
- safer behavior for caregiver mistakes

Rule 3 — Summary is derived
Do not store weekly summary as the main truth.
Generate it from:
- reminder events
- checklist runs
- game sessions
- caregiver-related actions

Rule 4 — Local reminder delivery is derived from synced definitions
Reminder notifications should not be treated as the main backend-owned runtime object.
The backend stores reminder definitions and history; the patient device schedules the local notifications.

====================================================================
11. FINAL ARCHITECTURAL POSITION
====================================================================

At the end of the planning and design work, the app is defined at four levels:

Product level:
- scope
- features
- user roles
- flows

Data level:
- entities
- events
- summaries

Architecture level:
- Expo mobile app
- custom backend
- local cache
- sync
- notifications

Implementation level:
- folder structures
- build order
- entity contract
- endpoint contracts

This means the project is not just an idea. It has a locked, buildable shape.
The system’s core domain is built around structured entities, with semi-structured nested fields where necessary, and a research-friendly event taxonomy layered on top.

The overall design is centered on daily functioning, caregiver collaboration, and measurable support behaviors. The architecture is intentionally modular, the backend is intentionally authoritative, the mobile app is intentionally role-separated, and the instrumentation is intentionally designed to make both implementation and evaluation possible.
