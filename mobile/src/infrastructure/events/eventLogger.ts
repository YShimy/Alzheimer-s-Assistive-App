import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { useSessionStore } from '../../state/sessionStore';

interface EventPayload {
  eventName: string;
  occurredAt?: string;
  patientUserId?: string;
  screenName?: string;
  source?: string;
  payload?: Record<string, unknown>;
}

export const eventLogger = {
  /**
   * Fire-and-forget event logging.
   * Silently skips if user is not authenticated.
   * Never throws errors to block the UI.
   */
  log(event: EventPayload): void {
    // We import the store dynamically or directly fetch state since it's a Zustand store
    const session = useSessionStore.getState();
    if (!session.token) return;

    const body = {
      events: [
        {
          ...event,
          occurredAt: event.occurredAt ?? new Date().toISOString(),
          actorRole: session.role?.toLowerCase() ?? 'patient',
          platform: Platform.OS,
          appVersion: '1.0.0', // Hardcoded version for MVP
        },
      ],
    };

    // Fire and forget — no await, no catch throwing
    apiClient.post('/events/batch', body).catch(() => {
      // Silently swallow errors (e.g., offline)
    });
  },

  /**
   * Log a client-side error to the backend.
   */
  logError(error: { screenName?: string; errorCode: string; actionAttempted?: string; recoverable?: boolean }): void {
    const session = useSessionStore.getState();
    if (!session.token) return;

    apiClient.post('/events/errors/client', error).catch(() => {
      // Silently swallow errors
    });
  }
};
