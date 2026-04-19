import { apiClient } from '../../infrastructure/api/client';
import type {
  ChecklistTemplate,
  CreateChecklistTemplateInput,
  UpdateChecklistTemplateInput,
  ChecklistRun,
  CreateRunInput,
  UpdateRunInput,
} from './types';

export const checklistsApi = {
  // ─── Templates ────────────────────────────────────────────────────────────
  
  /**
   * List templates. 
   * @param patientId ID of the patient.
   */
  async listTemplates(patientId: string): Promise<{ templates: ChecklistTemplate[] }> {
    return apiClient.get(`/patients/${patientId}/checklists/templates`);
  },

  /**
   * Create a new template.
   * @param patientId Target patient ID.
   * @param data Template data.
   */
  async createTemplate(patientId: string, data: CreateChecklistTemplateInput): Promise<{ template: ChecklistTemplate }> {
    return apiClient.post(`/patients/${patientId}/checklists/templates`, data);
  },

  async updateTemplate(id: string, data: Partial<CreateChecklistTemplateInput>): Promise<{ template: ChecklistTemplate }> {
    return apiClient.patch(`/checklists/templates/${id}`, data);
  },

  async archiveTemplate(id: string): Promise<void> {
    return apiClient.patch(`/checklists/templates/${id}/archive`);
  },

  // ─── Runs ────────────────────────────────────────────────────────────────

  async startRun(patientId: string, data: CreateRunInput): Promise<{ run: ChecklistRun }> {
    return apiClient.post(`/patients/${patientId}/checklists/runs`, data);
  },

  async updateRun(id: string, data: UpdateRunInput): Promise<{ run: ChecklistRun }> {
    return apiClient.patch(`/checklists/runs/${id}`, data);
  },

  async getActiveRuns(patientId: string): Promise<{ runs: ChecklistRun[] }> {
    return apiClient.get(`/patients/${patientId}/checklists/runs`);
  },
};
