import { z } from 'zod/v4';

export const inviteSchema = z.object({
  patientEmail: z.string().email().optional(),
});

export const acceptSchema = z.object({
  inviteCode: z.string().min(1, 'inviteCode is required'),
});

export const updatePermissionsSchema = z.object({
  permissions: z.object({
    canCreateReminders: z.boolean().optional(),
    canEditReminders: z.boolean().optional(),
    canViewProgress: z.boolean().optional(),
    canCreateChecklists: z.boolean().optional(),
    canEditChecklists: z.boolean().optional(),
    canMarkTasksOnBehalf: z.boolean().optional(),
  }),
});

export const careLinkIdParam = z.object({
  id: z.string().uuid(),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type AcceptInput = z.infer<typeof acceptSchema>;
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;
