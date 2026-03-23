import { apiClient } from '../../infrastructure/api/client';
import type { Reminder, CreateReminderInput, UpdateReminderInput, ReminderEvent, ReminderActionInput } from './types';

export const remindersApi = {
  async list(patientId: string, filters?: { active?: string; category?: string; pendingOnly?: boolean }): Promise<{ reminders: Reminder[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.active) params.set('active', filters.active);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.pendingOnly) params.set('pendingOnly', 'true');
    const qs = params.toString();
    return apiClient.get(`/patients/${patientId}/reminders${qs ? `?${qs}` : ''}`);
  },

  async create(patientId: string, data: CreateReminderInput): Promise<{ reminder: Reminder }> {
    return apiClient.post(`/patients/${patientId}/reminders`, data);
  },

  async getById(id: string): Promise<{ reminder: Reminder }> {
    return apiClient.get(`/reminders/${id}`);
  },

  async update(id: string, data: UpdateReminderInput): Promise<{ reminder: Reminder }> {
    return apiClient.patch(`/reminders/${id}`, data);
  },

  async archive(id: string): Promise<{ reminder: Reminder }> {
    return apiClient.patch(`/reminders/${id}/archive`);
  },

  async recordAction(id: string, data: ReminderActionInput): Promise<{ event: ReminderEvent }> {
    return apiClient.post(`/reminders/${id}/actions`, data);
  },
};
