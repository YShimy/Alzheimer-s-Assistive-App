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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

/**
 * Patient reminders screen — browse active reminders, take actions.
 * Supports pull-to-refresh, per-action loading states, and error feedback.
 */
export default function PatientRemindersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const { reminders, loading, error, refreshing, refresh, reload } = useReminders(userId, { active: 'true', pendingOnly: true });
  const { actionLoading, actionError, submit } = useReminderAction(reload);
  const [selected, setSelected] = useState<Reminder | null>(null);

  const handleAction = useCallback(
    async (id: string, action: 'done' | 'snooze' | 'skip') => {
      await submit(id, action);
      const reminder = reminders.find((r) => r.id === id);
      if (reminder) {
        eventLogger.log({
          eventName:
            action === 'done'
              ? EventNames.REMINDER_DONE
              : action === 'snooze'
              ? EventNames.REMINDER_SNOOZED
              : EventNames.REMINDER_SKIPPED,
          screenName: 'PatientRemindersScreen',
          source: 'reminder_list',
          payload: { reminderCategory: reminder.category },
        });
      }
    },
    [submit, reminders],
  );

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingState message={t('patientReminders.loading')} />
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
            title={t('patientReminders.noReminders')}
            message={t('patientReminders.noRemindersMsg')}
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

      {/* FAB to Manage Reminders */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(patient)/manage-reminders')}
        accessibilityRole="button"
        accessibilityLabel="Manage Reminders"
      >
        <Icon name="settings-outline" size={24} color="#fff" />
      </Pressable>

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
  const { t } = useTranslation();
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
            label={t('patientReminders.done')}
            icon="checkmark-circle"
            color={colors.success.main}
            bg={colors.success.light}
            onPress={() => onAction(reminder.id, 'done')}
          />
          <ActionButton
            label={t('patientReminders.snooze')}
            icon="time-outline"
            color={colors.warning.main}
            bg={colors.warning.light}
            onPress={() => onAction(reminder.id, 'snooze')}
          />
          <ActionButton
            label={t('patientReminders.skip')}
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
  const { t } = useTranslation();
  if (!reminder) return null;

  const days = [
    t('days.sun'), t('days.mon'), t('days.tue'), t('days.wed'),
    t('days.thu'), t('days.fri'), t('days.sat')
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('patientReminders.details')}</Text>
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
            <Text style={styles.detailSectionLabel}>{t('patientReminders.schedule')}</Text>
            <DetailRow icon="time-outline" label={t('patientReminders.time')} value={reminder.scheduledTime} />
            <DetailRow icon="calendar-outline" label={t('patientReminders.startDate')} value={reminder.startDate} />
            {reminder.endDate && <DetailRow icon="calendar-clear-outline" label={t('patientReminders.endDate')} value={reminder.endDate} />}
            {reminder.daysOfWeek && reminder.daysOfWeek.length > 0 && (
              <DetailRow
                icon="repeat-outline"
                label={t('patientReminders.repeats')}
                value={reminder.daysOfWeek.map((d) => days[d]).join(', ')}
              />
            )}
          </View>

          {/* Description */}
          {reminder.description && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>{t('patientReminders.notes')}</Text>
              <Text style={styles.detailDescription}>{reminder.description}</Text>
            </View>
          )}

          {/* Snooze */}
          {reminder.snoozeEnabled && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>{t('patientReminders.snoozeLabel')}</Text>
              <DetailRow
                icon="notifications-outline"
                label={t('patientReminders.snoozeDuration')}
                value={`${reminder.defaultSnoozeMinutes}`}
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
  return category;
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
  fab: {
    position: 'absolute',
    bottom: spacing['3xl'],
    right: spacing['2xl'],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
});
