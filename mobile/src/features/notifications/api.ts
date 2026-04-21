/**
 * Notifications API
 * 
 * Push notification token registration.
 */

import { apiClient } from '../../infrastructure/api/client';

export const notificationsApi = {
  /**
   * Register push token for the current user
   */
  async registerPushToken(pushToken: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post('/notifications/register-push-token', { pushToken });
    return data;
  },

  /**
   * Unregister push token (e.g., on logout)
   */
  async unregisterPushToken(): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post('/notifications/unregister-push-token');
    return data;
  },
};
