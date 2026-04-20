import { AppError } from '../../../shared/errors/AppError.js';
import { prisma } from '../../../shared/db/prisma.js';
import { env } from '../../../shared/config/env.js';

export const mediaService = {
  async saveAsset(userId: string, file: Express.Multer.File, assetType: 'IMAGE'|'VIDEO') {
    // Use API_BASE_URL to construct full URL for media access
    const baseUrl = env.API_BASE_URL.replace(/\/$/, '');
    const publicUrl = `${baseUrl}/uploads/${file.filename}`;

    const asset = await prisma.mediaAsset.create({
      data: {
         uploadedByUserId: userId,
         ownerUserId: userId,
         assetType,
         storageProvider: 'local',
         storageKey: file.filename,
         publicUrl,
         mimeType: file.mimetype,
      }
    });
    return asset;
  }
};
