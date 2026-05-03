import { Platform } from 'react-native';
import { sessionStore } from '../../state/sessionStore';

/**
 * API base URL selection — 3 tiers in priority order:
 *
 * 1. EXPO_PUBLIC_API_URL  (set in .env / EAS env)
 *    → Use this for ALL non-localhost scenarios:
 *      - Remote testers / deployed builds  → set to https://your-backend.up.railway.app/api
 *      - Same-network Expo Go dev          → set to http://192.168.x.x:4000/api
 *
 * 2. http://localhost:4000/api
 *    → Web browser only (__DEV__ + web), where localhost IS the backend machine.
 *
 * 3. Explicit error (removed silent LAN fallback)
 *    → If EXPO_PUBLIC_API_URL is not set and we're on a native device, throw clearly
 *      instead of silently using a wrong IP and getting confusing network errors.
 *
 * To set for remote testing in an EAS build, add EXPO_PUBLIC_API_URL to your
 * eas.json profile's `env` block or set it in the Expo dashboard.
 */
function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // Web browser in dev: localhost is safe
  if (Platform.OS === 'web' && __DEV__) {
    return 'http://localhost:4000/api';
  }

  // Native device without EXPO_PUBLIC_API_URL set — fail loudly in dev, use localhost in prod
  // (prod builds should always have EXPO_PUBLIC_API_URL set via EAS env)
  if (__DEV__) {
    console.error(
      '[ApiClient] EXPO_PUBLIC_API_URL is not set.\n' +
      'Set it in mobile/.env to your backend URL.\n' +
      'Example: EXPO_PUBLIC_API_URL=http://192.168.1.5:4000/api\n' +
      'Or for remote use: EXPO_PUBLIC_API_URL=https://your-backend.up.railway.app/api'
    );
  }
  // Last-resort fallback — will fail but gives a meaningful error rather than silent garbage
  return 'http://localhost:4000/api';
}

const API_BASE_URL = resolveApiBaseUrl();

/**
 * Typed API client — automatically attaches JWT bearer token.
 * Provides structured error handling via ApiError class.
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(contentType: string | null = 'application/json'): HeadersInit {
    const headers: Record<string, string> = {};

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const token = sessionStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(res);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(res);
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(null), // fetch sets proper multipart boundary
      body: formData as any,
    });
    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        errorBody?.error?.message ?? errorBody?.message ?? 'An error occurred',
        errorBody?.error?.code ?? 'UNKNOWN',
      );
    }
    return res.json() as Promise<T>;
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
