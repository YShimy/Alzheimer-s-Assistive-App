import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppButton, AppInput, Icon } from '@/src/shared/ui';
import { MemoCareLogo } from '@/src/shared/ui/MemoCareLogo';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { authApi } from '@/src/features/auth/api';
import { useSessionStore } from '@/src/state/sessionStore';
import { ApiError } from '@/src/infrastructure/api/client';

import Constants, { ExecutionEnvironment } from 'expo-constants';

let GoogleSignin: any = null;
let statusCodes: any = null;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  try {
    const RNGoogleSignin = require('@react-native-google-signin/google-signin');
    GoogleSignin = RNGoogleSignin.GoogleSignin;
    statusCodes = RNGoogleSignin.statusCodes;

    if (GoogleSignin && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
          ? { iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }
          : {}),
      });
    }
  } catch (e) {
    console.warn('GoogleSignin initialization failed:', e);
  }
} else {
  console.log('Skipping GoogleSignin setup in Expo Go.');
}

/**
 * Login screen — main auth entry point.
 * Supports email/password sign-in, Google sign-in, and signup navigation.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Email/Password Sign In ─────────────────────────────

  const handleSignIn = async () => {
    setError('');
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.signin(trimmedEmail, password);
      setSession({
        token: result.accessToken,
        role: result.user.role.toUpperCase() as 'PATIENT' | 'CAREGIVER',
        userId: result.user.id,
        displayName: result.user.displayName,
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setError(t('auth.invalidCredentials'));
        } else if (err.code === 'EMAIL_NOT_VERIFIED') {
          setError('Email not verified. Please complete signup first.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err?.message ?? 'Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Google Sign In ─────────────────────────────────────

  const handleGoogleSignIn = async () => {
    setError('');

    if (!GoogleSignin) {
      Alert.alert(
        'Native Build Required',
        t('auth.googleNotAvailable'),
      );
      return;
    }

    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      Alert.alert('Setup Required', t('auth.googleSetupRequired'));
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

      const result = await authApi.loginWithGoogle(idToken);
      setSession({
        token: result.accessToken,
        role: result.user.role.toUpperCase() as 'PATIENT' | 'CAREGIVER',
        userId: result.user.id,
        displayName: result.user.displayName,
      });
    } catch (err: any) {
      if (err?.code === statusCodes?.SIGN_IN_CANCELLED) return;
      if (err?.code === statusCodes?.IN_PROGRESS) return;
      if (err?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play Services Required', 'Update Google Play Services and try again.');
      } else if (err?.message?.includes('RNGoogleSignin') || err?.message?.includes('NativeModule')) {
        Alert.alert('Native Build Required', t('auth.googleNotAvailable'));
      } else if (err?.status === 401) {
        setError('Authentication failed. Please try again.');
      } else {
        setError(err?.message ?? 'Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <ScreenContainer scroll backgroundColor={colors.primary[50]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ position: 'absolute', top: 10, right: -8, zIndex: 10 }}>
          <LanguageToggleButton />
        </View>

        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <MemoCareLogo size={52} />
            </View>
            <Text style={styles.title}>{t('auth.appTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.appSubtitle')}</Text>
          </View>

          {/* Sign In Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('auth.signInTitle')}</Text>
            <Text style={styles.cardSubtitle}>{t('auth.signInSubtitle')}</Text>

            <AppInput
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!loading}
            />

            <AppInput
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />

            <AppButton
              title={loading ? t('auth.signingInAction') : t('auth.signInAction')}
              onPress={handleSignIn}
              variant="primary"
              disabled={loading}
              loading={loading}
            />

            {/* Error message */}
            {!!error && (
              <View style={styles.errorBox}>
                <Icon name="alert-circle-outline" size={16} color={colors.error.main} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}



            {/* Sign Up Link */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{t('auth.noAccount')}</Text>
              <Pressable onPress={() => router.push('/(auth)/signup-email')}>
                <Text style={styles.switchLink}>{t('auth.signUp')}</Text>
              </Pressable>
            </View>


          </View>

          {/* Privacy note */}
          <Text style={styles.note}>
            <Icon name="lock-closed-outline" size={14} color={colors.neutral[400]} />
            {'  '}{t('auth.privacyNote')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing['4xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary[200],
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.size.sm,
    color: colors.neutral[400],
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  switchText: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
  },
  switchLink: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.primary.main,
  },
  note: {
    marginTop: spacing['2xl'],
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
});
