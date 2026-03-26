import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { progressController } from './controller/progress.controller.js';

export const progressRouter = Router({ mergeParams: true });

progressRouter.use(authMiddleware);

// GET /api/patients/:patientId/progress/weekly
progressRouter.get('/weekly', progressController.getWeeklyProgress);

// GET /api/patients/:patientId/progress/overview
progressRouter.get('/overview', progressController.getOverview);
