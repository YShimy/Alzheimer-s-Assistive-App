import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer, AppCard, Icon } from '@/src/shared/ui';
import { colors, typography, spacing } from '@/src/infrastructure/theme/tokens';

/**
 * Patient progress preview — shows a simple overview.
 * Data will be derived from backend events once progress endpoints are built.
 */
export default function PatientProgressScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.sectionTitle}>Weekly Overview</Text>

      <AppCard style={styles.card}>
        <View style={styles.statRow}>
          <StatItem icon="checkmark-circle-outline" label="Completed" value="—" color={colors.success.main} />
          <StatItem icon="time-outline" label="Snoozed" value="—" color={colors.warning.main} />
          <StatItem icon="close-circle-outline" label="Skipped" value="—" color={colors.neutral[400]} />
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Categories</Text>

      <AppCard
        style={styles.card}
        icon={<Icon name="medkit-outline" size={22} color={colors.primary[500]} />}
        title="Medication"
        subtitle="Adherence rate will appear here"
      >
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '0%' }]} />
        </View>
      </AppCard>

      <AppCard
        style={styles.card}
        icon={<Icon name="restaurant-outline" size={22} color={colors.secondary[500]} />}
        title="Meals & Hydration"
        subtitle="Tracking will appear here"
      >
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '0%', backgroundColor: colors.secondary[400] }]} />
        </View>
      </AppCard>

      <View style={styles.comingSoon}>
        <Icon name="construct-outline" size={24} color={colors.neutral[300]} />
        <Text style={styles.comingSoonText}>
          Detailed progress tracking is coming soon.{'\n'}
          Data will be derived from your reminder events.
        </Text>
      </View>
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
  comingSoon: {
    alignItems: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
  },
  comingSoonText: {
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 20,
  },
});
