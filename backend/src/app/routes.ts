import { Router } from 'express';

// Module routers
import { authRouter } from '../modules/auth/router.js';
import { usersRouter } from '../modules/users/router.js';
import { carelinksRouter } from '../modules/carelinks/router.js';
import { remindersRouter, reminderDirectRouter } from '../modules/reminders/router.js';
import { checklistsRouter, checklistDirectRouter } from '../modules/checklists/router.js';
import { gamesRouter } from '../modules/games/router.js';
import { eventsRouter } from '../modules/events/router.js';
import { progressRouter } from '../modules/progress/router.js';
import { syncRouter } from '../modules/sync/router.js';
import { contactsRouter } from '../modules/contacts/router.js';
import { mediaRouter } from '../modules/media/router.js';
import { recordsRouter } from '../modules/records/router.js';
import notificationsController from '../modules/notifications/controller/notifications.controller.js';
import { importantInfoRouter, importantInfoPatientRouter } from '../modules/important-info/router.js';
import { summaryExportsRouter } from '../modules/summary-exports/router.js';

export function registerRoutes(app: Router): void {
  // Auth (no prefix needed, router handles paths)
  app.use('/api/auth', authRouter);

  // Users
  app.use('/api/users', usersRouter);

  // CareLinks
  app.use('/api/carelinks', carelinksRouter);

  // Reminders — patient-scoped routes
  app.use('/api/patients', remindersRouter);

  // Contacts - patient-scoped routes
  app.use('/api/patients/:patientId', contactsRouter);

  // Records - caregiver only
  app.use('/api/patients/:patientId/documents', recordsRouter);

  // Reminders — direct routes (GET/PATCH /reminders/:id, POST /reminders/:id/actions)
  app.use('/api/reminders', reminderDirectRouter);

  // Checklists — direct routes (PATCH /checklists/templates/:id, etc.)
  app.use('/api/checklists', checklistDirectRouter);

  // Checklists - patient-scoped routes
  app.use('/api/patients', checklistsRouter);

  // Games (stub)
  app.use('/api/games', gamesRouter);

  // Events (stub)
  app.use('/api/events', eventsRouter);

  // Progress
  app.use('/api/patients/:patientId/progress', progressRouter);

  // Sync (stub)
  app.use('/api/sync', syncRouter);

  // Media
  app.use('/api/media', mediaRouter);

  // Notifications
  app.use('/api/notifications', notificationsController);

  // Important Information (caregiver scoped + patient me route)
  app.use('/api/patients/:patientId/important-info', importantInfoRouter);
  app.use('/api/me', importantInfoPatientRouter);

  // Summary Exports (caregiver only)
  app.use('/api/patients/:patientId/summary-exports', summaryExportsRouter);
}
