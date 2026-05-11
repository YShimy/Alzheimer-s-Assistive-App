import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { careLinkGuard } from '../../shared/middleware/careLinkGuard.middleware.js';
import { srController } from './controller/sr.controller.js';

export const spacedRetrievalRouter = Router();

spacedRetrievalRouter.use(authMiddleware);

// All SR item routes require an active care link (patient owns data, caregiver needs link)
spacedRetrievalRouter.get(
  '/:patientId/spaced-retrieval/items',
  careLinkGuard('canViewProgress'),
  srController.listItems,
);

spacedRetrievalRouter.post(
  '/:patientId/spaced-retrieval/items',
  careLinkGuard('canCreateReminders'),
  srController.createItem,
);

spacedRetrievalRouter.patch(
  '/:patientId/spaced-retrieval/items/:itemId',
  careLinkGuard('canEditReminders'),
  srController.updateItem,
);

spacedRetrievalRouter.delete(
  '/:patientId/spaced-retrieval/items/:itemId',
  careLinkGuard('canEditReminders'),
  srController.archiveItem,
);
