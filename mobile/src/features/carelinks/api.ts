import { apiClient } from '../../infrastructure/api/client';
import type { CareLink, CareLinkPermissions } from './types';

export const carelinksApi = {
  async createInvite(): Promise<{ careLink: CareLink }> {
    return apiClient.post('/carelinks/invite');
  },

  async acceptInvite(inviteCode: string): Promise<{ careLink: CareLink }> {
    return apiClient.post('/carelinks/accept', { inviteCode });
  },

  async getMyLinks(): Promise<{ careLinks: CareLink[]; count: number }> {
    return apiClient.get('/carelinks/me');
  },

  async updatePermissions(id: string, permissions: Partial<CareLinkPermissions>): Promise<{ careLink: CareLink }> {
    return apiClient.patch(`/carelinks/${id}/permissions`, { permissions });
  },

  async revoke(id: string): Promise<{ careLink: CareLink }> {
    return apiClient.patch(`/carelinks/${id}/revoke`);
  },
};
