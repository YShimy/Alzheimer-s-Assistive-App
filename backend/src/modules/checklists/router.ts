import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const checklistsRouter = Router();

checklistsRouter.use(authMiddleware);

// GET /api/checklists/templates
checklistsRouter.get('/templates', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Checklist templates endpoint not yet implemented' } });
});

// POST /api/checklists/templates
checklistsRouter.post('/templates', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Create checklist template not yet implemented' } });
});

// POST /api/checklists/runs
checklistsRouter.post('/runs', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Start checklist run not yet implemented' } });
});

// PATCH /api/checklists/runs/:id
checklistsRouter.patch('/runs/:id', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Update checklist run not yet implemented' } });
});
