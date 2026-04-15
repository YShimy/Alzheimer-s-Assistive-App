import { apiClient } from '../../infrastructure/api/client';
import type {
  LoginResponse,
  AuthUser,
  SignupRequestCodeResponse,
  SignupVerifyCodeResponse,
} from './types';

export const authApi = {
  // ─── Signup Flow ────────────────────────────────────────────

  /** Request a 6-digit verification code for email signup */
  async signupRequestCode(email: string): Promise<SignupRequestCodeResponse> {
    return apiClient.post<SignupRequestCodeResponse>('/auth/signup/request-code', { email });
  },

  /** Verify the 6-digit code */
  async signupVerifyCode(email: string, code: string): Promise<SignupVerifyCodeResponse> {
    return apiClient.post<SignupVerifyCodeResponse>('/auth/signup/verify-code', { email, code });
  },

  /** Complete registration with password, name, age, and role */
  async signupComplete(data: {
    verificationToken: string;
    password: string;
    displayName: string;
    age: number;
    role?: 'patient' | 'caregiver';
  }): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/signup/complete', data);
  },

  /** Resend verification code */
  async signupResendCode(email: string): Promise<SignupRequestCodeResponse> {
    return apiClient.post<SignupRequestCodeResponse>('/auth/signup/resend-code', { email });
  },

  // ─── Sign In ────────────────────────────────────────────────

  /** Email + password sign-in */
  async signin(email: string, password: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/signin', { email, password });
  },

  // ─── Google Sign-In ─────────────────────────────────────────

  /** Exchange a verified Google ID token for an app JWT */
  async loginWithGoogle(idToken: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/google/mobile', { idToken });
  },

  // ─── Session ────────────────────────────────────────────────

  async getMe(): Promise<{ user: AuthUser }> {
    return apiClient.get<{ user: AuthUser }>('/auth/me');
  },

  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },

  /** DEV ONLY — quick login as a seed user for the given role */
  async devLogin(role: 'PATIENT' | 'CAREGIVER'): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/dev-login', { role });
  },
};
