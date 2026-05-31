import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppButton, AppInput, Icon } from '@/src/shared/ui';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { authApi } from '@/src/features/auth/api';
import { ApiError } from '@/src/infrastructure/api/client';

/**
 * Signup Step 1 — Enter email and request a verification code.
 */
export default function SignupEmailScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async () => {
    setError('');
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await authApi.signupRequestCode(trimmedEmail);
      // Navigate to role selection screen before code verification
      router.push({
        pathname: '/(auth)/signup-role',
        params: { email: trimmedEmail },
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_ALREADY_EXISTS') {
          setError(t('auth.emailExists'));
        } else if (err.code === 'RESEND_COOLDOWN') {
          setError(t('auth.cooldownActive'));
        } else {
          setError(err.message);
        }
      } else {
        setError(err?.message ?? 'Failed to send code. Please try again.');
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
          {/* Back button */}
          <Pressable onPress={() => router.back()} style={[styles.backButton, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>
            <Icon name="arrow-back" size={24} color={colors.neutral[700]} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Icon name="mail-outline" size={32} color={colors.primary[500]} />
            </View>
            <Text style={[styles.title, { textAlign: 'center' }]}>{t('auth.signUpTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.signUpSubtitle')}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
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

            <AppButton
              title={loading ? t('auth.sendingCode') : t('auth.sendCode')}
              onPress={handleRequestCode}
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

            {/* Back to sign in */}
            <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.switchText}>{t('auth.hasAccount')}</Text>
              <Pressable onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.switchLink}>{t('auth.signIn')}</Text>
              </Pressable>
            </View>
          </View>
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
    marginBottom: spacing['3xl'],
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
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    ...shadows.lg,
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
});
