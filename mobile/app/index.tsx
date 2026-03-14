import { Redirect } from 'expo-router';
import { useSessionStore } from '@/src/state/sessionStore';

/**
 * Index route — immediately redirects based on auth state.
 */
export default function Index() {
  const token = useSessionStore((s) => s.token);
  const role = useSessionStore((s) => s.role);

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === 'CAREGIVER') {
    return <Redirect href="/(caregiver)/home" />;
  }

  return <Redirect href="/(patient)/home" />;
}
