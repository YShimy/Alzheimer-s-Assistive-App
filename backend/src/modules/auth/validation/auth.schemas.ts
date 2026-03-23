import { z } from 'zod/v4';

/**
 * Schema for POST /api/auth/google/mobile
 * Role is NOT accepted from the client — it is determined by the database.
 * Only the Google ID token is required.
 */
export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
