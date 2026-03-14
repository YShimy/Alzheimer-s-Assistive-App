import { apiClient } from '../../infrastructure/api/client';
import type { LoginResponse, AuthUser } from './types';

export const authApi = {
  /**
   * Exchange a Google ID token for a JWT.
   * Allows specifying a role during development/first login.
   */
  async loginWithGoogle(idToken: string, role?: 'PATIENT' | 'CAREGIVER'): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/google/mobile', { idToken, role });
  },

  async getMe(): Promise<{ user: AuthUser }> {
    return apiClient.get<{ user: AuthUser }>('/auth/me');
  },

  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },
};
