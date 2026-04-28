import type { Request, Response } from 'express';
import { mediaService } from '../service/media.service.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { prisma } from '../../../shared/db/prisma.js';

export const mediaController = {
  async uploadMedia(req: Request, res: Response) {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }
    const userId = req.user!.userId;
    const isVideo = req.file.mimetype.startsWith('video/');
    const assetType = isVideo ? 'VIDEO' : 'IMAGE';

    const asset = await mediaService.saveAsset(userId, req.file, assetType);
    res.json({ asset });
  },

  async getMedia(req: Request, res: Response) {
    const id = req.params.id as string;
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new AppError('Asset not found', 404);
    res.json({ asset });
  }
};
