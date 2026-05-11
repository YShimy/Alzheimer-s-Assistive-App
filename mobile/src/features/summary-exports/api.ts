import { apiClient } from '../../infrastructure/api/client';

export type SummaryExport = {
  id: string;
  patientId: string;
  generatedByUserId: string;
  rangeStart: string;
  rangeEnd: string;
  title?: string;
  status: 'COMPLETED' | 'ARCHIVED' | 'FAILED';
  fileSizeBytes?: number;
  mimeType: string;
  includedSections?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
};

export type CreateExportInput = {
  rangePreset: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  language?: 'en' | 'ar';
  sections?: {
    importantInfo?: boolean;
    reminders?: boolean;
    checklists?: boolean;
    games?: boolean;
    patientRecords?: boolean;
    timeline?: boolean;
  };
};

export const summaryExportsApi = {
  async create(
    patientId: string,
    input: CreateExportInput,
  ): Promise<{ export: SummaryExport; downloadUrl: string; expiresInSeconds: number }> {
    return apiClient.post(`/patients/${patientId}/summary-exports`, input);
  },

  async list(patientId: string): Promise<{ exports: SummaryExport[] }> {
    return apiClient.get(`/patients/${patientId}/summary-exports`);
  },

  async get(patientId: string, exportId: string): Promise<{ export: SummaryExport }> {
    return apiClient.get(`/patients/${patientId}/summary-exports/${exportId}`);
  },

  async getDownloadUrl(
    patientId: string,
    exportId: string,
  ): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
    return apiClient.get(`/patients/${patientId}/summary-exports/${exportId}/download-url`);
  },

  async archive(patientId: string, exportId: string): Promise<{ export: SummaryExport }> {
    return apiClient.delete(`/patients/${patientId}/summary-exports/${exportId}`);
  },
};
