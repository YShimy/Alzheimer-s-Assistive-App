import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Icon } from '@/src/shared/ui';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';

/**
 * Signup Step 1b — Choose role: Patient or Caregiver.
 * Inserted between signup-email and signup-verify.
 */
export default function SignupRoleScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const handleSelect = (role: 'patient' | 'caregiver') => {
    router.push({
      pathname: '/(auth)/signup-verify',
      params: { email, role },
    });
  };

  return (
    <ScreenContainer scroll={false} backgroundColor={colors.primary[50]}>
      <View style={{ position: 'absolute', top: 10, right: -8, zIndex: 10 }}>
        <LanguageToggleButton />
      </View>
      <View style={styles.content}>
        {/* Back */}
        <Pressable onPress={() => router.back()} style={[styles.backButton, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]} accessibilityLabel="Go back">
          <Icon name="arrow-back" size={24} color={colors.neutral[700]} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Icon name="people-outline" size={36} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>{t('auth.roleTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.roleSubtitle')}</Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cards}>
          {/* Patient Card */}
          <Pressable
            style={({ pressed }) => [styles.roleCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }, pressed && styles.roleCardPressed]}
            onPress={() => handleSelect('patient')}
            accessibilityRole="button"
            accessibilityLabel={t('auth.rolePatient')}
          >
            <View style={[styles.roleIconCircle, { backgroundColor: colors.primary[100] }]}>
              <Icon name="accessibility-outline" size={40} color={colors.primary[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.rolePatient')}</Text>
              <Text style={[styles.roleSub, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.rolePatientSub')}</Text>
            </View>
            <Icon name={isRTL ? "chevron-back" : "chevron-forward"} size={24} color={colors.primary[400]} />
          </Pressable>

          {/* Caregiver Card */}
          <Pressable
            style={({ pressed }) => [styles.roleCard, styles.caregiverCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }, pressed && styles.roleCardPressed]}
            onPress={() => handleSelect('caregiver')}
            accessibilityRole="button"
            accessibilityLabel={t('auth.roleCaregiver')}
          >
            <View style={[styles.roleIconCircle, { backgroundColor: colors.secondary[100] }]}>
              <Icon name="heart-outline" size={40} color={colors.secondary[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleTitle, { color: colors.secondary[700], textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.roleCaregiver')}</Text>
              <Text style={[styles.roleSub, { textAlign: isRTL ? 'right' : 'left' }]}>{t('auth.roleCaregiverSub')}</Text>
            </View>
            <Icon name={isRTL ? "chevron-back" : "chevron-forward"} size={24} color={colors.secondary[400]} />
          </Pressable>
        </View>

        <Text style={styles.note}>{t('auth.roleNote')}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
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
    lineHeight: typography.size.base * 1.5,
  },
  cards: {
    gap: spacing.lg,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    borderWidth: 2,
    borderColor: colors.primary[200],
    ...shadows.md,
  },
  caregiverCard: {
    borderColor: colors.secondary[200],
  },
  roleCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  roleIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTitle: {
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.primary[700],
    marginBottom: spacing.xs,
  },
  roleSub: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    lineHeight: typography.size.sm * 1.5,
  },
  note: {
    marginTop: spacing['2xl'],
    fontSize: typography.size.xs,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: typography.size.xs * 1.6,
  },
});
