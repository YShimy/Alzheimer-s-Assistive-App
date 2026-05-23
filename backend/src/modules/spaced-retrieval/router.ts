import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { careLinkGuard } from '../../shared/middleware/careLinkGuard.middleware.js';
import { srController } from './controller/sr.controller.js';

export const spacedRetrievalRouter = Router();

spacedRetrievalRouter.use(authMiddleware);

// ─── SR Items ─────────────────────────────────────────────────────────────────

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

// ─── SR Settings ──────────────────────────────────────────────────────────────

spacedRetrievalRouter.get(
  '/:patientId/spaced-retrieval/settings',
  careLinkGuard('canViewProgress'),
  srController.getSettings,
);

spacedRetrievalRouter.put(
  '/:patientId/spaced-retrieval/settings',
  careLinkGuard('canEditReminders'),
  srController.upsertSettings,
);

// ─── Game Contacts ─────────────────────────────────────────────────────────────

spacedRetrievalRouter.get(
  '/:patientId/spaced-retrieval/game-contacts',
  careLinkGuard('canViewProgress'),
  srController.getGameContacts,
);

// ─── Memory Match Level Persistence ───────────────────────────────────────────

spacedRetrievalRouter.get(
  '/:patientId/memory-match/level',
  careLinkGuard('canViewProgress'),
  srController.getMemoryMatchLevel,
);

spacedRetrievalRouter.put(
  '/:patientId/memory-match/level',
  careLinkGuard('canViewProgress'), // patient can update their own level; caregiver can view
  srController.setMemoryMatchLevel,
);
