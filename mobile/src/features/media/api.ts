import { apiClient } from '../../infrastructure/api/client';
import { createFormDataFile } from '@/src/platform/createFormDataFile';
import type { MediaAsset } from './types';

export const mediaApi = {
  async upload(fileUri: string, mimeType: string): Promise<{ asset: MediaAsset }> {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'upload';
    const fileObj = await createFormDataFile(fileUri, filename, mimeType);
    formData.append('file', fileObj);
    return apiClient.upload('/media/upload', formData);
  },

  async getAsset(id: string): Promise<{ asset: MediaAsset }> {
    return apiClient.get(`/media/${id}`);
  }
};
