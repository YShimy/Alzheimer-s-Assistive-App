import { z } from 'zod/v4';

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  language: z.enum(['ar', 'en']).optional(),
  timezone: z.string().min(1).max(100).optional(),
  accessibilitySettings: z.object({
    textSize: z.enum(['small', 'medium', 'large']).optional(),
    highContrast: z.boolean().optional(),
    audioCuesEnabled: z.boolean().optional(),
  }).optional(),
  preferredNotificationMode: z.enum(['push', 'local', 'silent']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
