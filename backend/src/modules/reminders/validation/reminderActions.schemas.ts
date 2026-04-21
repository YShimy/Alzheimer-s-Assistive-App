import { z } from 'zod/v4';

// Redesigned: expanded action types for simple vs guided reminders
// Simple reminders: done, snooze, skip
// Guided reminders: start_now, snooze, skip
const actionTypes = ['done', 'snooze', 'skip', 'start_now'] as const;
const sources = ['notification', 'home', 'reminder_list', 'caregiver_panel', 'checklist_flow'] as const;

export const reminderActionSchema = z.object({
  action: z.enum(actionTypes),
  scheduledFor: z.string().datetime().optional(),
  source: z.enum(sources).default('home'),
  // Redesigned: actionValue now supports checklistRunId for guided reminders
  actionValue: z.object({
    snoozeDurationMinutes: z.number().optional(),
    checklistRunId: z.string().uuid().optional(),
    checklistTemplateId: z.string().uuid().optional(),
  }).optional(),
  reasonCode: z.string().max(100).optional(),
});

export const reminderActionIdParam = z.object({
  id: z.string().uuid(),
});

export type ReminderActionInput = z.infer<typeof reminderActionSchema>;
