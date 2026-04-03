import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { gamesController } from './controller/games.controller.js';

export const gamesRouter = Router();

gamesRouter.use(authMiddleware);

// GET /api/games/sessions — list recent sessions
gamesRouter.get('/sessions', gamesController.getSessions);

// POST /api/games/sessions — save a completed game session
gamesRouter.post('/sessions', gamesController.saveSession);

// GET /api/games/progress?gameType=safe_path_memory — chart-ready progress data
gamesRouter.get('/progress', gamesController.getProgress);
