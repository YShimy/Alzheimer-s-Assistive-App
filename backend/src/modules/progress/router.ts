import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { progressController } from './controller/progress.controller.js';

export const progressRouter = Router({ mergeParams: true });

progressRouter.use(authMiddleware);

// GET /api/patients/:patientId/progress/overview
progressRouter.get('/overview', progressController.getOverview);

// GET /api/patients/:patientId/progress/streaks
progressRouter.get('/streaks', progressController.getStreaks);

// GET /api/patients/:patientId/progress/categories
progressRouter.get('/categories', progressController.getCategories);

// GET /api/patients/:patientId/progress/charts
progressRouter.get('/charts', progressController.getCharts);

// GET /api/patients/:patientId/progress/checklists
progressRouter.get('/checklists', progressController.getChecklistTracking);

// GET /api/patients/:patientId/progress/game?gameType=xxx
progressRouter.get('/game', progressController.getGameProgress);

// GET /api/patients/:patientId/progress/weekly
progressRouter.get('/weekly', progressController.getWeekly);

// GET /api/patients/:patientId/progress/priority-breakdown?days=7
progressRouter.get('/priority-breakdown', progressController.getPriorityBreakdown);

