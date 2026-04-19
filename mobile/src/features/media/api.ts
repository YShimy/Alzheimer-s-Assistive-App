import { Platform } from 'react-native';
import { apiClient } from '../../infrastructure/api/client';
import type { MediaAsset } from './types';

export const mediaApi = {
  async upload(fileUri: string, mimeType: string): Promise<{ asset: MediaAsset }> {
    const formData = new FormData();
    
    // In React Native, we need to provide name and type for file upload
    const filename = fileUri.split('/').pop() || 'upload';
    
    formData.append('file', {
      uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
      name: filename,
      type: mimeType,
    } as any);

    return apiClient.upload('/media/upload', formData);
  },

  async getAsset(id: string): Promise<{ asset: MediaAsset }> {
    return apiClient.get(`/media/${id}`);
  }
};
