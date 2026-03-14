import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSessionStore } from '@/src/state/sessionStore';
import { authApi } from '@/src/features/auth/api';
import { colors } from '@/src/infrastructure/theme/tokens';

/**
 * Root layout — handles:
 * 1. Session bootstrap (check for saved token)
 * 2. Token validation via /auth/me
 * 3. Auth-based redirect logic
 */
export default function RootLayout() {
  const token = useSessionStore((s) => s.token);
  const role = useSessionStore((s) => s.role);
  const isBootstrapping = useSessionStore((s) => s.isBootstrapping);
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clearSession);
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const segments = useSegments();
  const router = useRouter();

  // Bootstrap: restore token from SecureStore on mount
  useEffect(() => {
    bootstrap();
  }, []);

  // Validate token once bootstrap has found one
  useEffect(() => {
    if (isBootstrapping || !token || role) return;

    authApi
      .getMe()
      .then(({ user }) => {
        setSession({
          token: token!,
          role: user.role.toUpperCase() as 'PATIENT' | 'CAREGIVER',
          userId: user.id,
          displayName: user.displayName,
        });
      })
      .catch(() => {
        clearSession();
      });
  }, [token, isBootstrapping, role]);

  // Redirect based on auth state
  useEffect(() => {
    if (isBootstrapping) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && role && inAuthGroup) {
      if (role === 'CAREGIVER') {
        router.replace('/(caregiver)/home');
      } else {
        router.replace('/(patient)/home');
      }
    }
  }, [token, role, segments, isBootstrapping]);

  // Show loading while bootstrapping
  if (isBootstrapping) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
