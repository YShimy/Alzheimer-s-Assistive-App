import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { roleGuard } from '../../shared/middleware/roleGuard.middleware.js';
import { careLinkGuard } from '../../shared/middleware/careLinkGuard.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { summaryExportController } from './controller/summary-export.controller.js';

// Base path: /api/patients/:patientId/summary-exports
export const summaryExportsRouter = Router({ mergeParams: true });

summaryExportsRouter.use(authMiddleware);
summaryExportsRouter.use(roleGuard('caregiver')); // Patients are blocked at middleware level
summaryExportsRouter.use(careLinkGuard('canViewProgress'));

summaryExportsRouter.post('/', asyncHandler(summaryExportController.createExport));
summaryExportsRouter.get('/', asyncHandler(summaryExportController.listExports));
summaryExportsRouter.get('/:exportId', asyncHandler(summaryExportController.getExport));
summaryExportsRouter.get('/:exportId/download-url', asyncHandler(summaryExportController.getDownloadUrl));
summaryExportsRouter.delete('/:exportId', asyncHandler(summaryExportController.archiveExport));
