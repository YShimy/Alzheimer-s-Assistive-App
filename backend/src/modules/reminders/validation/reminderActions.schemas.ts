import { z } from 'zod/v4';

const actionTypes = ['done', 'snooze', 'skip'] as const;
const sources = ['notification', 'home', 'reminder_list', 'caregiver_panel'] as const;

export const reminderActionSchema = z.object({
  action: z.enum(actionTypes),
  scheduledFor: z.string().datetime().optional(),
  source: z.enum(sources).default('home'),
  actionValue: z.any().optional(),
  reasonCode: z.string().max(100).optional(),
});

export const reminderActionIdParam = z.object({
  id: z.string().uuid(),
});

export type ReminderActionInput = z.infer<typeof reminderActionSchema>;
