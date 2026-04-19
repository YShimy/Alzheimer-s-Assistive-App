import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ScreenContainer, AppButton, Icon, AppCard } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { contactsApi } from '@/src/features/contacts/api';
import { useSessionStore } from '@/src/state/sessionStore';

export default function ContactConsentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await contactsApi.grantConsent(userId);
      router.replace('/(patient)/contacts/import');
    } catch (error) {
      console.error('Failed to grant consent', error);
      // Fallback or retry
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    router.back();
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="people-circle-outline" size={80} color={colors.primary.main} />
        </View>

        <Text style={styles.title}>{t('contactConsent.title')}</Text>
        <Text style={styles.description}>{t('contactConsent.description')}</Text>

        <View style={styles.points}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.pointRow}>
              <Icon name="checkmark-circle-outline" size={24} color={colors.secondary.main} />
              <Text style={styles.pointText}>{t(`contactConsent.points.${i}`)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <AppButton
            title={t('contactConsent.grantBtn')}
            onPress={handleGrant}
            loading={loading}
            style={styles.primaryBtn}
          />
          <AppButton
            title={t('contactConsent.denyBtn')}
            onPress={handleDeny}
            variant="ghost"
            style={styles.secondaryBtn}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing['2xl'],
    backgroundColor: colors.primary_container,
    padding: spacing.xl,
    borderRadius: radius.full,
  },
  title: {
    fontFamily: typography.family.display,
    fontSize: typography.size['2xl'],
    color: colors.on_surface,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.on_surface_variant,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: typography.lineHeight.relaxed,
  },
  points: {
    width: '100%',
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface_container_low,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  pointText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface,
    flex: 1,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  primaryBtn: {
    height: 56,
  },
  secondaryBtn: {
    height: 56,
  },
});
