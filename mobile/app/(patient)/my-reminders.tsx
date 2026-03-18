import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { ScreenContainer, AppCard, StatusChip, Icon, LoadingState, EmptyState, ErrorState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useSessionStore } from '@/src/state/sessionStore';
import { remindersApi } from '@/src/features/reminders/api';
import type { Reminder } from '@/src/features/reminders/types';

/**
 * Patient reminder list — shows all active reminders with action buttons.
 */
export default function PatientRemindersScreen() {
  const userId = useSessionStore((s) => s.userId);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const { reminders: r } = await remindersApi.list(userId, { active: 'true' });
      setReminders(r);
    } catch (err: any) {
      setError(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: 'done' | 'snooze' | 'skip') => {
    try {
      await remindersApi.recordAction(id, { action, source: 'reminder_list' });
      Alert.alert('Success', `Reminder marked as ${action}`);
      load(); // Refresh
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record action');
    }
  };

  if (loading) return <ScreenContainer><LoadingState message="Loading reminders..." /></ScreenContainer>;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={load} /></ScreenContainer>;

  return (
    <ScreenContainer scroll={false} padded={false}>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="alarm-outline"
            title="No reminders yet"
            message="Your reminders will appear here. Ask your caregiver to add some."
          />
        }
        renderItem={({ item }) => (
          <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Icon name={getCategoryIcon(item.category)} size={24} color={colors.primary[500]} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardTime}>
                    {item.scheduledTime} · {item.category}
                  </Text>
                </View>
              </View>
              <StatusChip
                label={item.isActive ? 'Active' : 'Inactive'}
                variant={item.isActive ? 'success' : 'default'}
              />
            </View>

            {item.description && (
              <Text style={styles.description}>{item.description}</Text>
            )}

            {/* Action buttons */}
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.success.light }]}
                onPress={() => handleAction(item.id, 'done')}
                accessibilityLabel="Mark as done"
              >
                <Icon name="checkmark-circle" size={18} color={colors.success.main} />
                <Text style={[styles.actionText, { color: colors.success.main }]}>Done</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.warning.light }]}
                onPress={() => handleAction(item.id, 'snooze')}
                accessibilityLabel="Snooze"
              >
                <Icon name="time-outline" size={18} color={colors.warning.main} />
                <Text style={[styles.actionText, { color: colors.warning.main }]}>Snooze</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.neutral[100] }]}
                onPress={() => handleAction(item.id, 'skip')}
                accessibilityLabel="Skip"
              >
                <Icon name="close-circle-outline" size={18} color={colors.neutral[500]} />
                <Text style={[styles.actionText, { color: colors.neutral[500] }]}>Skip</Text>
              </Pressable>
            </View>
          </AppCard>
        )}
      />
    </ScreenContainer>
  );
}

function getCategoryIcon(category: string) {
  const map: Record<string, any> = {
    medication: 'medkit-outline',
    appointment: 'calendar-outline',
    task: 'clipboard-outline',
    hydration: 'water-outline',
    meal: 'restaurant-outline',
    call: 'call-outline',
  };
  return map[category] || 'ellipse-outline';
}

const styles = StyleSheet.create({
  list: { padding: spacing['2xl'], gap: spacing.md },
  card: { marginBottom: 0 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  cardTime: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    marginTop: 2,
  },
  description: {
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  actionText: {
    fontSize: typography.size.xs,
    fontWeight: '600',
  },
});
