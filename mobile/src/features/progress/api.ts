import { apiClient } from '../../infrastructure/api/client';
import type { ProgressOverviewResponse, WeeklyProgressResponse } from './types';

export const progressApi = {
  async getOverview(patientId: string): Promise<ProgressOverviewResponse> {
    return apiClient.get(`/patients/${patientId}/progress/overview`);
  },
  async getWeekly(patientId: string): Promise<WeeklyProgressResponse> {
    return apiClient.get(`/patients/${patientId}/progress/weekly`);
  }
};
