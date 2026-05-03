import { randomUUID } from 'crypto';
import { prisma } from '../../../shared/db/prisma.js';
import { supabaseAdmin, STORAGE_BUCKET } from '../../../shared/supabase/supabase.client.js';

// ─── Storage key helpers ──────────────────────────────────────────────────────

function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg': return 'jpg';
    case 'image/png':  return 'png';
    case 'image/webp': return 'webp';
    case 'video/mp4':  return 'mp4';
    case 'video/quicktime': return 'mov';
    default:           return 'bin';
  }
}

function buildStorageKey(uploadedByUserId: string, mimeType: string): string {
  const ext = getExtensionFromMimeType(mimeType);
  return `media/${uploadedByUserId}/${Date.now()}-${randomUUID()}.${ext}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const mediaService = {
  /**
   * Uploads an in-memory file (from multer.memoryStorage) to Supabase Storage,
   * then records the MediaAsset in the database.
   */
  async saveAsset(
    userId: string,
    file: Express.Multer.File,
    assetType: 'IMAGE' | 'VIDEO',
  ) {
    const storageKey = buildStorageKey(userId, file.mimetype);

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storageKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    // 2. Get the public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storageKey);

    const publicUrl = urlData.publicUrl;

    // 3. Persist the MediaAsset record
    const asset = await prisma.mediaAsset.create({
      data: {
        uploadedByUserId: userId,
        ownerUserId: userId,
        assetType,
        storageProvider: 'supabase',
        storageKey,
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
   * Deletes a media asset from Supabase Storage and removes the DB record.
   */
  async deleteAsset(id: string) {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return null;

    if (asset.storageProvider === 'supabase') {
      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([asset.storageKey]);

      if (error) {
        // Log but don't hard-fail — DB cleanup is more important
        console.warn(`[mediaService] Failed to delete from Supabase Storage: ${error.message}`);
      }
    }

    return prisma.mediaAsset.delete({ where: { id } });
  },
};
