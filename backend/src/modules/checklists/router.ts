import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { checklistsController } from './controller/checklists.controller.js';

export const checklistsRouter = Router();

checklistsRouter.use(authMiddleware);

// ─── Templates ────────────────────────────────────────────────────────────

checklistsRouter.get('/templates', checklistsController.listTemplates);
checklistsRouter.post('/templates', checklistsController.createTemplate);
checklistsRouter.patch('/templates/:id', checklistsController.updateTemplate);
checklistsRouter.patch('/templates/:id/archive', checklistsController.archiveTemplate);

// ─── Runs ────────────────────────────────────────────────────────────────

checklistsRouter.get('/runs', checklistsController.getActiveRuns);
checklistsRouter.post('/runs', checklistsController.startRun);
checklistsRouter.patch('/runs/:id', checklistsController.updateRun);

