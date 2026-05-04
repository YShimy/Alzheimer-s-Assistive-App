import { apiClient } from '../../infrastructure/api/client';
import { Platform } from 'react-native';
import type { PatientDocument, UploadDocumentInput, UpdateDocumentInput } from './types';

export const recordsApi = {
  async listDocuments(
    patientId: string,
    filters?: { category?: string; includeArchived?: boolean }
  ): Promise<{ documents: PatientDocument[] }> {
    let url = `/patients/${patientId}/documents`;
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.includeArchived) params.append('includeArchived', 'true');
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return apiClient.get(url);
  },

  async getDocument(patientId: string, documentId: string): Promise<PatientDocument> {
    return apiClient.get(`/patients/${patientId}/documents/${documentId}`);
  },

  async getViewUrl(
    patientId: string,
    documentId: string
  ): Promise<{ url: string; expiresInSeconds: number }> {
    return apiClient.get(`/patients/${patientId}/documents/${documentId}/view-url`);
  },

  async updateDocument(
    patientId: string,
    documentId: string,
    data: UpdateDocumentInput
  ): Promise<PatientDocument> {
    return apiClient.patch(`/patients/${patientId}/documents/${documentId}`, data);
  },

  async archiveDocument(patientId: string, documentId: string): Promise<void> {
    return apiClient.delete(`/patients/${patientId}/documents/${documentId}`);
  },

  async uploadDocument(patientId: string, data: UploadDocumentInput): Promise<PatientDocument> {
    // Use apiClient.upload() — NOT post() — so the fetch boundary is set correctly
    // and Content-Type is NOT forced to application/json.
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('category', data.category);
    if (data.documentDate) formData.append('documentDate', data.documentDate);
    if (data.sourceName) formData.append('sourceName', data.sourceName);
    if (data.notes) formData.append('notes', data.notes);

    // React Native requires a special object shape for file blobs in FormData
    const fileExt = data.fileName.split('.').pop() ?? 'bin';
    const mimeType = data.mimeType || (fileExt === 'pdf' ? 'application/pdf' : 'application/octet-stream');

    formData.append('file', {
      uri: Platform.OS === 'android' ? data.fileUri : data.fileUri.replace('file://', ''),
      name: data.fileName || `upload.${fileExt}`,
      type: mimeType,
    } as any);

    return apiClient.upload(`/patients/${patientId}/documents`, formData);
  },
};
