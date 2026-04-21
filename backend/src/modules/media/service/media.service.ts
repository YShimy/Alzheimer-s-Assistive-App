import { AppError } from '../../../shared/errors/AppError.js';
import { prisma } from '../../../shared/db/prisma.js';
import { env } from '../../../shared/config/env.js';

// Redesigned: Helper to get device-reachable URL for Expo Go
function getDeviceReachableUrl(): string {
  // Prefer API_DEVICE_URL if set (should be LAN IP like http://192.168.x.x:4000)
  if (env.API_DEVICE_URL) {
    return env.API_DEVICE_URL.replace(/\/$/, '');
  }
  
  // In development, try to auto-detect LAN IP for better Expo Go experience
  if (env.NODE_ENV === 'development') {
    const os = process.platform;
    // Return localhost for web/simulator, but device URL should be set explicitly for real devices
    return env.API_BASE_URL.replace(/\/$/, '');
  }
  
  return env.API_BASE_URL.replace(/\/$/, '');
}

export const mediaService = {
  async saveAsset(userId: string, file: Express.Multer.File, assetType: 'IMAGE'|'VIDEO') {
    // Redesigned: Use device-reachable URL for media access
    const baseUrl = getDeviceReachableUrl();
    const publicUrl = `${baseUrl}/uploads/${file.filename}`;
    
    // Also store localhost URL for server-side use if device URL is different
    const serverUrl = env.API_BASE_URL.replace(/\/$/, '');
    const localUrl = serverUrl !== baseUrl ? `${serverUrl}/uploads/${file.filename}` : undefined;

    const asset = await prisma.mediaAsset.create({
      data: {
         uploadedByUserId: userId,
         ownerUserId: userId,
         assetType,
         storageProvider: 'local',
         storageKey: file.filename,
         publicUrl,
         // Redesigned: store alternative URL for server use
         thumbnailUrl: localUrl,
         mimeType: file.mimetype,
      }
    });
    return asset;
  },
  
  // Redesigned: Get media URL appropriate for the client type
  getMediaUrl(assetId: string, forDevice: boolean = false): string {
    const baseUrl = forDevice ? getDeviceReachableUrl() : env.API_BASE_URL.replace(/\/$/, '');
    return `${baseUrl}/api/media/${assetId}`;
  },
  
  // Redesigned: Transform asset to use device-reachable URL
  transformAssetForDevice(asset: any): any {
    if (!asset) return asset;
    
    const deviceUrlBase = getDeviceReachableUrl();
    
    return {
      ...asset,
      // Use device-reachable URL for publicUrl
      publicUrl: asset.publicUrl?.replace(env.API_BASE_URL.replace(/\/$/, ''), deviceUrlBase),
      thumbnailUrl: asset.thumbnailUrl?.replace(env.API_BASE_URL.replace(/\/$/, ''), deviceUrlBase),
    };
  }
};
