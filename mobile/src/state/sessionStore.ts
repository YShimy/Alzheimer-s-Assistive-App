/**
 * Zustand session store — manages authentication state.
 * Persists token to SecureStore, role and userId in memory.
 */
import { create } from 'zustand';
import { secureStore } from '../infrastructure/storage/secureStore';

type Role = 'PATIENT' | 'CAREGIVER';

interface SessionState {
  token: string | null;
  role: Role | null;
  userId: string | null;
  displayName: string | null;
  isBootstrapping: boolean;

  setSession: (data: {
    token: string;
    role: Role;
    userId: string;
    displayName: string;
  }) => void;
  clearSession: () => void;
  setBootstrapping: (v: boolean) => void;
  bootstrap: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  token: null,
  role: null,
  userId: null,
  displayName: null,
  isBootstrapping: true,

  setSession: ({ token, role, userId, displayName }) => {
    set({ token, role, userId, displayName });
    secureStore.saveToken(token).catch(console.warn);
  },

  clearSession: () => {
    set({ token: null, role: null, userId: null, displayName: null });
    secureStore.clearAll().catch(console.warn);
  },

  setBootstrapping: (v) => set({ isBootstrapping: v }),

  bootstrap: async () => {
    try {
      const savedToken = await secureStore.getToken();
      if (savedToken) {
        // We have a saved token — will validate via /auth/me in the root layout
        set({ token: savedToken });
      }
    } catch {
      // Token retrieval failed — start fresh
    } finally {
      set({ isBootstrapping: false });
    }
  },
}));

// Imperative API for use outside React (e.g., API client)
export const sessionStore = {
  getState: () => useSessionStore.getState(),
};
