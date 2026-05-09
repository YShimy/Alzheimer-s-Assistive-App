/**
 * Notifications API
 *
 * Push notification token registration and in-app notification inbox.
 */

import { apiClient } from '../../infrastructure/api/client';
import type { Platform } from 'react-native';

export interface AppNotification {
  id: string;
  type: 'ESCALATION' | 'SYSTEM';
  title: string;
  body: string;
  isRead: boolean;
  payload: Record<string, any> | null;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
}

export const notificationsApi = {
  /**
   * Register push token for the current device
   */
  async registerPushToken(
    pushToken: string,
    platform: 'ios' | 'android' | 'unknown' = 'unknown',
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/notifications/register-push-token', { pushToken, platform });
  },

  /**
   * Unregister push token (e.g., on logout)
   * Pass pushToken to remove a specific device, omit to remove all.
   */
  async unregisterPushToken(pushToken?: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/notifications/unregister-push-token', pushToken ? { pushToken } : {});
  },

  /**
   * List notifications for the current user (in-app inbox)
   */
  async listNotifications(page = 1, limit = 30): Promise<NotificationsListResponse> {
    return apiClient.get(`/notifications?page=${page}&limit=${limit}`);
  },

  /**
   * Get unread count (for badge)
   */
  async getUnreadCount(): Promise<{ unreadCount: number }> {
    return apiClient.get('/notifications/unread-count');
  },

  /**
   * Mark a single notification as read
   */
  async markRead(notificationId: string): Promise<{ success: boolean }> {
    return apiClient.post(`/notifications/${notificationId}/read`, {});
  },

  /**
   * Mark all notifications as read
   */
  async markAllRead(): Promise<{ success: boolean }> {
    return apiClient.post('/notifications/read-all', {});
  },
};
