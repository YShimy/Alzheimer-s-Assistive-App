/** Auth module types */

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

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

export interface MeResponse {
  user: {
    id: string;
    role: string;
    displayName: string;
    email: string;
    language: string;
    timezone: string;
    isActive: boolean;
    lastSeenAt: string | null;
  };
}

export interface SignupRequestCodeResponse {
  ok: boolean;
  cooldownSeconds: number;
}

export interface SignupVerifyCodeResponse {
  ok: boolean;
  verificationToken: string;
}
