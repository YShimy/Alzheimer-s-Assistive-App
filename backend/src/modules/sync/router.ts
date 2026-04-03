import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const syncRouter = Router();

syncRouter.use(authMiddleware);

// GET /api/sync/bootstrap
syncRouter.get('/bootstrap', (_req, res) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Sync bootstrap endpoint not yet implemented' } });
});

// GET /api/sync/changes
syncRouter.get('/changes', (_req, res) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Sync changes endpoint not yet implemented' } });
});
