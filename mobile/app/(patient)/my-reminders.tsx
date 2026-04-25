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
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import {
  ScreenContainer,
  AppCard,
  AppButton,
  StatusChip,
  Icon,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/src/shared/ui';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { useSessionStore } from '@/src/state/sessionStore';
import { useReminders, useReminderAction } from '@/src/features/reminders/hooks';
import type { Reminder, PriorityLevel, ReminderType } from '@/src/features/reminders/types';
import { checklistsApi } from '@/src/features/checklists/api';
import { remindersApi } from '@/src/features/reminders/api';
import type { ChecklistRun, StepProgress } from '@/src/features/checklists/types';
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

/**
 * Patient reminders screen — browse active reminders, take actions.
 * Supports pull-to-refresh, per-action loading states, and error feedback.
 */
export default function PatientRemindersScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const { reminders, loading, error, refreshing, refresh, reload } = useReminders(userId, { active: 'true', pendingOnly: true });
  const { actionLoading, actionError, submit } = useReminderAction(reload);
  const [selected, setSelected] = useState<Reminder | null>(null);
  const [activeRun, setActiveRun] = useState<ChecklistRun | null>(null);
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);
  const [runModalVisible, setRunModalVisible] = useState(false);
  const [runLoading, setRunLoading] = useState(false);

  const handleAction = useCallback(
    async (id: string, action: 'done' | 'snooze' | 'skip' | 'start_now') => {
      const reminder = reminders.find((r) => r.id === id);

      // For guided reminders with start_now, open checklist execution
      if (action === 'start_now' && reminder?.reminderType === 'guided' && reminder.linkedChecklist?.id) {
        setRunLoading(true);
        try {
          // First fetch the template details to get steps
          const { templates } = await checklistsApi.listTemplates(userId!);
          const template = templates.find(t => t.id === reminder.linkedChecklist?.id);

          if (!template) {
            Alert.alert(t('common.error'), t('patientReminders.templateNotFound'));
            return;
          }

          if (!template.steps || template.steps.length === 0) {
            Alert.alert(t('patientReminders.emptyChecklistTitle'), t('patientReminders.emptyChecklistMsg'));
            return;
          }

          const { run } = await checklistsApi.startRun(userId!, {
            templateId: reminder.linkedChecklist.id,
          });

          // Attach template with steps to the run for display
          setActiveRun({
            ...run,
            template: {
              id: template.id,
              title: template.title,
              steps: template.steps,
            },
          });
          setActiveReminderId(id);
          setRunModalVisible(true);
          eventLogger.log({
            eventName: EventNames.CHECKLIST_STARTED,
            screenName: 'PatientRemindersScreen',
            source: 'reminder_start_now',
            payload: { checklistTemplateId: reminder.linkedChecklist.id, reminderId: id, stepCount: template.steps.length },
          });
        } catch (err: any) {
          Alert.alert(t('common.error'), err.message || t('checklists.failedToStart'));
        } finally {
          setRunLoading(false);
        }
        return;
      }

      // start_now for simple reminders acts as 'done'
      const normalizedAction: 'done' | 'snooze' | 'skip' = action === 'start_now' ? 'done' : action;
      await submit(id, normalizedAction);
      if (reminder) {
        eventLogger.log({
          eventName:
            action === 'done'
              ? EventNames.REMINDER_DONE
              : action === 'snooze'
              ? EventNames.REMINDER_SNOOZED
              : action === 'start_now'
              ? EventNames.REMINDER_DONE
              : EventNames.REMINDER_SKIPPED,
          screenName: 'PatientRemindersScreen',
          source: 'reminder_list',
          payload: { reminderCategory: reminder.category, reminderType: reminder.reminderType },
        });
      }
    },
    [submit, reminders, userId, t],
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

      {/* Checklist execution modal for guided reminders */}
      <ChecklistExecutionModal
        run={activeRun}
        visible={runModalVisible}
        onClose={() => {
          setRunModalVisible(false);
          setActiveRun(null);
          setActiveReminderId(null);
        }}
        onComplete={async () => {
          setRunModalVisible(false);
          // Mark the associated reminder as complete using 'start_now' with checklistRunId
          if (activeReminderId && activeRun) {
            try {
              await remindersApi.recordAction(activeReminderId, {
                action: 'start_now',
                actionValue: { checklistRunId: activeRun.id },
              });
              eventLogger.log({
                eventName: EventNames.REMINDER_DONE,
                screenName: 'PatientRemindersScreen',
                source: 'guided_checklist_complete',
                payload: { checklistRunId: activeRun.id, reminderId: activeReminderId },
              });
              // Refresh reminders list
              await refresh();
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message || t('patientReminders.failedToComplete'));
            }
          }
          setActiveRun(null);
          setActiveReminderId(null);
        }}
      />
    </>
  );
}

