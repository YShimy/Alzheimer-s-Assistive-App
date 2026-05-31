import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppButton, AppInput, Icon } from '@/src/shared/ui';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { authApi } from '@/src/features/auth/api';
import { useSessionStore } from '@/src/state/sessionStore';
import { ApiError } from '@/src/infrastructure/api/client';

/**
 * Signup Step 3 — Set password, full name, and age to complete registration.
 */
export default function SignupCompleteScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const router = useRouter();
  const { email, verificationToken, role } = useLocalSearchParams<{
    email: string;
    verificationToken: string;
    role: string;
  }>();
  const setSession = useSessionStore((s) => s.setSession);

  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!displayName.trim() || displayName.trim().length < 2) {
      errors.displayName = 'Name must be at least 2 characters.';
    }

    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      errors.age = 'Please enter a valid age (18-120).';
    }

    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain an uppercase letter.';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must contain a lowercase letter.';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain a number.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleComplete = async () => {
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await authApi.signupComplete({
        verificationToken: verificationToken!,
        password,
        displayName: displayName.trim(),
        age: parseInt(age, 10),
        role: (role as 'patient' | 'caregiver') ?? 'patient',
      });

      // Set session immediately — user is now authenticated
      setSession({
        token: result.accessToken,
        role: result.user.role.toUpperCase() as 'PATIENT' | 'CAREGIVER',
        userId: result.user.id,
        displayName: result.user.displayName,
      });

      // Route based on role and next step
      if (result.nextStep === 'optional_caregiver_link') {
        router.replace('/(auth)/caregiver-link');
      } else if (result.user.role === 'caregiver') {
        router.replace('/(caregiver)/home');
      } else {
        router.replace('/(patient)/home');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_ALREADY_EXISTS') {
          setError(t('auth.emailExists'));
        } else if (err.code === 'INVALID_TOKEN') {
          setError('Session expired. Please start the signup process again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err?.message ?? 'Registration failed. Please try again.');
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
          {/* Back */}
          <Pressable onPress={() => router.back()} style={[styles.backButton, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>
            <Icon name="arrow-back" size={24} color={colors.neutral[700]} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Icon name="person-outline" size={32} color={colors.primary[500]} />
            </View>
            <Text style={[styles.title, { textAlign: 'center' }]}>{t('auth.completeTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.completeSubtitle')}</Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <AppInput
              label={t('auth.fullName')}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('auth.fullNamePlaceholder')}
              autoCapitalize="words"
              autoComplete="name"
              editable={!loading}
              error={fieldErrors.displayName}
            />

            <AppInput
              label={t('auth.age')}
              value={age}
              onChangeText={(v) => setAge(v.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder={t('auth.agePlaceholder')}
              keyboardType="number-pad"
              maxLength={3}
              editable={!loading}
              error={fieldErrors.age}
            />

            <AppInput
              label={t('auth.newPassword')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.newPasswordPlaceholder')}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!loading}
              error={fieldErrors.password}
            />

            <Text style={[styles.passwordHint, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.passwordRules')}</Text>

            <AppInput
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
              error={fieldErrors.confirmPassword}
            />

            <AppButton
              title={loading ? t('auth.creating') : t('auth.createAccount')}
              onPress={handleComplete}
              variant="primary"
              disabled={loading}
              loading={loading}
            />

            {!!error && (
              <View style={[styles.errorBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Icon name="alert-circle-outline" size={16} color={colors.error.main} />
                <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>{error}</Text>
              </View>
            )}
          </View>

          <View style={{ height: spacing['4xl'] }} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing['3xl'],
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  emailText: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.primary.main,
    marginTop: spacing.xs,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    ...shadows.lg,
  },
  passwordHint: {
    fontSize: typography.size.xs,
    color: colors.neutral[400],
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
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
});
