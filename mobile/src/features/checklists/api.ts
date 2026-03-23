import { apiClient } from '../../infrastructure/api/client';
import type {
  ChecklistTemplate,
  CreateChecklistTemplateInput,
  UpdateChecklistTemplateInput,
  ChecklistRun,
  CreateRunInput,
  UpdateRunInput,
} from './types';

/**
 * Checklist API client.
 *
 * NOTE: The backend checklist endpoints currently return HTTP 501 (Not Implemented).
 * All calls will throw an ApiError with code NOT_IMPLEMENTED.
 * The frontend handles this gracefully and shows an appropriate state.
 * Wire the real implementation here once the backend is ready.
 */
export const checklistsApi = {
  // ─── Templates ────────────────────────────────────────────────────────────

  async listTemplates(): Promise<{ templates: ChecklistTemplate[] }> {
    return apiClient.get('/checklists/templates');
  },

  async createTemplate(
    data: CreateChecklistTemplateInput,
  ): Promise<{ template: ChecklistTemplate }> {
    return apiClient.post('/checklists/templates', data);
  },

  async updateTemplate(
    id: string,
    data: UpdateChecklistTemplateInput,
  ): Promise<{ template: ChecklistTemplate }> {
    return apiClient.patch(`/checklists/templates/${id}`, data);
  },

  async archiveTemplate(id: string): Promise<{ template: ChecklistTemplate }> {
    return apiClient.patch(`/checklists/templates/${id}/archive`);
  },

  // ─── Runs ────────────────────────────────────────────────────────────────

  async startRun(data: CreateRunInput): Promise<{ run: ChecklistRun }> {
    return apiClient.post('/checklists/runs', data);
  },

  async updateRun(id: string, data: UpdateRunInput): Promise<{ run: ChecklistRun }> {
    return apiClient.patch(`/checklists/runs/${id}`, data);
  },

  async getActiveRuns(): Promise<{ runs: ChecklistRun[] }> {
    return apiClient.get('/checklists/runs?status=in_progress');
  },
};
