/** Checklists feature types */

export type ChecklistCategory = 'morning' | 'evening' | 'medication' | 'hygiene' | 'activity' | 'custom';

export interface ChecklistStep {
  id: string;
  order: number;
  title: string;
  description?: string | null;
  imageAssetId?: string | null;
  videoAssetId?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  description?: string | null;
  category: ChecklistCategory | string;
  steps: ChecklistStep[];
  estimatedMinutes?: number | null;
  isActive: boolean;
  archivedAt?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChecklistTemplateInput {
  title: string;
  description?: string;
  category?: string;
  estimatedMinutes?: number;
  steps: { 
    title: string; 
    description?: string; 
    order: number;
    imageAssetId?: string | null;
    videoAssetId?: string | null;
  }[];
}

export interface UpdateChecklistTemplateInput extends Partial<CreateChecklistTemplateInput> {}

// ─── Checklist Run ───────────────────────────────────────────

export type RunStatus = 'in_progress' | 'completed' | 'abandoned';

export interface StepProgress {
  stepId: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface ChecklistRun {
  id: string;
  templateId: string;
  patientUserId: string;
  status: RunStatus;
  stepProgress: StepProgress[];
  startedAt: string;
  completedAt?: string | null;
  template?: Pick<ChecklistTemplate, 'id' | 'title' | 'steps'>;
}

export interface CreateRunInput {
  templateId: string;
}

export interface UpdateRunInput {
  status?: RunStatus;
  stepProgress?: StepProgress[];
}
