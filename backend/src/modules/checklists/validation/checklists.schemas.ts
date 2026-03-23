import { z } from 'zod';

const checklistStepSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  order: z.number().int().min(0),
});

export const createTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  steps: z.array(checklistStepSchema).min(1, 'At least one step is required'),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const createRunSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
});

const stepProgressSchema = z.object({
  stepId: z.string(),
  completed: z.boolean(),
  completedAt: z.string().optional().nullable(),
});

export const updateRunSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'in_progress', 'completed', 'abandoned']).optional(),
  stepProgress: z.array(stepProgressSchema).optional(),
});
