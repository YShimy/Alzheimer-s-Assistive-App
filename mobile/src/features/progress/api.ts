import { apiClient } from '../../infrastructure/api/client';
import type { 
  ProgressOverviewResponse, 
  ProgressStreaksResponse, 
  ProgressCategoriesResponse, 
  ProgressChartsResponse 
} from './types';

export const progressApi = {
  async getOverview(patientId: string): Promise<ProgressOverviewResponse> {
    return apiClient.get(`/patients/${patientId}/progress/overview`);
  },

  async getStreaks(patientId: string): Promise<ProgressStreaksResponse> {
    return apiClient.get(`/patients/${patientId}/progress/streaks`);
  },

  async getCategories(patientId: string): Promise<ProgressCategoriesResponse> {
    return apiClient.get(`/patients/${patientId}/progress/categories`);
  },

  async getCharts(patientId: string): Promise<ProgressChartsResponse> {
    return apiClient.get(`/patients/${patientId}/progress/charts`);
  }
};
