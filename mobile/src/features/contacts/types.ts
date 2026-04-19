import { AssetType } from "../media/types";

export type ConsentStatus = 'PENDING' | 'GRANTED' | 'REVOKED';

export interface ContactSupportConsent {
  id: string;
  patientUserId: string;
  status: ConsentStatus;
  grantedAt: string | null;
  revokedAt: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientContact {
  id: string;
  patientUserId: string;
  sourceType: 'DEVICE_CONTACTS' | 'MANUAL';
  sourceContactId: string | null;
  displayName: string;
  normalizedPhones: string[] | null;
  normalizedEmails: string[] | null;
  importedAt: string;
  lastSyncedAt: string | null;
  isArchived: boolean;
  memo?: ContactMemo;
}

export interface ContactMemo {
  id: string;
  patientContactId: string;
  patientUserId: string;
  createdByUserId: string;
  relationLabel: string | null;
  shortMemo: string | null;
  photoAssetId: string | null;
  isArchived: boolean;
  patientFavorite: boolean;
  caregiverFavorite: boolean;
  patientPriorityRank: number | null;
  caregiverPriorityRank: number | null;
  photoAsset?: {
    id: string;
    publicUrl: string;
    assetType: AssetType;
  } | null;
}

export interface ImportContactInput {
  id?: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
}
