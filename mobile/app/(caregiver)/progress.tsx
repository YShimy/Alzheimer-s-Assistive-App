import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ScreenContainer, AppCard, Icon, LoadingState, StatusChip, EmptyState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { carelinksApi } from '@/src/features/carelinks/api';
import { usePatientProgress } from '@/src/features/progress/usePatientProgress';
import { useChecklistTracking, usePriorityBreakdown, useEscalations } from '@/src/features/progress/hooks';
import type { CareLink } from '@/src/features/carelinks/types';
import { useFocusEffect } from 'expo-router';
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

import { StreakCard } from '@/src/shared/ui/cards/StreakCard';
import { CategoryProgressCard } from '@/src/shared/ui/cards/CategoryProgressCard';
import { TrendLineChart, StackedConsistencyChart } from '@/src/shared/ui/charts/ProgressCharts';


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

  const { loading: progressLoading, refreshing, error, overview, streaks, categories, charts, reload, refresh } = usePatientProgress(selectedPatient);
  const { data: checklistTracking } = useChecklistTracking(selectedPatient);
  const { data: priorityData } = usePriorityBreakdown(selectedPatient, 7);
  const { data: escalationData } = useEscalations(selectedPatient, 10);

  useFocusEffect(
    useCallback(() => {
      reload();
      eventLogger.log({
        eventName: EventNames.PROGRESS_VIEWED,
        screenName: 'CaregiverProgressScreen',
        payload: { viewType: 'caregiver' },
      });
    }, [reload])
  );

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

  const renderTrendMessage = (delta: number, context: 'consistency' | 'score') => {
    if (!overview) return null;
    let text = "Consistency is key!";
    let color = colors.neutral[600];

    if (delta > 0) {
      text = context === 'score' ? "Scoring higher than last week. Great work!" : "More consistent than last week. Keep it up!";
      color = colors.success.main as any;
    } else if (delta < 0 && Math.abs(delta) < 0.2) {
      text = "Maintaining a steady pace.";
    } else if (delta < 0) {
      text = "It's normal to have off weeks.";
    }

    return (
      <View style={[styles.trendBox, { borderLeftColor: color }]}>
        <Text style={styles.trendText}>{text}</Text>
      </View>
    );
  };

  if (progressLoading && !overview) {
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
        </View>
        <LoadingState message={t('loading') || 'Loading...'} />
      </ScreenContainer>
    );
  }

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

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary.main]} />}
      >
        <Text style={styles.headerTitle}>Patient Progress</Text>
        <Text style={styles.headerSubtitle}>Viewing progress for {selectedLink?.patient?.displayName ?? 'Patient'}</Text>

        {/* ESCALATION ALERTS */}
        {escalationData && escalationData.escalations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Escalation Alerts</Text>
            {escalationData.escalations.slice(0, 5).map((alert) => {
              const priorityColor =
                alert.priority === 'critical'
                  ? colors.error.main
                  : alert.priority === 'high'
                  ? '#F59E0B'
                  : colors.neutral[500];

              const reasonLabels: Record<string, string> = {
                critical_skipped: 'Critical reminder skipped',
                high_priority_skipped: 'High priority skipped',
                repeated_skip_pattern: 'Multiple reminders skipped',
                guided_not_started: 'Guided task not started',
              };

              const reasonLabel =
                reasonLabels[alert.escalationReason ?? ''] || 'Reminder alert';

              return (
                <AppCard
                  key={alert.id}
                  style={[styles.alertCard, { borderLeftColor: priorityColor as string }]}
                >
                  <View style={styles.alertHeader}>
                    <Icon name="warning-outline" size={18} color={priorityColor as string} />
                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {alert.reminderTitle ?? 'Reminder'}
                    </Text>
                    {alert.priority && (
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: `${priorityColor}20` },
                        ]}
                      >
                        <Text style={[styles.priorityBadgeText, { color: priorityColor as string }]}>
                          {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.alertReason}>{reasonLabel}</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.timestamp).toLocaleString()}
                  </Text>
                </AppCard>
              );
            })}
          </View>
        )}

        {/* STREAKS SECTION */}
        {streaks && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Streaks</Text>
            <StreakCard title="Reminders" icon="notifications-outline" data={streaks.reminders} color={colors.primary.main} />
            <StreakCard title="Checklists" icon="checkbox-outline" data={streaks.checklists} color={colors.secondary.main} />
            <StreakCard title="Games" icon="game-controller-outline" data={streaks.games} color={colors.tertiary.main} />
          </View>
        )}

        {/* CONSISTENCY CHARTS */}
        {charts && charts.reminderSeries && charts.reminderSeries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Consistency (Last 7 Days)</Text>
            <AppCard style={styles.chartContainer}>
              {overview && renderTrendMessage(overview.comparison.reminderConsistencyDelta, 'consistency')}
              <StackedConsistencyChart data={charts.reminderSeries} type="reminders" />
            </AppCard>
          </View>
        )}

        {/* GAME SCORE CHARTS */}
        {charts && charts.gameScoreSeries && charts.gameScoreSeries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Game Performance (Last 7 Days)</Text>
            <AppCard style={styles.chartContainer}>
              {overview && renderTrendMessage(overview.comparison.gameScoreDeltaVsPrevious, 'score')}
              <TrendLineChart data={charts.gameScoreSeries} />
            </AppCard>
          </View>
        )}

        {/* PRIORITY BREAKDOWN */}
        {priorityData && priorityData.priorityBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Priority Breakdown (7 Days)</Text>
            {priorityData.criticalAdherenceSummary && (
              <Text style={styles.adherenceSummary}>{priorityData.criticalAdherenceSummary}</Text>
            )}
            <AppCard style={styles.priorityCard}>
              {priorityData.priorityBreakdown.map((item) => {
                const priorityColors: Record<string, string> = {
                  normal: colors.neutral[500] as string,
                  high: '#F59E0B',
                  critical: colors.error.main as string,
                };
                const barColor = priorityColors[item.priority] ?? (colors.primary.main as string);
                const pctLabel = `${Math.round(item.completionRate * 100)}%`;
                const trendIcon =
                  item.trendDelta === null
                    ? null
                    : item.trendDelta > 0
                    ? '▲'
                    : item.trendDelta < 0
                    ? '▼'
                    : '→';
                const trendColor =
                  item.trendDelta === null
                    ? colors.neutral[400]
                    : item.trendDelta > 0
                    ? colors.success.main
                    : item.trendDelta < 0
                    ? colors.error.main
                    : colors.neutral[500];

                return (
                  <View key={item.priority} style={styles.priorityRow}>
                    <View style={styles.priorityHeader}>
                      <Text style={styles.priorityLabel}>
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </Text>
                      <View style={styles.priorityMeta}>
                        {trendIcon && (
                          <Text style={[styles.trendIndicator, { color: trendColor as string }]}>
                            {trendIcon}{' '}
                            {item.trendDelta !== null
                              ? `${Math.round(Math.abs(item.trendDelta) * 100)}%`
                              : ''}
                          </Text>
                        )}
                        {item.escalationCount > 0 && (
                          <View style={styles.escalationBadge}>
                            <Text style={styles.escalationBadgeText}>
                              {item.escalationCount} alert
                              {item.escalationCount > 1 ? 's' : ''}
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
                      {item.doneCount} done · {item.skipCount} skipped ·{' '}
                      {item.snoozeCount} snoozed
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
            <CategoryProgressCard title="Reminders by Category (Last 30 Days)" categories={categories.reminderCategories} />
          </View>
        )}

        {/* CHECKLIST CATEGORIES */}
        {categories && categories.checklistCategories.length > 0 && (
          <View style={styles.section}>
            <CategoryProgressCard title="Checklists by Category (Last 30 Days)" categories={categories.checklistCategories} />
          </View>
        )}

        {/* CHECKLIST TRACKING */}
        {checklistTracking && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Checklist Activity</Text>
            <AppCard style={styles.chartContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: typography.family.display, fontSize: typography.size['2xl'], color: colors.primary.main }}>
                    {checklistTracking.thisWeek.completedRuns}
                  </Text>
                  <Text style={{ fontFamily: typography.family.body, fontSize: typography.size.xs, color: colors.neutral[600] }}>
                    Completed This Week
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: typography.family.display, fontSize: typography.size['2xl'], color: colors.primary.main }}>
                    {checklistTracking.thisMonth.completedRuns}
                  </Text>
                  <Text style={{ fontFamily: typography.family.body, fontSize: typography.size.xs, color: colors.neutral[600] }}>
                    Completed This Month
                  </Text>
                </View>
              </View>
              {checklistTracking.thisWeek.runs.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.neutral[200], paddingTop: spacing.md }}>
                  <Text style={{ fontFamily: typography.family.headline, fontSize: typography.size.sm, color: colors.neutral[700], marginBottom: spacing.sm }}>
                    Recent Checklists
                  </Text>
                  {checklistTracking.thisWeek.runs.slice(0, 3).map((run) => (
                    <View key={run.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
                      <Icon name="checkbox-outline" size={16} color={run.status === 'completed' ? colors.success.main : colors.neutral[400]} />
                      <Text style={{ flex: 1, fontFamily: typography.family.body, fontSize: typography.size.sm, color: colors.neutral[800] }} numberOfLines={1}>
                        {run.templateTitle}
                      </Text>
                      <Text style={{ fontFamily: typography.family.body, fontSize: typography.size.xs, color: colors.neutral[500] }}>
                        {new Date(run.startedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </AppCard>
          </View>
        )}
        
        <View style={styles.bottomGap} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    margin: spacing.lg,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  patientLabel: { fontSize: typography.size.xs, color: colors.neutral[500], marginBottom: 2 },
  patientName: { fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800] },
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
  bottomGap: {
    height: spacing['3xl'] * 2,
  },
  // Escalation alert cards
  alertCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error.main,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  alertTitle: {
    flex: 1,
    fontFamily: typography.family.headline,
    fontSize: typography.size.sm,
    color: colors.neutral[800],
    fontWeight: '600',
  },
  alertReason: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  alertTime: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.neutral[400],
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  priorityBadgeText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    fontWeight: '600',
  },
  // Priority breakdown
  adherenceSummary: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
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
