import { z } from 'zod/v4';

const reminderCategories = ['medication', 'appointment', 'task', 'hydration', 'meal', 'call', 'custom'] as const;

export const createReminderSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(reminderCategories).default('task'),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  repeatRule: z.any().optional(),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  description: z.string().max(1000).optional(),
  priority: z.number().int().min(1).max(3).default(1),
  linkedChecklistTemplateId: z.string().uuid().optional(),
  snoozeEnabled: z.boolean().default(true),
  defaultSnoozeMinutes: z.number().int().min(1).max(120).default(10),
});

export const updateReminderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.enum(reminderCategories).optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format').optional(),
  repeatRule: z.any().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  description: z.string().max(1000).nullable().optional(),
  priority: z.number().int().min(1).max(3).optional(),
  linkedChecklistTemplateId: z.string().uuid().nullable().optional(),
  snoozeEnabled: z.boolean().optional(),
  defaultSnoozeMinutes: z.number().int().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
});

export const patientIdParam = z.object({
  patientId: z.string().uuid(),
});

export const reminderIdParam = z.object({
  id: z.string().uuid(),
});

export const listRemindersQuery = z.object({
  active: z.string().optional(),
  category: z.enum(reminderCategories).optional(),
  pendingOnly: z.string().optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
