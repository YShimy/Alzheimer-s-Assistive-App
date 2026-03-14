import { Router } from 'express';
import { remindersController } from './controller/reminders.controller.js';
import { reminderActionsController } from './controller/reminderActions.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { careLinkGuard } from '../../shared/middleware/careLinkGuard.middleware.js';
import { validateBody, validateParams, validateQuery } from '../../shared/validation/validator.js';
import { createReminderSchema, updateReminderSchema, patientIdParam, reminderIdParam, listRemindersQuery } from './validation/reminders.schemas.js';
import { reminderActionSchema, reminderActionIdParam } from './validation/reminderActions.schemas.js';

// ─── Patient-scoped routes: mounted under /api/patients ─────
export const remindersRouter = Router();
remindersRouter.use(authMiddleware);

// GET /api/patients/:patientId/reminders
remindersRouter.get(
  '/:patientId/reminders',
  validateParams(patientIdParam),
  validateQuery(listRemindersQuery),
  careLinkGuard('canViewProgress'),
  remindersController.list,
);

// POST /api/patients/:patientId/reminders
remindersRouter.post(
  '/:patientId/reminders',
  validateParams(patientIdParam),
  validateBody(createReminderSchema),
  careLinkGuard('canCreateReminders'),
  remindersController.create,
);

// ─── Direct routes: mounted under /api/reminders ────────────
export const reminderDirectRouter = Router();
reminderDirectRouter.use(authMiddleware);

// GET /api/reminders/:id
reminderDirectRouter.get(
  '/:id',
  validateParams(reminderIdParam),
  remindersController.getById,
);

// PATCH /api/reminders/:id
reminderDirectRouter.patch(
  '/:id',
  validateParams(reminderIdParam),
  validateBody(updateReminderSchema),
  remindersController.update,
);

// PATCH /api/reminders/:id/archive
reminderDirectRouter.patch(
  '/:id/archive',
  validateParams(reminderIdParam),
  remindersController.archive,
);

// POST /api/reminders/:id/actions
reminderDirectRouter.post(
  '/:id/actions',
  validateParams(reminderActionIdParam),
  validateBody(reminderActionSchema),
  reminderActionsController.recordAction,
);
