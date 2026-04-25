import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius, shadows } from '../../../infrastructure/theme/tokens';
import { Icon } from '../Icon';
import type { StreakData } from '../../../features/progress/types';

interface StreakCardProps {
  title: string;
  icon: string;
  data: StreakData;
}
export function StreakCard({ title, icon, data, color = colors.primary[500] }: StreakCardProps) {
  const { t, i18n } = useTranslation();
  const isAlive = data.current > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <Icon name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: isAlive ? colors.success.dark : colors.neutral[900] }]}>
            {Intl.NumberFormat(i18n.language).format(data.current)} <Text style={styles.metricLabel}>{t('patientProgress.days')}</Text>
          </Text>
          <Text style={styles.metricSub}>{t('patientProgress.currentStreak')}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {Intl.NumberFormat(i18n.language).format(data.best)} <Text style={styles.metricLabel}>{t('patientProgress.days')}</Text>
          </Text>
          <Text style={styles.metricSub}>{t('patientProgress.bestStreak')}</Text>
        </View>
      </View>

      {isAlive && (
        <View style={[styles.statusBadge, { backgroundColor: colors.success.light }]}>
          <Icon name="flame" size={14} color={colors.success.dark} />
          <Text style={styles.statusText}>{t('patientProgress.keepItUp')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[900],
  },
  metricLabel: {
    fontSize: typography.size.xs,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  metricSub: {
    fontSize: typography.size.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: colors.neutral[200],
    height: '100%',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.success.dark,
  }
});
