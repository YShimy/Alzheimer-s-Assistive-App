export type AssetType = 'IMAGE' | 'VIDEO';

export interface MediaAsset {
  id: string;
  ownerUserId: string | null;
  uploadedByUserId: string;
  assetType: AssetType;
  storageProvider: string;
  storageKey: string;
  publicUrl: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
