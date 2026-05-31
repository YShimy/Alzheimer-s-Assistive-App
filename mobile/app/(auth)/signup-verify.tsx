import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppButton, AppInput, Icon } from '@/src/shared/ui';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { authApi } from '@/src/features/auth/api';
import { ApiError } from '@/src/infrastructure/api/client';

const RESEND_COOLDOWN = 60; // seconds

/**
 * Signup Step 2 — Enter the 6-digit verification code.
 */
export default function SignupVerifyScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const router = useRouter();
  const { email, role } = useLocalSearchParams<{ email: string; role: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start cooldown timer on mount
  useEffect(() => {
    startCooldown();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleVerify = async () => {
    setError('');
    setSuccess('');

    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.signupVerifyCode(email!, code);
      // Navigate to registration completion with the verification token + role
      router.push({
        pathname: '/(auth)/signup-complete',
        params: {
          email: email!,
          verificationToken: result.verificationToken,
          role: role ?? 'patient',
        },
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'VERIFICATION_CODE_EXPIRED') {
          setError(t('auth.codeExpired'));
        } else if (err.code === 'VERIFICATION_MAX_ATTEMPTS') {
          setError(t('auth.tooManyAttempts'));
        } else if (err.code === 'VERIFICATION_CODE_INVALID') {
          setError(err.message || t('auth.codeInvalid'));
        } else {
          setError(err.message);
        }
      } else {
        setError(err?.message ?? 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setCode('');

    try {
      await authApi.signupResendCode(email!);
      setSuccess(t('auth.codeSent'));
      startCooldown();
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'RESEND_COOLDOWN') {
        setError(t('auth.cooldownActive'));
      } else {
        setError(err?.message ?? 'Failed to resend code.');
      }
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
              <Icon name="shield-checkmark-outline" size={32} color={colors.primary[500]} />
            </View>
            <Text style={[styles.title, { textAlign: 'center' }]}>{t('auth.verifyTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.verifySubtitle')}
            </Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <AppInput
              label="Verification Code"
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              editable={!loading}
              containerStyle={{ marginBottom: spacing.xl }}
            />

            <AppButton
              title={loading ? t('auth.verifying') : t('auth.verifyCode')}
              onPress={handleVerify}
              variant="primary"
              disabled={loading || code.length !== 6}
              loading={loading}
            />

            {/* Success message */}
            {!!success && (
              <View style={[styles.successBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Icon name="checkmark-circle-outline" size={16} color={colors.success.main} />
                <Text style={[styles.successText, { textAlign: isRTL ? 'right' : 'left' }]}>{success}</Text>
              </View>
            )}

            {/* Error message */}
            {!!error && (
              <View style={[styles.errorBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Icon name="alert-circle-outline" size={16} color={colors.error.main} />
                <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>{error}</Text>
              </View>
            )}

            {/* Resend button */}
            <View style={styles.resendRow}>
              {cooldown > 0 ? (
                <Text style={styles.resendCooldown}>
                  {t('auth.resendIn', { seconds: cooldown })}
                </Text>
              ) : (
                <Pressable onPress={handleResend}>
                  <Text style={styles.resendLink}>{t('auth.resendCode')}</Text>
                </Pressable>
              )}
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
  emailText: {
    fontSize: typography.size.base,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.success.light,
    borderRadius: radius.md,
  },
  successText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.success.main,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  resendCooldown: {
    fontSize: typography.size.sm,
    color: colors.neutral[400],
  },
  resendLink: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.primary.main,
  },
});
