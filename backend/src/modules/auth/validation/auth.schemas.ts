import { z } from 'zod/v4';

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
  role: z.enum(['PATIENT', 'CAREGIVER']).optional(),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
