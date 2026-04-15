import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
} from '@expo-google-fonts/public-sans';
import * as SplashScreen from 'expo-splash-screen';
// Initialize i18n
import '@/src/shared/i18n';
import { useSessionStore } from '@/src/state/sessionStore';
import { authApi } from '@/src/features/auth/api';
import { colors } from '@/src/infrastructure/theme/tokens';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout — handles:
 * 1. Session bootstrap (check for saved token)
 * 2. Token validation via /auth/me
 * 3. Auth-based redirect logic
 * 4. Custom font loading
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

  const [fontsLoaded, fontError] = useFonts({
    Manrope_600SemiBold,
    Manrope_700Bold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
  });

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

  const isReady = !isBootstrapping && (fontsLoaded || fontError);

  // Hide splash screen once ready
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Redirect based on auth state
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onCaregiverLink = segments[1] === 'caregiver-link';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && role && inAuthGroup && !onCaregiverLink) {
      if (role === 'CAREGIVER') {
        router.replace('/(caregiver)/home');
      } else {
        router.replace('/(patient)/home');
      }
    }
  }, [token, role, segments, isReady]);

  // Show loading while bootstrapping or loading fonts
  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary.main} />
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
