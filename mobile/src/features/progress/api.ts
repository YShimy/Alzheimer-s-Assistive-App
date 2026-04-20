import { apiClient } from '../../infrastructure/api/client';
import type { 
  ProgressOverviewResponse, 
  ProgressStreaksResponse, 
  ProgressCategoriesResponse, 
  ProgressChartsResponse,
  ProgressChecklistTrackingResponse,
  WeeklyProgressResponse,
  GameProgressSummary
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
  },

  async getChecklistTracking(patientId: string): Promise<ProgressChecklistTrackingResponse> {
    return apiClient.get(`/patients/${patientId}/progress/checklists`);
  },

  async getWeekly(patientId: string): Promise<WeeklyProgressResponse> {
    return apiClient.get(`/patients/${patientId}/progress/weekly`);
  },

  async getGameProgress(patientId: string, gameType: string): Promise<GameProgressSummary> {
    return apiClient.get(`/patients/${patientId}/progress/game?gameType=${gameType}`);
  }
};
