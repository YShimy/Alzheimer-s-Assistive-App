import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { gamesController } from './controller/games.controller.js';

export const gamesRouter = Router();

gamesRouter.use(authMiddleware);

// GET /api/games — list active games
gamesRouter.get('/', gamesController.listGames);

// POST /api/games/sessions/start — start a new session
gamesRouter.post('/sessions/start', gamesController.startSession);

// POST /api/games/sessions/:id/complete-memory-match
gamesRouter.post('/sessions/:id/complete-memory-match', gamesController.completeMemoryMatch);

// POST /api/games/sessions/:id/complete-spaced-retrieval
gamesRouter.post('/sessions/:id/complete-spaced-retrieval', gamesController.completeSpacedRetrieval);

// GET /api/games/sessions — list recent sessions
gamesRouter.get('/sessions', gamesController.getSessions);

// GET /api/games/progress?gameType=... — chart-ready progress data
gamesRouter.get('/progress', gamesController.getProgress);

// GET /api/games/progress/memory-match
gamesRouter.get('/progress/memory-match', gamesController.getMemoryMatchProgress);

// GET /api/games/progress/spaced-retrieval
gamesRouter.get('/progress/spaced-retrieval', gamesController.getSpacedRetrievalProgress);
