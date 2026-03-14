import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const gamesRouter = Router();

gamesRouter.use(authMiddleware);

// GET /api/games/sessions
gamesRouter.get('/sessions', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Game sessions endpoint not yet implemented' } });
});

// POST /api/games/sessions
gamesRouter.post('/sessions', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Create game session not yet implemented' } });
});
