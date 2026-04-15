/** Auth feature types — matches backend API contract */

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    role: string;
    displayName: string;
    email: string;
    language: string;
  };
  nextStep?: string;
}

export interface AuthUser {
  id: string;
  role: string;
  displayName: string;
  email: string;
  language: string;
  timezone: string;
  isActive: boolean;
  lastSeenAt: string | null;
}

export interface SignupRequestCodeResponse {
  ok: boolean;
  cooldownSeconds: number;
}

export interface SignupVerifyCodeResponse {
  ok: boolean;
  verificationToken: string;
}
