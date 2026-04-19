import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { checklistsController } from './controller/checklists.controller.js';
import { careLinkGuard } from '../../shared/middleware/careLinkGuard.middleware.js';
import { validateBody, validateParams } from '../../shared/validation/validator.js';
import { 
  createTemplateSchema, 
  updateTemplateSchema, 
  createRunSchema, 
  updateRunSchema,
  patientIdParam,
  templateIdParam,
  runIdParam
} from './validation/checklists.schemas.js';

// ─── Patient-scoped routes: mounted under /api/patients ──────────
export const checklistsRouter = Router();
checklistsRouter.use(authMiddleware);

// Templates listing and creation
checklistsRouter.get(
  '/:patientId/checklists/templates',
  validateParams(patientIdParam),
  careLinkGuard('canViewProgress'),
  checklistsController.listTemplates,
);

checklistsRouter.post(
  '/:patientId/checklists/templates',
  validateParams(patientIdParam),
  validateBody(createTemplateSchema),
  careLinkGuard('canCreateChecklists'),
  checklistsController.createTemplate,
);

// Runs listing and starting
checklistsRouter.get(
  '/:patientId/checklists/runs',
  validateParams(patientIdParam),
  careLinkGuard('canViewProgress'),
  checklistsController.getActiveRuns,
);

checklistsRouter.post(
  '/:patientId/checklists/runs',
  validateParams(patientIdParam),
  validateBody(createRunSchema),
  careLinkGuard('canMarkTasksOnBehalf'),
  checklistsController.startRun,
);

// ─── Direct routes: mounted under /api/checklists ─────────────────
export const checklistDirectRouter = Router();
checklistDirectRouter.use(authMiddleware);

// Update and Archive templates
checklistDirectRouter.patch(
  '/templates/:id',
  validateParams(templateIdParam),
  validateBody(updateTemplateSchema),
  // Direct routes usually handle permission check inside controller or use a dedicated item-level guard
  checklistsController.updateTemplate,
);

checklistDirectRouter.patch(
  '/templates/:id/archive',
  validateParams(templateIdParam),
  checklistsController.archiveTemplate,
);

// Update runs
checklistDirectRouter.patch(
  '/runs/:id',
  validateParams(runIdParam),
  validateBody(updateRunSchema),
  checklistsController.updateRun,
);

