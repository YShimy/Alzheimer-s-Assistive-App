import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ScreenContainer, AppCard, Icon, LoadingState, StatusChip, EmptyState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { carelinksApi } from '@/src/features/carelinks/api';
import { usePatientProgress } from '@/src/features/progress/usePatientProgress';
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
      color = colors.success.dark;
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
  }
});
