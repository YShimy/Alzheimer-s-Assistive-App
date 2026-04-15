import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer, AppCard, AppButton, Icon, LoadingState, EmptyState } from '@/src/shared/ui';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { checklistsApi } from '@/src/features/checklists/api';
import type { ChecklistTemplate, ChecklistRun, StepProgress } from '@/src/features/checklists/types';
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

/**
 * Patient checklist screen.
 *
 * Backend status: Checklist endpoints return HTTP 501 (Not Implemented).
 * The screen detects this and shows a clear "Not yet available" state
 * instead of silently failing. Wire to real data once backend is complete.
 */
export default function PatientChecklistScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(true);
  const [activeRun, setActiveRun] = useState<ChecklistRun | null>(null);
  const [runModalVisible, setRunModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { templates: t } = await checklistsApi.listTemplates();
      setTemplates(t.filter((tpl) => tpl.isActive));
      setBackendReady(true);
    } catch (err: any) {
      if (err?.code === 'NOT_IMPLEMENTED' || err?.status === 501) {
        setBackendReady(false);
      }
      // For other errors (network etc.) just leave empty, user can refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleStart = async (template: ChecklistTemplate) => {
    if (!template.steps || template.steps.length === 0) {
      Alert.alert('Empty Checklist', 'This checklist has no steps yet. Ask your caregiver to add some.');
      return;
    }
    setSubmitting(true);
    try {
      const { run } = await checklistsApi.startRun({ templateId: template.id });
      // Attach template steps for the run view
      setActiveRun({ ...run, template: { id: template.id, title: template.title, steps: template.steps } });
      setRunModalVisible(true);

      eventLogger.log({
        eventName: EventNames.CHECKLIST_STARTED,
        screenName: 'PatientChecklistScreen',
        payload: { templateId: template.id, stepCount: template.steps.length },
      });
    } catch (err: any) {
      if (err?.code === 'NOT_IMPLEMENTED' || err?.status === 501) {
        Alert.alert('Not Available', 'Checklist runs are not yet enabled on the server. Check back soon.');
      } else {
        Alert.alert('Error', err.message || 'Failed to start checklist');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!activeRun) return;
    setSubmitting(true);
    try {
      await checklistsApi.updateRun(activeRun.id, {
        status: 'completed',
        stepProgress: activeRun.stepProgress,
      });
      setRunModalVisible(false);
      setActiveRun(null);
      Alert.alert('Done!', 'Great job completing the checklist.');

      eventLogger.log({
        eventName: EventNames.CHECKLIST_COMPLETED,
        screenName: 'PatientChecklistScreen',
        payload: { completedStepsCount: activeRun.stepProgress.filter((s) => s.completed).length, totalSteps: activeRun.template?.steps?.length },
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark complete');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStep = (stepId: string) => {
    if (!activeRun) return;
    setActiveRun((prev) => {
      if (!prev) return prev;
      const existing = prev.stepProgress.find((sp) => sp.stepId === stepId);
      const updated: StepProgress[] = existing
        ? prev.stepProgress.map((sp) =>
            sp.stepId === stepId ? { ...sp, completed: !sp.completed, completedAt: !sp.completed ? new Date().toISOString() : null } : sp,
          )
        : [...prev.stepProgress, { stepId, completed: true, completedAt: new Date().toISOString() }];
      return { ...prev, stepProgress: updated };
    });
  };

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <LoadingState message={t('patientChecklists.loading')} />
      </ScreenContainer>
    );
  }

  if (!backendReady) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon="construct-outline"
          title={t('patientChecklists.comingSoonTitle')}
          message={t('patientChecklists.comingSoonMsg')}
          action={
            <AppButton title={t('patientChecklists.checkAgainBtn')} onPress={load} variant="outline" fullWidth={false} />
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="checkbox-outline"
            title={t('patientChecklists.noChecklists')}
            message={t('patientChecklists.noChecklistsMsg')}
          />
        }
        renderItem={({ item }) => (
          <ChecklistTemplateCard
            template={item}
            onStart={() => handleStart(item)}
            starting={submitting}
          />
        )}
      />

      {/* FAB to Manage Checklists */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(patient)/manage-checklists')}
        accessibilityRole="button"
        accessibilityLabel="Manage Checklists"
      >
        <Icon name="settings-outline" size={24} color="#fff" />
      </Pressable>

      {/* Active Run Modal */}
      {activeRun && (
        <RunModal
          run={activeRun}
          visible={runModalVisible}
          onToggleStep={toggleStep}
          onComplete={handleComplete}
          onAbandon={() => {
            setRunModalVisible(false);
            setActiveRun(null);
          }}
          submitting={submitting}
        />
      )}
    </>
  );
}

// ─── Template Card ──────────────────────────────────────────────────────────

function ChecklistTemplateCard({
  template,
  onStart,
  starting,
}: {
  template: ChecklistTemplate;
  onStart: () => void;
  starting: boolean;
}) {
  const { t } = useTranslation();
  const stepCount = template.steps?.length ?? 0;
  return (
    <AppCard style={styles.templateCard}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Icon name={getCategoryIcon(template.category)} size={22} color={colors.primary[500]} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{template.title}</Text>
          <View style={styles.cardMeta}>
            <Icon name="list-outline" size={12} color={colors.neutral[400]} />
            <Text style={styles.cardMetaText}>{stepCount} {stepCount === 1 ? 'step' : 'steps'}</Text>
            {template.estimatedMinutes && (
              <>
                <Text style={styles.dot}>·</Text>
                <Icon name="time-outline" size={12} color={colors.neutral[400]} />
                <Text style={styles.cardMetaText}>{template.estimatedMinutes} min</Text>
              </>
            )}
          </View>
        </View>
      </View>
      {template.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{template.description}</Text>
      ) : null}
      <AppButton
        title={starting ? t('patientChecklists.starting') : t('patientChecklists.startBtn')}
        onPress={onStart}
        loading={starting}
        icon={<Icon name="play-circle-outline" size={20} color="#fff" />}
        style={{ marginTop: spacing.md }}
      />
    </AppCard>
  );
}

