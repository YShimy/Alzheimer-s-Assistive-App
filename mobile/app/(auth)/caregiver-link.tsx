import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppButton, AppInput, Icon } from '@/src/shared/ui';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { useSessionStore } from '@/src/state/sessionStore';

/**
 * Optional post-signup screen — link with a caregiver.
 * User can skip this step entirely.
 */
export default function CaregiverLinkScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const router = useRouter();
  const role = useSessionStore((s) => s.role);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLink = async () => {
    setError('');
    if (!code.trim()) {
      setError('Please enter a caregiver invite code.');
      return;
    }

    // CareLink API call would go here — using existing carelinks module
    // For now, navigate to the app since carelink logic already exists elsewhere
    setLoading(true);
    try {
      // The existing patientHome already has carelink functionality
      // Just navigate to the app
      navigateToApp();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to link. You can always do this later.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToApp = () => {
    if (role === 'CAREGIVER') {
      router.replace('/(caregiver)/home');
    } else {
      router.replace('/(patient)/home');
    }
  };

  return (
    <ScreenContainer scroll={false} backgroundColor={colors.primary[50]}>
      <View style={{ position: 'absolute', top: 10, right: -8, zIndex: 10 }}>
        <LanguageToggleButton />
      </View>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Icon name="people-outline" size={36} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>{t('auth.caregiverLinkTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.caregiverLinkSubtitle')}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <AppInput
            label="Caregiver Invite Code"
            value={code}
            onChangeText={setCode}
            placeholder="e.g. A1B2C3"
            autoCapitalize="characters"
            editable={!loading}
          />

          <AppButton
            title={loading ? 'Linking…' : t('auth.linkNow')}
            onPress={handleLink}
            variant="primary"
            disabled={loading || !code.trim()}
            loading={loading}
          />

          {!!error && (
            <View style={[styles.errorBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Icon name="alert-circle-outline" size={16} color={colors.error.main} />
              <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>{error}</Text>
            </View>
          )}
        </View>

        {/* Skip button */}
        <AppButton
          title={t('auth.skipForNow')}
          onPress={navigateToApp}
          variant="ghost"
          disabled={loading}
          style={{ marginTop: spacing.xl }}
        />

        <Text style={styles.skipNote}>
          You can always link with a caregiver later from your home screen.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
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
  skipNote: {
    marginTop: spacing.md,
    fontSize: typography.size.xs,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});
