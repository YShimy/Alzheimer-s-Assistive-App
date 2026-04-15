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
