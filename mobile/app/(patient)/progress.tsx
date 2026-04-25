import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer, AppCard, Icon, LoadingState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useProgress } from '@/src/features/progress/useProgress';
import { useChecklistTracking, usePriorityBreakdown } from '@/src/features/progress/hooks';
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

import { StreakCard } from '@/src/shared/ui/cards/StreakCard';
import { CategoryProgressCard } from '@/src/shared/ui/cards/CategoryProgressCard';
import { TrendLineChart, StackedConsistencyChart } from '@/src/shared/ui/charts/ProgressCharts';
import { useSessionStore } from '@/src/state/sessionStore';


export default function PatientProgressScreen() {
  const { t, i18n } = useTranslation();
  const session = useSessionStore?.getState?.() as any;
  const patientId: string | null = session?.user?.id ?? null;

  const { loading, refreshing, error, overview, streaks, categories, charts, reload, refresh } = useProgress();
  const { data: checklistTracking, loading: checklistLoading } = useChecklistTracking(null);
  const { data: priorityData } = usePriorityBreakdown(patientId, 7);

  useFocusEffect(
    useCallback(() => {
      reload();
      eventLogger.log({
        eventName: EventNames.PROGRESS_VIEWED,
        screenName: 'PatientProgressScreen',
        payload: { viewType: 'patient' },
      });
    }, [])
  );

  if (loading && !overview) {
    return <LoadingState message={t('loading') || 'Loading...'} />;
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('patientProgress.errorLoading')}</Text>
      </View>
    );
  }

  const renderTrendMessage = (delta: number, context: 'consistency' | 'score') => {
    if (!overview) return null;
    let text = t('patientProgress.trend.default');
    let color = colors.neutral[600];

    if (delta > 0) {
      text = context === 'score' ? t('patientProgress.trend.scoreUp') : t('patientProgress.trend.consistencyUp');
      color = colors.success.main as any;
    } else if (delta < 0 && Math.abs(delta) < 0.2) {
      text = t('patientProgress.trend.steady');
    } else if (delta < 0) {
      text = t('patientProgress.trend.down');
    }

    return (
      <View style={[styles.trendBox, { borderLeftColor: color }]}>
        <Text style={styles.trendText}>{text}</Text>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.headerTitle}>{t('patientProgress.headerTitle')}</Text>
      <Text style={styles.headerSubtitle}>{t('patientProgress.headerSubtitle')}</Text>

      {/* STREAKS SECTION */}
      {streaks && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('patientProgress.currentStreaks')}</Text>
          <StreakCard title={t('patientProgress.streaks.reminders', 'Reminders')} icon="notifications-outline" data={streaks.reminders} color={colors.primary.main} />
          <StreakCard title={t('patientProgress.streaks.checklists', 'Checklists')} icon="checkbox-outline" data={streaks.checklists} color={colors.secondary.main} />
          <StreakCard title={t('patientProgress.streaks.games', 'Games')} icon="game-controller-outline" data={streaks.games} color={colors.tertiary.main} />
        </View>
      )}

      {/* CONSISTENCY CHARTS */}
      {charts && charts.reminderSeries && charts.reminderSeries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('patientProgress.reminderConsistency7')}</Text>
          <AppCard style={styles.chartContainer}>
            {overview && renderTrendMessage(overview.comparison.reminderConsistencyDelta, 'consistency')}
            <StackedConsistencyChart data={charts.reminderSeries} type="reminders" />
          </AppCard>
        </View>
      )}

      {/* GAME SCORE CHARTS */}
      {charts && charts.gameScoreSeries && charts.gameScoreSeries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('patientProgress.gamePerformance7')}</Text>
          <AppCard style={styles.chartContainer}>
            {overview && renderTrendMessage(overview.comparison.gameScoreDeltaVsPrevious, 'score')}
            <TrendLineChart data={charts.gameScoreSeries} />
          </AppCard>
        </View>
      )}

      {/* PRIORITY BREAKDOWN */}
      {priorityData && priorityData.priorityBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('patientProgress.priorityBreakdown7')}</Text>
          <AppCard style={styles.priorityCard}>
            {priorityData.priorityBreakdown.map((item) => {
              const priorityColors: Record<string, string> = {
                normal: colors.neutral[500] as string,
                high: '#F59E0B',
                critical: colors.error.main as string,
              };
              const barColor = priorityColors[item.priority] ?? (colors.primary.main as string);
              const pctLabel = Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 }).format(item.completionRate);
              const trendIcon = item.trendDelta === null
                ? null
                : item.trendDelta > 0 ? '▲' : item.trendDelta < 0 ? '▼' : '→';
              const trendColor = item.trendDelta === null
                ? colors.neutral[400]
                : item.trendDelta > 0 ? colors.success.main : item.trendDelta < 0 ? colors.error.main : colors.neutral[500];

              return (
                <View key={item.priority} style={styles.priorityRow}>
                  <View style={styles.priorityHeader}>
                    <Text style={styles.priorityLabel}>
                      {t(`patientProgress.priorityLevels.${item.priority}`, { defaultValue: item.priority })}
                    </Text>
                    <View style={styles.priorityMeta}>
                      {trendIcon && (
                        <Text style={[styles.trendIndicator, { color: trendColor as string }]}>
                          {trendIcon} {item.trendDelta !== null ? Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 }).format(Math.abs(item.trendDelta)) : ''}
                        </Text>
                      )}
                      {item.escalationCount > 0 && (
                        <View style={styles.escalationBadge}>
                          <Text style={styles.escalationBadgeText}>
                            {t('patientProgress.alerts', { count: item.escalationCount })}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.pctLabel, { color: barColor }]}>{pctLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${item.scheduledCount > 0 ? item.completionRate * 100 : 0}%` as any,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.prioritySubtext}>
                    {t('patientProgress.priorityStats', { 
                      done: Intl.NumberFormat(i18n.language).format(item.doneCount), 
                      skip: Intl.NumberFormat(i18n.language).format(item.skipCount), 
                      snooze: Intl.NumberFormat(i18n.language).format(item.snoozeCount) 
                    })}
                  </Text>
                </View>
              );
            })}
          </AppCard>
        </View>
      )}

      {/* CATEGORY BREAKDOWN */}
      {categories && categories.reminderCategories.length > 0 && (
        <View style={styles.section}>
          <CategoryProgressCard title={t('patientProgress.remindersByCategory30')} categories={categories.reminderCategories} />
        </View>
      )}

      {/* CHECKLIST CATEGORIES */}
      {categories && categories.checklistCategories.length > 0 && (
        <View style={styles.section}>
          <CategoryProgressCard title={t('patientProgress.checklistsByCategory30')} categories={categories.checklistCategories} />
        </View>
      )}

      {/* CHECKLIST TRACKING */}
      {checklistTracking && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('patientProgress.checklistActivity')}</Text>
          <AppCard style={styles.trackingCard}>
            <View style={styles.trackingRow}>
              <View style={styles.trackingItem}>
                <Text style={styles.trackingValue}>{Intl.NumberFormat(i18n.language).format(checklistTracking.thisWeek.completedRuns)}</Text>
                <Text style={styles.trackingLabel}>{t('patientProgress.completedThisWeek')}</Text>
              </View>
              <View style={styles.trackingItem}>
                <Text style={styles.trackingValue}>{Intl.NumberFormat(i18n.language).format(checklistTracking.thisMonth.completedRuns)}</Text>
                <Text style={styles.trackingLabel}>{t('patientProgress.completedThisMonth')}</Text>
              </View>
            </View>
            {checklistTracking.thisWeek.runs.length > 0 && (
              <View style={styles.recentRuns}>
                <Text style={styles.recentRunsTitle}>{t('patientProgress.recentChecklists')}</Text>
                {checklistTracking.thisWeek.runs.slice(0, 3).map((run) => (
                  <View key={run.id} style={styles.runItem}>
                    <Icon name="checkbox-outline" size={16} color={run.status === 'completed' ? colors.success.main : colors.neutral[400]} />
                    <Text style={styles.runTitle} numberOfLines={1}>{run.templateTitle}</Text>
                    <Text style={styles.runDate}>{new Date(run.startedAt).toLocaleDateString(i18n.language)}</Text>
                  </View>
                ))}
              </View>
            )}
          </AppCard>
        </View>
      )}
      
      <View style={styles.bottomGap} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontFamily: typography.family.body,
    color: colors.error.main,
    textAlign: 'center',
  },
  headerTitle: {
    fontFamily: typography.family.display,
    fontSize: typography.size['3xl'],
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.neutral[600],
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.family.headline,
    fontSize: typography.size.lg,
    color: colors.neutral[800],
    marginBottom: spacing.md,
  },
  trendBox: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
  },
  trendText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.neutral[700],
    fontStyle: 'italic',
  },
  chartContainer: {
    padding: spacing.md,
  },
  trackingCard: {
    padding: spacing.md,
  },
  trackingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  trackingItem: {
    alignItems: 'center',
  },
  trackingValue: {
    fontFamily: typography.family.display,
    fontSize: typography.size['2xl'],
    color: colors.primary.main,
  },
  trackingLabel: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.neutral[600],
  },
  recentRuns: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: spacing.md,
  },
  recentRunsTitle: {
    fontFamily: typography.family.headline,
    fontSize: typography.size.sm,
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  runItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  runTitle: {
    flex: 1,
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.neutral[800],
  },
  runDate: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.neutral[500],
  },
  bottomGap: {
    height: spacing['3xl'] * 2,
  },
  // Priority breakdown
  priorityCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  priorityRow: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  priorityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityLabel: {
    fontFamily: typography.family.headline,
    fontSize: typography.size.sm,
    color: colors.neutral[800],
    fontWeight: '600',
  },
  priorityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trendIndicator: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
  },
  escalationBadge: {
    backgroundColor: colors.error.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  escalationBadgeText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.error.dark,
    fontWeight: '600',
  },
  pctLabel: {
    fontFamily: typography.family.headline,
    fontSize: typography.size.sm,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  prioritySubtext: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.neutral[400],
  },
});
