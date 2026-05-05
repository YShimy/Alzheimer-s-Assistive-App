import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ScreenContainer, AppCard, Icon, LoadingState, StatusChip, EmptyState } from '@/src/shared/ui';
import { PatientSwitcher } from '@/src/shared/ui/PatientSwitcher';
import { useCaregiverLinks } from '@/src/shared/hooks/useCaregiverLinks';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { usePatientProgress } from '@/src/features/progress/usePatientProgress';
import { useChecklistTracking, usePriorityBreakdown, useEscalations } from '@/src/features/progress/hooks';
import { useFocusEffect, useRouter } from 'expo-router';
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

import { StreakCard } from '@/src/shared/ui/cards/StreakCard';
import { CategoryProgressCard } from '@/src/shared/ui/cards/CategoryProgressCard';
import { TrendLineChart, StackedConsistencyChart } from '@/src/shared/ui/charts/ProgressCharts';

export default function CaregiverProgressScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  // ─── Global patient context ─────────────────────────────────────────────
  useCaregiverLinks();
  const { links, selectedPatientId, selectedPatientName, loaded } = useCaregiverPatientStore();
  const selectedPatient = selectedPatientId;

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

  if (!loaded) return <LoadingState message={t('loading') || 'Loading...'} />;

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

  if (!selectedPatient) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="person-outline"
          title={t('caregiverReminders.noPatientSelected')}
          message={t('caregiverReminders.selectPatientMsg')}
        />
        <PatientSwitcher />
      </ScreenContainer>
    );
  }

  const renderTrendMessage = (delta: number, context: 'consistency' | 'score') => {
    if (!overview) return null;
    let text = "Consistency is key!";
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

  if (progressLoading && !overview) {
    return (
      <ScreenContainer>
        <View style={styles.patientCard}>
          <Icon name="person-circle-outline" size={28} color={colors.secondary[500]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.patientLabel}>{t('caregiverReminders.managingFor')}</Text>
            <Text style={styles.patientName}>
              {selectedPatientName ?? 'Patient'}
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
            {selectedPatientName ?? 'Patient'}
          </Text>
        </View>
        {links.length > 1 && (
          <PatientSwitcher />
        )}
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary.main]} />}
      >
        <Text style={styles.headerTitle}>{t('caregiverTabs.progressHeader')}</Text>
        <Text style={styles.headerSubtitle}>{t('caregiverReminders.managingFor')} {selectedPatientName ?? t('auth.patient')}</Text>

        {/* PATIENT RECORDS ENTRY */}
        <AppCard
          style={[styles.section, { marginBottom: spacing.md }]}
          onPress={() => router.push('/(caregiver)/records')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary_container, alignItems: 'center', justifyContent: 'center', marginEnd: spacing.md }}>
              <Icon name="folder-open-outline" size={24} color={colors.primary.main} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.family.title, fontSize: typography.size.base, color: colors.on_surface }}>
                {t('records.title', 'Patient Records')}
              </Text>
              <Text style={{ fontFamily: typography.family.body, fontSize: typography.size.sm, color: colors.on_surface_variant, marginTop: 2 }}>
                {t('records.subtitle', 'Upload and organize patient-related documents for caregiver reference.')}
              </Text>
            </View>
            <View style={{ transform: [{ scaleX: i18n.language === 'ar' ? -1 : 1 }] }}>
              <Icon name="chevron-forward" size={20} color={colors.outline_variant} />
            </View>
          </View>
        </AppCard>

        {/* IMPORTANT INFORMATION ENTRY */}
        <AppCard
          style={[styles.section, { marginBottom: spacing.md }]}
          onPress={() => router.push('/(caregiver)/important-info')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary_container, alignItems: 'center', justifyContent: 'center', marginEnd: spacing.md }}>
              <Icon name="information-circle-outline" size={24} color={colors.secondary[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.family.title, fontSize: typography.size.base, color: colors.on_surface }}>
                {t('importantInfo.title', 'Important Information')}
              </Text>
              <Text style={{ fontFamily: typography.family.body, fontSize: typography.size.sm, color: colors.on_surface_variant, marginTop: 2 }}>
                {t('importantInfo.subtitle', 'Caregiver-provided information to support daily care and communication.')}
              </Text>
            </View>
            <View style={{ transform: [{ scaleX: i18n.language === 'ar' ? -1 : 1 }] }}>
              <Icon name="chevron-forward" size={20} color={colors.outline_variant} />
            </View>
          </View>
        </AppCard>

        {/* EXPORT SUMMARY PDF ENTRY */}
        <AppCard
          style={[styles.section, { marginBottom: spacing.xl }]}
          onPress={() => router.push('/(caregiver)/export-summary')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tertiary_container, alignItems: 'center', justifyContent: 'center', marginEnd: spacing.md }}>
              <Icon name="document-text-outline" size={24} color={colors.tertiary.main} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.family.title, fontSize: typography.size.base, color: colors.on_surface }}>
                {t('summaryExport.title', 'Export Summary PDF')}
              </Text>
              <Text style={{ fontFamily: typography.family.body, fontSize: typography.size.sm, color: colors.on_surface_variant, marginTop: 2 }}>
                {t('summaryExport.subtitle', 'Create a caregiver summary from reminders, routines, engagement, records, and important information.')}
              </Text>
            </View>
            <View style={{ transform: [{ scaleX: i18n.language === 'ar' ? -1 : 1 }] }}>
              <Icon name="chevron-forward" size={20} color={colors.outline_variant} />
            </View>
          </View>
        </AppCard>

        {/* ESCALATION ALERTS */}
        {escalationData && escalationData.escalations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ {t('patientProgress.escalationAlerts')}</Text>
            {escalationData.escalations.slice(0, 5).map((alert) => {
              const priorityColor =
                alert.priority === 'critical'
                  ? colors.error.main
                  : alert.priority === 'high'
                  ? '#F59E0B'
                  : colors.neutral[500];

              const reasonLabel =
                t(`patientProgress.reasons.${alert.escalationReason}`, { defaultValue: t('patientProgress.reasons.default') });

              return (
                <AppCard
                  key={alert.id}
                  style={[styles.alertCard, { borderLeftColor: priorityColor as string }]}
                >
                  <View style={styles.alertHeader}>
                    <Icon name="warning-outline" size={18} color={priorityColor as string} />
                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {alert.reminderTitle ?? t('patientProgress.reminder')}
                    </Text>
                    {alert.priority && (
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: `${priorityColor}20` },
                        ]}
                      >
                        <Text style={[styles.priorityBadgeText, { color: priorityColor as string }]}>
                          {t(`patientReminders.priority${alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}`)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.alertReason}>{reasonLabel}</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.timestamp).toLocaleString(i18n.language)}
                  </Text>
                </AppCard>
              );
            })}
          </View>
        )}

        {/* STREAKS SECTION */}
        {streaks && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('patientProgress.currentStreaks')}</Text>
            <StreakCard title={t('patientProgress.streaks.reminders')} icon="notifications-outline" data={streaks.reminders} color={colors.primary.main} />
            <StreakCard title={t('patientProgress.streaks.checklists')} icon="checkbox-outline" data={streaks.checklists} color={colors.secondary.main} />
            <StreakCard title={t('patientProgress.streaks.games')} icon="game-controller-outline" data={streaks.games} color={colors.tertiary.main} />
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
                const pctLabel = Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 }).format(item.completionRate);
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
                      {t(`patientProgress.priorityLevels.${item.priority}`, { defaultValue: item.priority })}
                    </Text>
                      <View style={styles.priorityMeta}>
                        {trendIcon && (
                          <Text style={[styles.trendIndicator, { color: trendColor as string }]}>
                            {trendIcon}{' '}
                            {item.trendDelta !== null
                              ? Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 }).format(Math.abs(item.trendDelta))
                              : ''}
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
            <AppCard style={styles.chartContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: typography.family.display, fontSize: typography.size['2xl'], color: colors.primary.main }}>
                    {Intl.NumberFormat(i18n.language).format(checklistTracking.thisWeek.completedRuns)}
                  </Text>
                  <Text style={{ fontFamily: typography.family.body, fontSize: typography.size.xs, color: colors.neutral[600] }}>
                    {t('patientProgress.completedThisWeek')}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: typography.family.display, fontSize: typography.size['2xl'], color: colors.primary.main }}>
                    {Intl.NumberFormat(i18n.language).format(checklistTracking.thisMonth.completedRuns)}
                  </Text>
                  <Text style={{ fontFamily: typography.family.body, fontSize: typography.size.xs, color: colors.neutral[600] }}>
                    {t('patientProgress.completedThisMonth')}
                  </Text>
                </View>
              </View>
              {checklistTracking.thisWeek.runs.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.neutral[200], paddingTop: spacing.md }}>
                  <Text style={{ fontFamily: typography.family.headline, fontSize: typography.size.sm, color: colors.neutral[700], marginBottom: spacing.sm }}>
                    {t('patientProgress.recentChecklists')}
                  </Text>
                  {checklistTracking.thisWeek.runs.slice(0, 3).map((run) => (
                    <View key={run.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
                      <Icon name="checkbox-outline" size={16} color={run.status === 'completed' ? colors.success.main : colors.neutral[400]} />
                      <Text style={{ flex: 1, fontFamily: typography.family.body, fontSize: typography.size.sm, color: colors.neutral[800] }} numberOfLines={1}>
                        {run.templateTitle}
                      </Text>
                      <Text style={{ fontFamily: typography.family.body, fontSize: typography.size.xs, color: colors.neutral[500] }}>
                        {new Date(run.startedAt).toLocaleDateString(i18n.language)}
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
