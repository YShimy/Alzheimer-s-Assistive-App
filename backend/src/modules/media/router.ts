import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { mediaController } from './controller/media.controller.js';
import { mediaService } from './service/media.service.js';
import type { Request, Response } from 'express';

// ─── Multer: memory storage (Vercel-safe, no local disk writes) ───────────────
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB — kept consistent with previous limit
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP images and MP4/MOV videos are allowed'));
    }
    cb(null, true);
  },
});

// ─── Router ──────────────────────────────────────────────────────────────────
export const mediaRouter = Router();

mediaRouter.use(authMiddleware);

mediaRouter.post('/upload', upload.single('file'), asyncHandler(mediaController.uploadMedia));
mediaRouter.get('/:id', asyncHandler(mediaController.getMedia));

// ─── Admin: re-stamp legacy local media URLs ─────────────────────────────────
// POST /api/media/restamp-urls
// Updates any remaining 'local' MediaAsset records to use the current API_PUBLIC_URL.
// Only relevant for old records created before the Supabase migration.
mediaRouter.post('/restamp-urls', asyncHandler(async (_req: Request, res: Response) => {
  // No longer needed for new uploads — kept for backward-compat with any legacy local records.
  res.json({
    success: true,
    message: 'Media is now stored in Supabase Storage. New uploads no longer need restamping.',
    updated: 0,
  });
}));
