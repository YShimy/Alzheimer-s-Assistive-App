import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppButton, Icon } from '@/src/shared/ui';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { authApi } from '@/src/features/auth/api';
import { useSessionStore } from '@/src/state/sessionStore';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

/**
 * Configure Google Sign-In once at module level.
 * webClientId must be the Web OAuth 2.0 Client ID from Google Cloud Console.
 */
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  // iosClientId is required on iOS when NOT using GoogleService-Info.plist auto-config
  // If EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set, pass it here:
  ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    ? { iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }
    : {}),
});

/**
 * Login screen — single sign-in path via real Google OAuth.
 * Requires a native dev build; will not work in Expo Go.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const setSession = useSessionStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');

    // Guard: env var must be set
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(
        'Setup Required',
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set.\n\nAdd it to mobile/.env and rebuild the dev client.',
      );
      return;
    }

    setLoading(true);

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        setError('Google Sign-In did not return an ID token. Please try again.');
        return;
      }

      // Exchange Google ID token for app JWT — backend verifies with Google
      const result = await authApi.loginWithGoogle(idToken);

      setSession({
        token: result.accessToken,
        role: result.user.role.toUpperCase() as 'PATIENT' | 'CAREGIVER',
        userId: result.user.id,
        displayName: result.user.displayName,
      });

    } catch (err: any) {
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — not an error, reset silently
        return;
      } else if (err?.code === statusCodes.IN_PROGRESS) {
        // A sign-in is already in progress
        return;
      } else if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'Google Play Services Required',
          'Update Google Play Services on your device and try again.',
        );
      } else if (
        err?.message?.includes('RNGoogleSignin') ||
        err?.message?.includes('NativeModule')
      ) {
        Alert.alert(
          'Native Build Required',
          'Google Sign-In requires a development build.\n\nRun:\n  npx expo run:android\n  npx expo run:ios',
        );
      } else if (err?.status === 401) {
        setError('Authentication failed. Please try again.');
      } else {
        setError(err?.message ?? 'Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (role: 'PATIENT' | 'CAREGIVER') => {
    setError('');
    setLoading(true);
    try {
      const result = await authApi.devLogin(role);
      setSession({
        token: result.accessToken,
        role: result.user.role.toUpperCase() as 'PATIENT' | 'CAREGIVER',
        userId: result.user.id,
        displayName: result.user.displayName,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Dev sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll={false} backgroundColor={colors.primary[50]}>
      <View style={{ position: 'absolute', top: 50, right: 10, zIndex: 10 }}>
        <LanguageToggleButton />
      </View>
      <View style={styles.content}>
        {/* Logo area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="heart-outline" size={40} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>{t('auth.appTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.appSubtitle')}</Text>
        </View>

        {/* Login card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('auth.cardTitle')}</Text>
          <Text style={styles.cardSubtitle}>{t('auth.cardSubtitle')}</Text>

          <AppButton
            title={loading ? t('auth.signingIn') : t('auth.continueGoogle')}
            onPress={handleGoogleSignIn}
            variant="primary"
            disabled={loading}
            loading={loading}
            icon={!loading ? <Icon name="logo-google" size={20} color="#fff" /> : undefined}
          />

          {!!error && (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color={colors.error.main} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Dev Login options (only in development) */}
          {__DEV__ && (
            <View style={styles.devContainer}>
              <Text style={styles.devTitle}>{t('auth.devLoginTitle')}</Text>
              <View style={styles.devButtons}>
                <AppButton
                  title={t('auth.patient')}
                  onPress={() => handleDevLogin('PATIENT')}
                  variant="outline"
                  style={{ flex: 1 }}
                  size="sm"
                  disabled={loading}
                />
                <AppButton
                  title={t('auth.caregiver')}
                  onPress={() => handleDevLogin('CAREGIVER')}
                  variant="outline"
                  style={{ flex: 1 }}
                  size="sm"
                  disabled={loading}
                />
              </View>
            </View>
          )}
        </View>

        {/* Privacy note */}
        <Text style={styles.note}>
          <Icon name="lock-closed-outline" size={14} color={colors.neutral[400]} />
          {'  '}{t('auth.privacyNote')}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.lg,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    ...shadows.lg,
  },
  cardTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    marginBottom: spacing['2xl'],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.error.light,
    borderRadius: radius.md,
  },
  errorText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.error.main,
  },
  note: {
    marginTop: spacing['2xl'],
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  devContainer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  devTitle: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  devButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
