import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import {
  ScreenContainer,
  AppCard,
  StatusChip,
  Icon,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/src/shared/ui';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { useSessionStore } from '@/src/state/sessionStore';
import { useReminders, useReminderAction } from '@/src/features/reminders/hooks';
import type { Reminder } from '@/src/features/reminders/types';

/**
 * Patient reminders screen — browse active reminders, take actions.
 * Supports pull-to-refresh, per-action loading states, and error feedback.
 */
export default function PatientRemindersScreen() {
  const userId = useSessionStore((s) => s.userId);
  const { reminders, loading, error, refreshing, refresh, reload } = useReminders(userId, { active: 'true', pendingOnly: true });
  const { actionLoading, actionError, submit } = useReminderAction(reload);
  const [selected, setSelected] = useState<Reminder | null>(null);

  const handleAction = useCallback(
    async (id: string, action: 'done' | 'snooze' | 'skip') => {
      await submit(id, action);
    },
    [submit],
  );

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingState message="Loading your reminders…" />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer scroll={false}>
        <ErrorState message={error} onRetry={reload} />
      </ScreenContainer>
    );
  }

  return (
    <>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary[500]} />}
        ListEmptyComponent={
          <EmptyState
            icon="alarm-outline"
            title="No reminders yet"
            message="Your reminders will appear here. Ask your caregiver to add some for you."
          />
        }
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            actionLoading={actionLoading === item.id}
            onAction={handleAction}
            onPress={() => setSelected(item)}
          />
        )}
      />

      {/* Action error banner */}
      {!!actionError && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={16} color={colors.error.main} />
          <Text style={styles.errorBannerText}>{actionError}</Text>
        </View>
      )}

      {/* Reminder detail sheet */}
      <ReminderDetailModal reminder={selected} onClose={() => setSelected(null)} />
    </>
  );
}

// ─── Reminder Card ─────────────────────────────────────────────────────────

interface ReminderCardProps {
  reminder: Reminder;
  actionLoading: boolean;
  onAction: (id: string, action: 'done' | 'snooze' | 'skip') => void;
  onPress: () => void;
}

function ReminderCard({ reminder, actionLoading, onAction, onPress }: ReminderCardProps) {
  return (
    <View style={[styles.cardWrapper, styles.card]}>
      {/* Clickable Header & Body */}
      <Pressable onPress={onPress} accessibilityRole="button">
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Icon name={getCategoryIcon(reminder.category)} size={20} color={colors.primary[500]} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>{reminder.title}</Text>
            <View style={styles.cardMeta}>
              <Icon name="time-outline" size={12} color={colors.neutral[400]} />
              <Text style={styles.cardTime}>{reminder.scheduledTime}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.cardCategory}>{formatCategory(reminder.category)}</Text>
            </View>
          </View>
          <StatusChip
            label={reminder.isActive ? 'Active' : 'Inactive'}
            variant={reminder.isActive ? 'success' : 'default'}
          />
        </View>

        {reminder.description ? (
          <Text style={styles.description} numberOfLines={2}>{reminder.description}</Text>
        ) : null}
      </Pressable>

      {/* Action buttons (Not inside Pressable) */}
      {actionLoading ? (
        <View style={styles.actionLoading}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
          <Text style={styles.actionLoadingText}>Saving…</Text>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <ActionButton
            label="Done"
            icon="checkmark-circle"
            color={colors.success.main}
            bg={colors.success.light}
            onPress={() => onAction(reminder.id, 'done')}
          />
          <ActionButton
            label="Snooze"
            icon="time-outline"
            color={colors.warning.main}
            bg={colors.warning.light}
            onPress={() => onAction(reminder.id, 'snooze')}
          />
          <ActionButton
            label="Skip"
            icon="close-circle-outline"
            color={colors.neutral[500]}
            bg={colors.neutral[100]}
            onPress={() => onAction(reminder.id, 'skip')}
          />
        </View>
      )}
    </View>
  );
}

// ─── Action Button ──────────────────────────────────────────────────────────

function ActionButton({
  label,
  icon,
  color,
  bg,
  onPress,
}: {
  label: string;
  icon: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, { backgroundColor: bg }, pressed && styles.actionBtnPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon as any} size={20} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────────────

function ReminderDetailModal({ reminder, onClose }: { reminder: Reminder | null; onClose: () => void }) {
  if (!reminder) return null;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Reminder Details</Text>
          <Pressable onPress={onClose} style={styles.modalClose} accessibilityLabel="Close">
            <Icon name="close" size={24} color={colors.neutral[600]} />
          </Pressable>
        </View>
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Main info */}
          <View style={styles.detailSection}>
            <View style={styles.detailIconRow}>
              <Icon name={getCategoryIcon(reminder.category)} size={32} color={colors.primary[500]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{reminder.title}</Text>
                <StatusChip label={formatCategory(reminder.category)} variant="info" />
              </View>
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionLabel}>Schedule</Text>
            <DetailRow icon="time-outline" label="Time" value={reminder.scheduledTime} />
            <DetailRow icon="calendar-outline" label="Start Date" value={reminder.startDate} />
            {reminder.endDate && <DetailRow icon="calendar-clear-outline" label="End Date" value={reminder.endDate} />}
            {reminder.daysOfWeek && reminder.daysOfWeek.length > 0 && (
              <DetailRow
                icon="repeat-outline"
                label="Repeats"
                value={reminder.daysOfWeek.map((d) => days[d]).join(', ')}
              />
            )}
          </View>

          {/* Description */}
          {reminder.description && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Notes</Text>
              <Text style={styles.detailDescription}>{reminder.description}</Text>
            </View>
          )}

          {/* Snooze */}
          {reminder.snoozeEnabled && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Snooze</Text>
              <DetailRow
                icon="notifications-outline"
                label="Snooze duration"
                value={`${reminder.defaultSnoozeMinutes} minutes`}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Icon name={icon as any} size={16} color={colors.neutral[400]} />
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCategoryIcon(category: string): any {
  const map: Record<string, string> = {
    medication: 'medkit-outline',
    appointment: 'calendar-outline',
    task: 'clipboard-outline',
    hydration: 'water-outline',
    meal: 'restaurant-outline',
    call: 'call-outline',
    custom: 'star-outline',
  };
  return map[category] ?? 'ellipse-outline';
}

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: {
    padding: spacing['2xl'],
    gap: spacing.md,
    paddingBottom: spacing['5xl'],
  },
  cardWrapper: {
    borderRadius: radius.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  categoryBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: typography.size.base,
    fontWeight: '700',
    color: colors.neutral[900],
    lineHeight: 22,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTime: { fontSize: typography.size.xs, color: colors.neutral[500] },
  dot: { fontSize: typography.size.xs, color: colors.neutral[400] },
  cardCategory: { fontSize: typography.size.xs, color: colors.neutral[400] },
  description: {
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  actionBtnPressed: { opacity: 0.75 },
  actionLabel: {
    fontSize: typography.size.sm,
    fontWeight: '700',
  },
  actionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  actionLoadingText: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
  },
  errorBanner: {
    position: 'absolute',
    bottom: spacing['4xl'],
    left: spacing['2xl'],
    right: spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error.light,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.error.dark,
  },
  // ─── Modal
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  modalClose: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  modalScroll: { flex: 1, padding: spacing['2xl'] },
  detailSection: {
    marginBottom: spacing['2xl'],
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...shadows.sm,
  },
  detailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  detailTitle: {
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  detailSectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  detailRowLabel: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    flex: 1,
  },
  detailRowValue: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  detailDescription: {
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    lineHeight: 22,
  },
});
