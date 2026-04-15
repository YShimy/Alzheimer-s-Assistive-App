/**
 * GameProgressCard — Displays game score trend in the Progress section.
 *
 * Shows a simple SVG line chart of scores over time,
 * plus summary chips and trend comparison.
 * Uses pure SVG for zero dependency overhead.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius, shadows } from '../../../../infrastructure/theme/tokens';
import { AppCard } from '../../../../shared/ui';
import type { GameProgressResponse } from '../api';

interface GameProgressCardProps {
  progress: GameProgressResponse;
}

export function GameProgressCard({ progress }: GameProgressCardProps) {
  const { t } = useTranslation();
  const { summary, scoreSeries, comparison } = progress;

  if (summary.sessionsPlayed === 0) {
    return (
      <AppCard style={styles.card}>
        <View style={styles.emptyState}>
          <Ionicons name="game-controller-outline" size={32} color={colors.neutral[300]} />
          <Text style={styles.emptyTitle}>{t('games.safePath.noSessionsTitle')}</Text>
          <Text style={styles.emptyText}>{t('games.safePath.noSessionsSub')}</Text>
        </View>
      </AppCard>
    );
  }

  const hasEnoughData = scoreSeries.length >= 2;
  const delta = comparison.deltaVsPreviousSession;
  const deltaSign = delta > 0 ? '+' : '';
  const deltaColor = delta > 0 ? colors.success.main : delta < 0 ? colors.error.main : colors.neutral[500];
  const trendIcon = delta > 0 ? 'trending-up' : delta < 0 ? 'trending-down' : 'remove-outline';

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="game-controller-outline" size={20} color={colors.primary[500]} />
          <Text style={styles.headerTitle}>{t('games.safePath.title')}</Text>
        </View>
        {hasEnoughData && (
          <View style={[styles.trendBadge, { backgroundColor: delta > 0 ? colors.success.light : delta < 0 ? colors.error.light : colors.neutral[100] }]}>
            <Ionicons name={trendIcon as any} size={14} color={deltaColor} />
            <Text style={[styles.trendText, { color: deltaColor }]}>
              {deltaSign}{delta}
            </Text>
          </View>
        )}
      </View>

      {/* Score chart */}
      {hasEnoughData ? (
        <View style={styles.chartContainer}>
          <SimpleLineChart data={scoreSeries.map(s => s.score)} height={100} />
        </View>
      ) : (
        <View style={styles.singleSession}>
          <Text style={styles.singleSessionText}>{t('games.safePath.playMoreForTrend')}</Text>
        </View>
      )}

      {/* Summary chips */}
      <View style={styles.chipsRow}>
        <Chip icon="star-outline" label={t('games.safePath.bestLabel')} value={summary.bestScore.toString()} color={colors.primary[500]} />
        <Chip icon="analytics-outline" label={t('games.safePath.averageLabel')} value={summary.averageScore.toString()} color={colors.neutral[600]} />
        <Chip icon="layers-outline" label={t('games.safePath.topTierLabel')} value={`T${summary.highestTierEver}`} color={colors.warning.main} />
        <Chip icon="repeat-outline" label={t('games.safePath.sessionsLabel')} value={summary.sessionsPlayed.toString()} color={colors.neutral[500]} />
      </View>
    </AppCard>
  );
}

// ─── Simple SVG-free Line Chart ─────────────────────────────

function SimpleLineChart({ data, height }: { data: number[]; height: number }) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  return (
    <View style={[chartStyles.container, { height }]}>
      <View style={chartStyles.chart}>
        {data.map((value, i) => {
          const barHeight = ((value - min) / range) * (height - 20);
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={chartStyles.barWrapper}>
              <View
                style={[
                  chartStyles.bar,
                  {
                    height: Math.max(barHeight, 4),
                    backgroundColor: isLast ? colors.primary[500] : colors.primary[200],
                    borderRadius: 3,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={chartStyles.axisRow}>
        <Text style={chartStyles.axisLabel}>{min}</Text>
        <Text style={chartStyles.axisLabel}>{max}</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  chart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    minWidth: 6,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  axisLabel: {
    fontSize: 10,
    color: colors.neutral[400],
  },
});

// ─── Chip helper ────────────────────────────────────────────

function Chip({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  trendText: {
    fontSize: typography.size.xs,
    fontWeight: '700',
  },
  chartContainer: {
    marginBottom: spacing.sm,
  },
  singleSession: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  singleSessionText: {
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    gap: 2,
  },
  chipValue: {
    fontSize: typography.size.base,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  chipLabel: {
    fontSize: 10,
    color: colors.neutral[400],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 20,
  },
});
