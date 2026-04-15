import { z } from 'zod/v4';

// ─── Shared Helpers ─────────────────────────────────────────

const emailField = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .transform((v) => v.trim().toLowerCase());

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ─── POST /api/auth/google/mobile ───────────────────────────

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

// ─── POST /api/auth/signup/request-code ─────────────────────

export const signupRequestCodeSchema = z.object({
  email: emailField,
});

export type SignupRequestCodeInput = z.infer<typeof signupRequestCodeSchema>;

// ─── POST /api/auth/signup/verify-code ──────────────────────

export const signupVerifyCodeSchema = z.object({
  email: emailField,
  code: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});

export type SignupVerifyCodeInput = z.infer<typeof signupVerifyCodeSchema>;

// ─── POST /api/auth/signup/complete ─────────────────────────

export const signupCompleteSchema = z.object({
  verificationToken: z.string().min(1, 'Verification token is required'),
  password: passwordField,
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(18, 'Age must be at least 18')
    .max(120, 'Age must be at most 120'),
  role: z.enum(['patient', 'caregiver']).optional().default('patient'),
});

export type SignupCompleteInput = z.infer<typeof signupCompleteSchema>;

// ─── POST /api/auth/signin ──────────────────────────────────

export const signinSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export type SigninInput = z.infer<typeof signinSchema>;

// ─── POST /api/auth/signup/resend-code ──────────────────────

export const resendCodeSchema = z.object({
  email: emailField,
});

export type ResendCodeInput = z.infer<typeof resendCodeSchema>;
