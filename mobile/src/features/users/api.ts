import { apiClient } from '../../infrastructure/api/client';
import type { UserProfile, UpdateUserInput } from './types';

export const usersApi = {
  async getMe(): Promise<{ user: UserProfile }> {
    return apiClient.get('/users/me');
  },

  async updateMe(data: UpdateUserInput): Promise<{ user: UserProfile }> {
    return apiClient.patch('/users/me', data);
  },
};