// ─── Reminder Card ─────────────────────────────────────────────────────────

interface ReminderCardProps {
  reminder: Reminder;
  actionLoading: boolean;
  onAction: (id: string, action: 'done' | 'snooze' | 'skip' | 'start_now') => void;
  onPress: () => void;
}

function ReminderCard({ reminder, actionLoading, onAction, onPress }: ReminderCardProps) {
  const { t, i18n } = useTranslation();
  const isGuided = reminder.reminderType === 'guided';
  const isHighPriority = reminder.priority === 'high' || reminder.priority === 'critical';
  
  return (
    <View style={[styles.cardWrapper, styles.card, isHighPriority && styles.highPriorityCard]}>
      {/* Clickable Header & Body */}
      <Pressable onPress={onPress} accessibilityRole="button">
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, isGuided && styles.guidedBadge]}>
            <Icon name={isGuided ? 'list-outline' : getCategoryIcon(reminder.category)} size={20} color={isGuided ? colors.warning.main : colors.primary[500]} />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle} numberOfLines={2}>{reminder.title}</Text>
              {/* Priority Badge */}
              {isHighPriority && (
                <View style={[styles.priorityBadge, reminder.priority === 'critical' && styles.criticalBadge]}>
                  <Text style={styles.priorityText}>
                    {reminder.priority === 'critical' ? '!' : '↑'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cardMeta}>
              <Icon name="time-outline" size={12} color={colors.neutral[400]} />
              <Text style={styles.cardTime}>{reminder.scheduledTime}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.cardCategory}>{t(`categories.${reminder.category}`, { defaultValue: reminder.category })}</Text>
              {/* Reminder Type Badge */}
              <Text style={styles.dot}>·</Text>
              <Text style={[styles.cardCategory, isGuided && styles.guidedText]}>
                {isGuided ? t('patientReminders.guided') : t('patientReminders.simple')}
              </Text>
            </View>
            {/* Linked Checklist Info for Guided Reminders */}
            {isGuided && reminder.linkedChecklist && (
              <View style={styles.checklistInfo}>
                <Icon name="list-outline" size={12} color={colors.primary[500]} />
                <Text style={styles.checklistText}>
                  {reminder.linkedChecklist.title} · {Intl.NumberFormat(i18n.language).format(reminder.linkedChecklist.stepCount)} {reminder.linkedChecklist.stepCount === 1 ? t('patientChecklists.step') : t('patientChecklists.steps')}
                </Text>
              </View>
            )}
          </View>
          <StatusChip
            label={reminder.isActive ? t('patientReminders.active') : t('patientReminders.inactive')}
            variant={reminder.isActive ? 'success' : 'default'}
          />
        </View>

        {reminder.description ? (
          <Text style={styles.description} numberOfLines={2}>{reminder.description}</Text>
        ) : null}
      </Pressable>

      {/* Action buttons - Different for Simple vs Guided */}
      {actionLoading ? (
        <View style={styles.actionLoading}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
          <Text style={styles.actionLoadingText}>{t('patientReminders.saving')}</Text>
        </View>
      ) : isGuided ? (
        // Guided Reminder: Start Now, Snooze, Skip
        <View style={styles.actionRow}>
          <ActionButton
            label={t('patientReminders.startNow')}
            icon="play-circle"
            color={colors.primary[500]}
            bg={colors.primary[50]}
            onPress={() => onAction(reminder.id, 'start_now')}
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
      ) : (
        // Simple Reminder: Done, Snooze, Skip
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
  const { t, i18n } = useTranslation();
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
                <StatusChip label={t(`categories.${reminder.category}`, { defaultValue: reminder.category })} variant="info" />
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

// ─── Checklist Execution Modal ──────────────────────────────────────────────

interface ChecklistExecutionModalProps {
  run: ChecklistRun | null;
  visible: boolean;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
}

function ChecklistExecutionModal({ run, visible, onClose, onComplete }: ChecklistExecutionModalProps) {
  const { t, i18n } = useTranslation();
  const [stepProgress, setStepProgress] = useState<StepProgress[]>([]);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (run) {
      setStepProgress(run.stepProgress || []);
    }
  }, [run]);

  const toggleStep = (stepId: string) => {
    setStepProgress(prev => {
      const existing = prev.find(sp => sp.stepId === stepId);
      if (existing) {
        return prev.map(sp =>
          sp.stepId === stepId
            ? { ...sp, completed: !sp.completed, completedAt: !sp.completed ? new Date().toISOString() : null }
            : sp
        );
      }
      return [...prev, { stepId, completed: true, completedAt: new Date().toISOString() }];
    });
  };

  const completedCount = stepProgress.filter(s => s.completed).length;
  const templateSteps = run?.template?.steps || [];
  const totalSteps = templateSteps.length;
  const allCompleted = completedCount === totalSteps && totalSteps > 0;
  const progress = totalSteps > 0 ? completedCount / totalSteps : 0;

  const handleComplete = async () => {
    if (!run) return;
    setCompleting(true);
    try {
      await checklistsApi.updateRun(run.id, { status: 'completed', stepProgress });
      await onComplete();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to complete checklist');
    } finally {
      setCompleting(false);
    }
  };

  if (!visible || !run) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.runContainer}>
        <View style={styles.runHeader}>
          <Text style={styles.runTitle}>{run.template?.title || t('patientReminders.checklistDefaultTitle')}</Text>
          <Pressable onPress={onClose} style={styles.runClose}>
            <Icon name="close" size={24} color={colors.neutral[600]} />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={styles.runProgressSection}>
          <View style={styles.runProgressLabelRow}>
            <Text style={styles.runProgressLabel}>
              {Intl.NumberFormat(i18n.language).format(completedCount)} / {Intl.NumberFormat(i18n.language).format(totalSteps)} {t('patientReminders.stepsCompleted')}
            </Text>
            {allCompleted && (
              <Icon name="checkmark-circle" size={18} color={colors.success.main} />
            )}
          </View>
          <View style={styles.runProgressTrack}>
            <View style={[styles.runProgressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        <ScrollView style={styles.runScroll} showsVerticalScrollIndicator={false}>
          {templateSteps.map((step, idx) => {
            const sp = stepProgress.find(s => s.stepId === step.id);
            const done = sp?.completed ?? false;
            const videoSource = step.videoUrl;
            const imageSource = step.imageUrl;

            return (
              <Pressable
                key={step.id}
                style={[styles.runStepRow, done && styles.runStepRowDone]}
                onPress={() => toggleStep(step.id)}
                accessibilityRole="checkbox"
                accessibilityLabel={step.title}
                accessibilityState={{ checked: done }}
              >
                <View style={[styles.runStepCheck, done && styles.runStepCheckDone]}>
                  {done && <Icon name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.runStepInfo}>
                  <Text style={styles.runStepNumber}>{t('patientChecklists.stepNumber', { num: Intl.NumberFormat(i18n.language).format(idx + 1) })}</Text>
                  <Text style={[styles.runStepTitle, done && styles.runStepTitleDone]}>{step.title}</Text>
                  {step.description ? (
                    <Text style={styles.runStepDesc}>{step.description}</Text>
                  ) : null}
                  {/* Media Section */}
                  {(imageSource || videoSource) && (
                    <View style={styles.runMediaContainer}>
                      {imageSource && (
                        <Image source={{ uri: imageSource }} style={styles.runStepImage} contentFit="cover" />
                      )}
                      {videoSource && (
                        <VideoPlayer url={videoSource} />
                      )}
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

          <View style={{ gap: spacing.md, paddingBottom: spacing['4xl'], marginTop: spacing.xl }}>
            <AppButton
              title={completing ? t('patientReminders.saving') : allCompleted ? t('patientReminders.complete') : t('patientChecklists.completePartialBtn')}
              onPress={handleComplete}
              loading={completing}
              variant={allCompleted ? 'primary' : 'outline'}
              icon={<Icon name="checkmark-circle-outline" size={20} color={allCompleted ? '#fff' : colors.primary[500]} />}
            />
            <AppButton
              title={t('patientChecklists.saveExitBtn')}
              onPress={onClose}
              variant="ghost"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function VideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (player) => {
    player.loop = true;
  });

  return (
    <VideoView
      style={styles.runStepVideo}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
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
  // Redesigned: Priority styles
  highPriorityCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning.main,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priorityBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.warning.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  criticalBadge: {
    backgroundColor: colors.error.main,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  // Redesigned: Guided indicator styles
  guidedBadge: {
    backgroundColor: colors.warning.light,
  },
  guidedText: {
    color: colors.warning.main,
    fontWeight: '600',
  },
  checklistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  checklistText: {
    fontSize: typography.size.xs,
    color: colors.primary[500],
  },

  // Checklist execution modal styles
  runContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
  },
  runHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  runTitle: {
    fontSize: typography.size.xl,
    fontFamily: typography.family.semiBold,
    color: colors.on_background,
  },
  runClose: {
    padding: spacing.sm,
  },
  runProgress: {
    fontSize: typography.size.base,
    color: colors.neutral[600],
    textAlign: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.primary[50],
  },
  runScroll: {
    flex: 1,
    padding: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[50],
    marginBottom: spacing.md,
  },
  stepRowCompleted: {
    backgroundColor: colors.success.light,
  },
  stepCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  stepCheckboxChecked: {
    backgroundColor: colors.success.main,
    borderColor: colors.success.main,
  },
  stepContent: {
    flex: 1,
  },
  stepNumber: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    marginBottom: spacing.xs,
  },
  stepText: {
    fontSize: typography.size.base,
    color: colors.on_background,
    lineHeight: 24,
  },
  stepTextCompleted: {
    color: colors.neutral[600],
    textDecorationLine: 'line-through',
  },
  runFooter: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.background,
  },
  completeButton: {
    backgroundColor: colors.success.main,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  completeButtonText: {
    color: '#fff',
    fontSize: typography.size.base,
    fontFamily: typography.family.semiBold,
  },

  // Run Modal styles (matching checklist.tsx)
  runProgressSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  runProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  runProgressLabel: {
    fontSize: typography.size.base,
    color: colors.neutral[600],
    fontWeight: '500',
  },
  runProgressTrack: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  runProgressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: radius.full,
  },
  runStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  runStepRowDone: {
    backgroundColor: colors.success.light,
  },
  runStepCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
    backgroundColor: colors.neutral[50],
  },
  runStepCheckDone: {
    backgroundColor: colors.success.main,
    borderColor: colors.success.main,
  },
  runStepInfo: {
    flex: 1,
  },
  runStepNumber: {
    fontSize: typography.size.xs,
    color: colors.neutral[400],
    fontWeight: '600',
    marginBottom: 2,
  },
  runStepTitle: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[800],
    lineHeight: 22,
  },
  runStepTitleDone: {
    color: colors.success.dark,
    textDecorationLine: 'line-through',
  },
  runStepDesc: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  runMediaContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  runStepImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.neutral[200],
  },
  runStepVideo: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.neutral[200],
  },
});
