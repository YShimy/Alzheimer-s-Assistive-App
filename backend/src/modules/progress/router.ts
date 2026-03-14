import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const progressRouter = Router();

progressRouter.use(authMiddleware);

// GET /api/progress/weekly
progressRouter.get('/weekly', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Weekly progress endpoint not yet implemented' } });
});

// GET /api/progress/overview
progressRouter.get('/overview', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Progress overview endpoint not yet implemented' } });
});
