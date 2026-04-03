import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppCard, Icon, LoadingState } from '@/src/shared/ui';
import { colors, typography, spacing } from '@/src/infrastructure/theme/tokens';
import { useSessionStore } from '@/src/state/sessionStore';
import { useWeeklyProgress } from '@/src/features/progress/hooks';
import { useGameProgress } from '@/src/features/games/safePath/hooks';
import { GameProgressCard } from '@/src/features/games/safePath/components/GameProgressCard';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

/**
 * Patient progress preview — shows an aggregated overview
 * including reminder adherence, checklists, and game progress.
 */
export default function PatientProgressScreen() {
  const { t } = useTranslation();
  const userId = useSessionStore((s) => s.userId);
  const { data, loading, error, reload } = useWeeklyProgress(userId);
  const { data: gameProgress, loading: gameLoading } = useGameProgress(userId);

  useFocusEffect(
    useCallback(() => {
      eventLogger.log({
        eventName: EventNames.PROGRESS_VIEWED,
        screenName: 'PatientProgressScreen',
        payload: { viewType: 'patient' },
      });
    }, [])
  );

  if (loading) return <LoadingState message={t('loading') || 'Loading...'} />;

  const doneCount = data?.summary?.remindersDone ?? 0;
  const snoozedCount = data?.summary?.remindersSnoozed ?? 0;
  const skippedCount = data?.summary?.remindersSkipped ?? 0;
  const totalFired = data?.summary?.remindersFired ?? 0; 
  const completionRatio = totalFired > 0 ? Math.round((doneCount / totalFired) * 100) : 0;
  
  const checklistsStarted = data?.summary?.checklistsStarted ?? 0;
  const checklistsCompleted = data?.summary?.checklistsCompleted ?? 0;

  return (
    <ScreenContainer>
      <Text style={styles.sectionTitle}>{t('patientProgress.weekly')}</Text>

      <AppCard style={styles.card}>
        <View style={styles.statRow}>
          <StatItem icon="checkmark-circle-outline" label={t('patientProgress.completed')} value={doneCount.toString()} color={colors.success.main} />
          <StatItem icon="time-outline" label={t('patientProgress.snoozed')} value={snoozedCount.toString()} color={colors.warning.main} />
          <StatItem icon="close-circle-outline" label={t('patientProgress.skipped')} value={skippedCount.toString()} color={colors.neutral[400]} />
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>{t('patientProgress.checklists') || 'Checklists'}</Text>
      
      <AppCard style={styles.card}>
        <View style={styles.statRow}>
          <StatItem icon="checkbox-outline" label={t('patientProgress.started') || 'Started'} value={checklistsStarted.toString()} color={colors.primary[500]} />
          <StatItem icon="checkmark-done-circle-outline" label={t('patientProgress.completedChecklists') || 'Completed'} value={checklistsCompleted.toString()} color={colors.success.main} />
        </View>
      </AppCard>

      {/* ── Game Progress Section ───────────────────────────── */}
      <Text style={styles.sectionTitle}>Cognitive Games</Text>

      {gameLoading ? (
        <AppCard style={styles.card}>
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading game progress...</Text>
          </View>
        </AppCard>
      ) : gameProgress ? (
        <GameProgressCard progress={gameProgress} />
      ) : (
        <AppCard style={styles.card}>
          <View style={styles.loadingBox}>
            <Icon name="game-controller-outline" size={24} color={colors.neutral[300]} />
            <Text style={styles.loadingText}>Play a game to see your progress</Text>
          </View>
        </AppCard>
      )}

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
  loadingBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.size.sm,
    color: colors.neutral[400],
  },
});
