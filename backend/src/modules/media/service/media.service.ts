import { AppError } from '../../../shared/errors/AppError.js';
import { prisma } from '../../../shared/db/prisma.js';
import { env } from '../../../shared/config/env.js';

export const mediaService = {
  async saveAsset(userId: string, file: Express.Multer.File, assetType: 'IMAGE'|'VIDEO') {
    // Determine base URL dynamically or fallback to localhost
    const baseUrl = env.CLIENT_APP_URL ? env.CLIENT_APP_URL.replace(/:[0-9]+$/, `:${env.PORT}`) : `http://localhost:${env.PORT || 4000}`;
    const publicUrl = `/uploads/${file.filename}`; // Or absolute path if needed, relative makes more sense when served statically.

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
