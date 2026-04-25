import { prisma } from '../../../shared/db/prisma.js';
import { env } from '../../../shared/config/env.js';

/**
 * Returns the base URL used to generate public-facing media asset URLs.
 *
 * Priority (highest to lowest):
 *   1. API_PUBLIC_URL  — deployed/tunneled public URL (Railway, Render, ngrok, etc.)
 *                        Use this for any tester not on your LAN.
 *   2. API_DEVICE_URL  — LAN/hotspot IP (e.g. http://172.20.10.5:4000)
 *                        Use this for same-network Expo Go dev only.
 *   3. API_BASE_URL    — defaults to http://localhost:4000
 *                        Usable only from the same machine (e.g. web browser).
 *
 * To fix media URLs for remote testers: set API_PUBLIC_URL in backend .env.
 */
export function getPublicBaseUrl(): string {
  const raw = env.API_PUBLIC_URL ?? env.API_DEVICE_URL ?? env.API_BASE_URL;
  return raw.trim().replace(/\/$/, '');
}

export const mediaService = {
  async saveAsset(userId: string, file: Express.Multer.File, assetType: 'IMAGE' | 'VIDEO') {
    const base = getPublicBaseUrl();
    const publicUrl = `${base}/uploads/${file.filename}`;

    const asset = await prisma.mediaAsset.create({
      data: {
        uploadedByUserId: userId,
        ownerUserId: userId,
        assetType,
        storageProvider: 'local',
        storageKey: file.filename,
        publicUrl,
        mimeType: file.mimetype,
      },
    });
    return asset;
  },

  async getAsset(id: string) {
    return prisma.mediaAsset.findUnique({ where: { id } });
  },

  /**
   * Re-stamps the publicUrl of an existing asset using the current API_PUBLIC_URL.
   * Call this after updating API_PUBLIC_URL to fix URLs stored in the database.
   *
   * Example (run once via ts-node or a migration script):
   *   await mediaService.restampAllPublicUrls();
   */
  async restampAllPublicUrls() {
    const base = getPublicBaseUrl();
    const all = await prisma.mediaAsset.findMany({
      where: { storageProvider: 'local' },
      select: { id: true, storageKey: true },
    });
    let updated = 0;
    for (const asset of all) {
      const newUrl = `${base}/uploads/${asset.storageKey}`;
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { publicUrl: newUrl },
      });
      updated++;
    }
    return { updated };
  },
};
