import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ScreenContainer, AppCard, Icon, LoadingState, StatusChip, EmptyState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { carelinksApi } from '@/src/features/carelinks/api';
import { useWeeklyProgress } from '@/src/features/progress/hooks';
import type { CareLink } from '@/src/features/carelinks/types';

export default function CaregiverProgressScreen() {
  const { t } = useTranslation();
  const [links, setLinks] = useState<CareLink[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [loadingLinks, setLoadingLinks] = useState(true);

  // Load linked patients
  useEffect(() => {
    carelinksApi
      .getMyLinks()
      .then(({ careLinks }) => {
        const active = careLinks.filter((l) => l.status === 'active' && l.patientUserId);
        setLinks(active);
        if (active.length > 0 && active[0]!.patientUserId) {
          setSelectedPatient(active[0]!.patientUserId);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLinks(false));
  }, []);

  const { data: weeklyData, loading: weeklyLoading } = useWeeklyProgress(selectedPatient);

  if (loadingLinks) return <LoadingState message={t('loading') || 'Loading...'} />;

  if (links.length === 0) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="people-outline"
          title={t('caregiverReminders.noLinkedPatients')}
          message={t('caregiverReminders.linkFirstMsg')}
        />
      </ScreenContainer>
    );
  }

  const selectedLink = links.find((l) => l.patientUserId === selectedPatient);
  const isLoading = weeklyLoading;

  const doneCount = weeklyData?.summary?.remindersDone ?? 0;
  const snoozedCount = weeklyData?.summary?.remindersSnoozed ?? 0;
  const skippedCount = weeklyData?.summary?.remindersSkipped ?? 0;
  const totalFired = weeklyData?.summary?.remindersFired ?? 0;
  const completionRatio = totalFired > 0 ? Math.round((doneCount / totalFired) * 100) : 0;

  return (
    <ScreenContainer>
      <View style={styles.patientCard}>
        <Icon name="person-circle-outline" size={28} color={colors.secondary[500]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.patientLabel}>{t('caregiverReminders.managingFor')}</Text>
          <Text style={styles.patientName}>
            {selectedLink?.patient?.displayName ?? 'Patient'}
          </Text>
        </View>
        {links.length > 1 && (
          <StatusChip label={t('caregiverProgress.patients', { count: links.length })} variant="info" />
        )}
      </View>

      {isLoading ? (
        <LoadingState message={t('loading') || 'Loading...'} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>{t('caregiverProgress.overview', 'Progress Overview')}</Text>
          <AppCard style={styles.card}>
            <View style={styles.statRow}>
              <StatItem 
                icon="checkmark-circle-outline" 
                label={t('patientProgress.completed')} 
                value={doneCount.toString()} 
                color={colors.success.main} 
              />
              <StatItem 
                icon="time-outline" 
                label={t('patientProgress.snoozed')} 
                value={snoozedCount.toString()} 
                color={colors.warning.main} 
              />
              <StatItem 
                icon="close-circle-outline" 
                label={t('patientProgress.skipped')} 
                value={skippedCount.toString()} 
                color={colors.neutral[400]} 
              />
            </View>
          </AppCard>

          <Text style={styles.sectionTitle}>{t('patientProgress.categories')}</Text>
          <AppCard
            style={styles.card}
            icon={<Icon name="medkit-outline" size={22} color={colors.primary[500]} />}
            title={t('patientProgress.medication')}
            subtitle={t('patientProgress.medicationSub')}
          >
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionRatio}%` }]} />
            </View>
          </AppCard>

          <AppCard
            style={styles.card}
            icon={<Icon name="restaurant-outline" size={22} color={colors.secondary[500]} />}
            title={t('patientProgress.meals')}
            subtitle={t('patientProgress.mealsSub')}
          >
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionRatio}%`, backgroundColor: colors.secondary[400] }]} />
            </View>
          </AppCard>

        </>
      )}
    </ScreenContainer>
  );
}

function StatItem({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={28} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  patientLabel: { fontSize: typography.size.xs, color: colors.neutral[500], marginBottom: 2 },
  patientName: { fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800] },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  card: { marginBottom: spacing.md },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', gap: spacing.xs },
  statValue: { fontSize: typography.size['2xl'], fontWeight: '700' },
  statLabel: { fontSize: typography.size.xs, color: colors.neutral[500] },
  progressBar: {
    height: 6,
    backgroundColor: colors.neutral[100],
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[400],
    borderRadius: 3,
  },
});
