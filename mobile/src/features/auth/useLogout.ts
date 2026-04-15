let GoogleSignin: any;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
  // Ignored in Expo Go
}

import { useSessionStore } from '@/src/state/sessionStore';
import { authApi } from './api';

/**
 * Logout hook — clears app session and revokes Google native state.
 * Safe to call even if Google sign-in never fully completed.
 *
 * Usage:
 *   const logout = useLogout();
 *   <Button onPress={logout} />
 */
export function useLogout(): () => Promise<void> {
  const clearSession = useSessionStore((s) => s.clearSession);

  return async () => {
    // 1. Clear app JWT from SecureStore and wipe session state
    clearSession();

    // 2. Silently revoke and sign out from Google native layer
    if (GoogleSignin) {
      try {
        await GoogleSignin.revokeAccess();
      } catch {
        // revokeAccess fails silently if user was never signed in
      }
      try {
        await GoogleSignin.signOut();
      } catch {
        // signOut fails silently if user was never signed in
      }
    }

    // 3. Call backend logout endpoint (stateless JWT — no-op but keeps contract clean)
    try {
      await authApi.logout();
    } catch {
      // Backend logout failure is non-fatal; local session is already cleared
    }
  };
}
