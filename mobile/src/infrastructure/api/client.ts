import { Platform } from 'react-native';
import { sessionStore } from '../../state/sessionStore';

/**
 * API base URL selection.
 *
 * EXPO_PUBLIC_API_URL must be set for all builds (native and web).
 * No localhost or hardcoded IPs are used — the env variable is the single source of truth.
 */
function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl.trim().replace(/\/$/, '');
  }

  if (__DEV__) {
    console.error(
      '[ApiClient] EXPO_PUBLIC_API_URL is not set.\n' +
      'Set it in mobile/.env to your backend URL.\n' +
      'Example for deployed backend: EXPO_PUBLIC_API_URL=https://your-backend.vercel.app/api\n' +
      'Example for local dev:       EXPO_PUBLIC_API_URL=http://localhost:4000/api'
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
