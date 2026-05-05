import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { roleGuard } from '../../shared/middleware/roleGuard.middleware.js';
import { careLinkGuard } from '../../shared/middleware/careLinkGuard.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { importantInfoController } from './controller/important-info.controller.js';

// ─── Caregiver routes: /api/patients/:patientId/important-info ─────────────
export const importantInfoRouter = Router({ mergeParams: true });
importantInfoRouter.use(authMiddleware);
importantInfoRouter.use(roleGuard('caregiver'));
importantInfoRouter.use(careLinkGuard('canViewProgress'));

importantInfoRouter.get('/', asyncHandler(importantInfoController.getForCaregiver));
importantInfoRouter.put('/', asyncHandler(importantInfoController.upsert));
importantInfoRouter.patch('/', asyncHandler(importantInfoController.upsert));
importantInfoRouter.post('/review', asyncHandler(importantInfoController.markReviewed));

// ─── Patient route: /api/me/important-info ─────────────────────────────────
export const importantInfoPatientRouter = Router();
importantInfoPatientRouter.use(authMiddleware);
importantInfoPatientRouter.use(roleGuard('patient'));

importantInfoPatientRouter.get('/important-info', asyncHandler(importantInfoController.getForPatient));
