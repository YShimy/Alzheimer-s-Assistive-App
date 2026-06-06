import { Redirect } from 'expo-router';
import { useSessionStore } from '@/src/state/sessionStore';

/**
 * Index route — immediately redirects based on auth state.
 * Returns null while the role is still being fetched (after token bootstrap)
 * so we don't prematurely redirect to the patient view before knowing the role.
 */
export default function Index() {
  const token = useSessionStore((s) => s.token);
  const role = useSessionStore((s) => s.role);

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  // Still waiting for /auth/me to resolve the role — don't redirect yet
  if (!role) {
    return null;
  }

  if (role === 'CAREGIVER') {
    return <Redirect href="/(caregiver)/home" />;
  }

  return <Redirect href="/(patient)/home" />;
}
