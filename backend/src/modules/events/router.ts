import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const eventsRouter = Router();

eventsRouter.use(authMiddleware);

// POST /api/events/batch
eventsRouter.post('/batch', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Analytics events batch endpoint not yet implemented' } });
});

// POST /api/events/errors/client
eventsRouter.post('/errors/client', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Client error reporting not yet implemented' } });
});