// ─── Run Modal ──────────────────────────────────────────────────────────────

function RunModal({
  run,
  visible,
  onToggleStep,
  onComplete,
  onAbandon,
  submitting,
}: {
  run: ChecklistRun;
  visible: boolean;
  onToggleStep: (stepId: string) => void;
  onComplete: () => void;
  onAbandon: () => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const steps = run.template?.steps ?? [];
  const completedCount = steps.filter((s) =>
    run.stepProgress.find((sp) => sp.stepId === s.id && sp.completed),
  ).length;
  const allDone = completedCount === steps.length && steps.length > 0;
  const progress = steps.length > 0 ? completedCount / steps.length : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onAbandon}>
      <View style={styles.modal}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{run.template?.title ?? 'Checklist'}</Text>
          <Pressable onPress={onAbandon} style={styles.modalClose} accessibilityLabel="Close">
            <Icon name="close" size={22} color={colors.neutral[600]} />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>{t('patientChecklists.stepsDone', { done: completedCount, total: steps.length })}</Text>
            {allDone && (
              <Icon name="checkmark-circle" size={18} color={colors.success.main} />
            )}
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {steps.map((step, idx) => {
            const sp = run.stepProgress.find((s) => s.stepId === step.id);
            const done = sp?.completed ?? false;
            return (
              <Pressable
                key={step.id}
                style={[styles.stepRow, done && styles.stepRowDone]}
                onPress={() => onToggleStep(step.id)}
                accessibilityRole="checkbox"
                accessibilityLabel={step.title}
                accessibilityState={{ checked: done }}
              >
                <View style={[styles.stepCheck, done && styles.stepCheckDone]}>
                  {done && <Icon name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepNumber]}>Step {idx + 1}</Text>
                  <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>{step.title}</Text>
                  {step.description ? (
                    <Text style={styles.stepDesc}>{step.description}</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}

          <View style={{ gap: spacing.md, paddingBottom: spacing['4xl'], marginTop: spacing.xl }}>
            <AppButton
              title={submitting ? t('patientChecklists.starting') : allDone ? t('patientChecklists.completeBtn') : t('patientChecklists.completePartialBtn')}
              onPress={onComplete}
              loading={submitting}
              variant={allDone ? 'primary' : 'outline'}
              icon={<Icon name="checkmark-circle-outline" size={20} color={allDone ? '#fff' : colors.primary[500]} />}
            />
            <AppButton
              title={t('patientChecklists.saveExitBtn')}
              onPress={onAbandon}
              variant="ghost"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCategoryIcon(category: string): any {
  const map: Record<string, string> = {
    morning: 'sunny-outline',
    evening: 'moon-outline',
    medication: 'medkit-outline',
    hygiene: 'water-outline',
    activity: 'walk-outline',
    custom: 'list-outline',
  };
  return map[category] ?? 'checkbox-outline';
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { padding: spacing['2xl'], gap: spacing.md, paddingBottom: spacing['5xl'] },
  templateCard: { marginBottom: 0 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: typography.size.base, fontWeight: '700', color: colors.neutral[900] },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardMetaText: { fontSize: typography.size.xs, color: colors.neutral[500] },
  dot: { fontSize: typography.size.xs, color: colors.neutral[400] },
  cardDesc: { fontSize: typography.size.sm, color: colors.neutral[600], lineHeight: 20 },
  // ─── Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center', marginTop: spacing.md,
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
  modalTitle: { fontSize: typography.size.xl, fontWeight: '700', color: colors.neutral[900] },
  modalClose: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  progressSection: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: { fontSize: typography.size.sm, color: colors.neutral[600], fontWeight: '500' },
  progressTrack: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: radius.full,
  },
  modalScroll: { flex: 1, padding: spacing['2xl'] },
  // ─── Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  stepRowDone: { backgroundColor: colors.success.light },
  stepCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
    flexShrink: 0,
    marginTop: 2,
  },
  stepCheckDone: {
    backgroundColor: colors.success.main,
    borderColor: colors.success.main,
  },
  stepInfo: { flex: 1 },
  stepNumber: { fontSize: typography.size.xs, color: colors.neutral[400], fontWeight: '600', marginBottom: 2 },
  stepTitle: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[800],
    lineHeight: 22,
  },
  stepTitleDone: { color: colors.success.dark, textDecorationLine: 'line-through' },
  stepDesc: { fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4, lineHeight: 18 },
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
