import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer, AppCard, Icon, LoadingState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useProgress } from '@/src/features/progress/useProgress';
import { useChecklistTracking } from '@/src/features/progress/hooks';
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

import { StreakCard } from '@/src/shared/ui/cards/StreakCard';
import { CategoryProgressCard } from '@/src/shared/ui/cards/CategoryProgressCard';
import { TrendLineChart, StackedConsistencyChart } from '@/src/shared/ui/charts/ProgressCharts';

export default function PatientProgressScreen() {
  const { t } = useTranslation();
  const { loading, refreshing, error, overview, streaks, categories, charts, reload, refresh } = useProgress();
  const { data: checklistTracking, loading: checklistLoading } = useChecklistTracking(null);

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
        <Text style={styles.errorText}>We couldn't load your progress. Please try again.</Text>
      </View>
    );
  }

  const renderTrendMessage = (delta: number, context: 'consistency' | 'score') => {
    if (!overview) return null;
    let text = "Consistency is key!";
    let color = colors.neutral[600];

    if (delta > 0) {
      text = context === 'score' ? "You're scoring higher than last week. Great work!" : "You're more consistent than last week. Keep it up!";
      color = colors.success.main as any;
    } else if (delta < 0 && Math.abs(delta) < 0.2) {
      text = "Maintaining a steady pace. You've got this.";
    } else if (delta < 0) {
      text = "It's normal to have off weeks. Tomorrow is a fresh start.";
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
      <Text style={styles.headerTitle}>Your Progress</Text>
      <Text style={styles.headerSubtitle}>Consistent practice helps strengthen your long-term cognitive health.</Text>

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
          <AppCard style={styles.trackingCard}>
            <View style={styles.trackingRow}>
              <View style={styles.trackingItem}>
                <Text style={styles.trackingValue}>{checklistTracking.thisWeek.completedRuns}</Text>
                <Text style={styles.trackingLabel}>Completed This Week</Text>
              </View>
              <View style={styles.trackingItem}>
                <Text style={styles.trackingValue}>{checklistTracking.thisMonth.completedRuns}</Text>
                <Text style={styles.trackingLabel}>Completed This Month</Text>
              </View>
            </View>
            {checklistTracking.thisWeek.runs.length > 0 && (
              <View style={styles.recentRuns}>
                <Text style={styles.recentRunsTitle}>Recent Checklists</Text>
                {checklistTracking.thisWeek.runs.slice(0, 3).map((run) => (
                  <View key={run.id} style={styles.runItem}>
                    <Icon name="checkbox-outline" size={16} color={run.status === 'completed' ? colors.success.main : colors.neutral[400]} />
                    <Text style={styles.runTitle} numberOfLines={1}>{run.templateTitle}</Text>
                    <Text style={styles.runDate}>{new Date(run.startedAt).toLocaleDateString()}</Text>
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
  }
});
