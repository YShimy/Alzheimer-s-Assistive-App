export type PatientDocumentCategory =
  | 'PRESCRIPTION'
  | 'LAB_RESULT'
  | 'SCAN_IMAGING'
  | 'DOCTOR_VISIT_NOTE'
  | 'DISCHARGE_SUMMARY'
  | 'MEDICATION_PLAN'
  | 'CARE_PLAN'
  | 'ADMINISTRATIVE'
  | 'OTHER';

export type PatientDocumentStatus = 'ACTIVE' | 'ARCHIVED';

export interface PatientDocument {
  id: string;
  patientId: string;
  uploadedByUserId: string;
  title: string;
  category: PatientDocumentCategory;
  documentDate?: string;
  sourceName?: string;
  notes?: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: PatientDocumentStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface UploadDocumentInput {
  title: string;
  category: PatientDocumentCategory;
  documentDate?: string;
  sourceName?: string;
  notes?: string;
  fileUri: string;
  mimeType: string;
  fileName: string;
}

export interface UpdateDocumentInput {
  title?: string;
  category?: PatientDocumentCategory;
  documentDate?: string;
  sourceName?: string;
  notes?: string;
}
