import { apiClient } from '../../infrastructure/api/client';
import type { LoginResponse, AuthUser } from './types';

export const authApi = {
  /**
   * Exchange a verified Google ID token for an app JWT.
   * Role is NOT sent — the backend determines it from the database.
   */
  async loginWithGoogle(idToken: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/google/mobile', { idToken });
  },

  async getMe(): Promise<{ user: AuthUser }> {
    return apiClient.get<{ user: AuthUser }>('/auth/me');
  },

  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },

  /** DEV ONLY — quick login as a seed user for the given role */
  async devLogin(role: 'PATIENT' | 'CAREGIVER'): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/dev-login', { role });
  },
};
