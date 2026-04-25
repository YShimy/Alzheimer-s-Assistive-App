import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { mediaController } from './controller/media.controller.js';

import * as fs from 'fs';

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max for short videos
});

export const mediaRouter = Router();

mediaRouter.use(authMiddleware);

mediaRouter.post('/upload', upload.single('file'), asyncHandler(mediaController.uploadMedia));
mediaRouter.get('/:id', asyncHandler(mediaController.getMedia));

// ─── Admin: re-stamp all local media URLs ────────────────────────────────────
// POST /api/media/restamp-urls
// Bulk-updates all MediaAsset.publicUrl records to use the current API_PUBLIC_URL.
// Run this once after changing API_PUBLIC_URL (e.g. after deploying backend publicly).
import { mediaService } from './service/media.service.js';
import type { Request, Response } from 'express';
mediaRouter.post('/restamp-urls', asyncHandler(async (_req: Request, res: Response) => {
  const result = await mediaService.restampAllPublicUrls();
  res.json({ success: true, ...result });
}));
