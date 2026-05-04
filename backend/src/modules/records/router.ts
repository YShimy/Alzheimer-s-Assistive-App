import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { roleGuard } from '../../shared/middleware/roleGuard.middleware.js';
import { careLinkGuard } from '../../shared/middleware/careLinkGuard.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { recordsController } from './controller/records.controller.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only PDF, JPEG, PNG, WEBP are allowed'));
    }
    cb(null, true);
  },
});

export const recordsRouter = Router({ mergeParams: true });

// Require authenticated user
recordsRouter.use(authMiddleware);
// Require CAREGIVER role
recordsRouter.use(roleGuard('caregiver'));
// Require active CareLink with permission
recordsRouter.use(careLinkGuard('canManageRecords'));

// ─── Routes ──────────────────────────────────────────────────────────────────
// Base path is /api/patients/:patientId/documents

recordsRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(recordsController.uploadDocument)
);

recordsRouter.get(
  '/',
  asyncHandler(recordsController.listDocuments)
);

recordsRouter.get(
  '/:documentId',
  asyncHandler(recordsController.getDocument)
);

recordsRouter.get(
  '/:documentId/view-url',
  asyncHandler(recordsController.getViewUrl)
);

recordsRouter.patch(
  '/:documentId',
  asyncHandler(recordsController.updateDocument)
);

recordsRouter.delete(
  '/:documentId',
  asyncHandler(recordsController.archiveDocument)
);
