import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ScreenContainer,
  AppCard,
  AppButton,
  AppInput,
  Icon,
  StatusChip,
  LoadingState,
  EmptyState,
} from '@/src/shared/ui';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { checklistsApi } from '@/src/features/checklists/api';
import type { ChecklistTemplate, CreateChecklistTemplateInput } from '@/src/features/checklists/types';

const CATEGORIES = ['morning', 'evening', 'medication', 'hygiene', 'activity', 'custom'] as const;

interface DraftStep {
  id: string; // local draft ID
  title: string;
  description: string;
}

interface TemplateForm {
  title: string;
  description: string;
  category: string;
  estimatedMinutes: string;
  steps: DraftStep[];
}

function emptyForm(): TemplateForm {
  return {
    title: '',
    description: '',
    category: 'morning',
    estimatedMinutes: '',
    steps: [],
  };
}

function formFromTemplate(t: ChecklistTemplate): TemplateForm {
  return {
    title: t.title,
    description: t.description ?? '',
    category: t.category,
    estimatedMinutes: t.estimatedMinutes ? String(t.estimatedMinutes) : '',
    steps: (t.steps ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description ?? '',
    })),
  };
}

type FormMode = 'create' | 'edit';

/**
 * Caregiver checklist template management.
 *
 * Backend status: Returns HTTP 501 (Not Implemented) on all calls.
 * Screen clearly notifies user of this and stays functional once backend is ready.
 */
export default function CaregiverChecklistScreen() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { templates: t } = await checklistsApi.listTemplates();
      setTemplates(t);
      setBackendReady(true);
    } catch (err: any) {
      if (err?.code === 'NOT_IMPLEMENTED' || err?.status === 501) {
        setBackendReady(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ─── Step helpers ──────────────────────────────────────────────────────

  const addStep = () => {
    setForm((f) => ({
      ...f,
      steps: [...f.steps, { id: `draft_${Date.now()}`, title: '', description: '' }],
    }));
  };

  const updateStep = (id: string, field: 'title' | 'description', value: string) => {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const removeStep = (id: string) => {
    setForm((f) => ({ ...f, steps: f.steps.filter((s) => s.id !== id) }));
  };

  const moveStep = (id: string, direction: 'up' | 'down') => {
    setForm((f) => {
      const idx = f.steps.findIndex((s) => s.id === id);
      if (idx < 0) return f;
      const next = direction === 'up' ? idx - 1 : idx + 1;
      if (next < 0 || next >= f.steps.length) return f;
      const steps = [...f.steps];
      [steps[idx], steps[next]] = [steps[next]!, steps[idx]!];
      return { ...f, steps };
    });
  };

  // ─── Form logic ────────────────────────────────────────────────────────

  const openCreate = () => {
    setFormMode('create');
    setEditingTemplate(null);
    setForm(emptyForm());
    setFormErrors({});
    setModalVisible(true);
  };

  const openEdit = (t: ChecklistTemplate) => {
    setFormMode('edit');
    setEditingTemplate(t);
    setForm(formFromTemplate(t));
    setFormErrors({});
    setModalVisible(true);
  };

  const validate = (): boolean => {
    const errs: typeof formErrors = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    
    if (form.steps.length === 0) {
       Alert.alert('Validation Error', 'At least one step is required to create a checklist.');
       return false;
    }

    form.steps.forEach((s, i) => {
      if (!s.title.trim()) errs[`step_${i}`] = 'Step title required';
    });
    if (form.estimatedMinutes && isNaN(parseInt(form.estimatedMinutes, 10))) {
      errs.estimatedMinutes = 'Enter a number';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = (): CreateChecklistTemplateInput => ({
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    category: form.category,
    estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes, 10) : undefined,
    steps: form.steps.map((s, idx) => ({
      title: s.title.trim(),
      description: s.description.trim() || undefined,
      order: idx,
    })),
  });

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (formMode === 'create') {
        const { template } = await checklistsApi.createTemplate(buildPayload());
        setTemplates((prev) => [template, ...prev]);
        Alert.alert('Created', `"${template.title}" template added.`);
      } else if (editingTemplate) {
        const { template } = await checklistsApi.updateTemplate(editingTemplate.id, buildPayload());
        setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
        Alert.alert('Saved', `"${template.title}" updated.`);
      }
      setModalVisible(false);
    } catch (err: any) {
      if (err?.code === 'NOT_IMPLEMENTED' || err?.status === 501) {
        Alert.alert(
          'Not yet available',
          'The checklist backend is not yet implemented. Your form was validated successfully — wire this to the real endpoint once it is ready.',
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to save template');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = (t: ChecklistTemplate) => {
    Alert.alert(
      'Archive Template',
      `Archive "${t.title}"? Patients will no longer see it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await checklistsApi.archiveTemplate(t.id);
              setTemplates((prev) => prev.filter((tpl) => tpl.id !== t.id));
            } catch (err: any) {
              if (err?.code === 'NOT_IMPLEMENTED' || err?.status === 501) {
                Alert.alert('Not yet available', 'Archive endpoint not yet implemented on the backend.');
              } else {
                Alert.alert('Error', err.message || 'Failed to archive');
              }
            }
          },
        },
      ],
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) return <ScreenContainer><LoadingState /></ScreenContainer>;

  const activeTemplates = templates.filter((t) => t.isActive);
  const archivedTemplates = templates.filter((t) => !t.isActive);

  return (
    <>
      {!backendReady ? (
        <ScreenContainer>
          <View style={styles.backendNotice}>
            <Icon name="construct-outline" size={24} color={colors.warning.main} />
            <Text style={styles.backendNoticeTitle}>{t('caregiverChecklists.backendNoticeTitle')}</Text>
            <Text style={styles.backendNoticeText}>
              {t('caregiverChecklists.backendNoticeText')}
            </Text>
          </View>
          <AppButton
            title={t('caregiverChecklists.createAnywayBtn')}
            onPress={openCreate}
            variant="secondary"
            icon={<Icon name="add-circle-outline" size={20} color="#fff" />}
          />
        </ScreenContainer>
      ) : (
        <FlatList
          data={activeTemplates}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <AppButton
              title={t('caregiverChecklists.newTemplate')}
              onPress={openCreate}
              variant="secondary"
              icon={<Icon name="add-circle-outline" size={20} color="#fff" />}
              style={{ marginBottom: spacing.xl }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-outline"
              title={t('caregiverChecklists.noTemplates')}
              message={t('caregiverChecklists.noTemplatesMsg')}
              action={
                <AppButton title={t('caregiverChecklists.createFirstBtn')} onPress={openCreate} variant="secondary" fullWidth={false} />
              }
            />
          }
          renderItem={({ item }) => (
            <TemplateCard
              template={item}
              onEdit={() => openEdit(item)}
              onArchive={() => handleArchive(item)}
            />
          )}
          ListFooterComponent={
            archivedTemplates.length > 0 ? (
              <View style={{ marginTop: spacing['2xl'] }}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('caregiverChecklists.archived')}</Text>
                  <StatusChip label={String(archivedTemplates.length)} variant="default" />
                </View>
                {archivedTemplates.map((t) => (
                  <TemplateCard key={t.id} template={t} onEdit={() => {}} onArchive={() => {}} />
                ))}
              </View>
            ) : null
          }
        />
      )}

      {/* Edit / Create Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{formMode === 'create' ? t('caregiverChecklists.newTemplate') : t('caregiverChecklists.editTemplate')}</Text>
            <Pressable onPress={() => setModalVisible(false)} style={styles.modalClose} accessibilityLabel="Close">
              <Icon name="close" size={22} color={colors.neutral[600]} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <AppInput
              label={t('caregiverChecklists.titleLabel')}
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder={t('caregiverChecklists.titlePlaceholder')}
              error={formErrors.title}
            />

            {/* Description */}
            <AppInput
              label={t('caregiverChecklists.descLabel')}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder={t('caregiverChecklists.descPlaceholder')}
              multiline
              style={{ height: 70, paddingTop: spacing.md }}
            />

            {/* Category picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('caregiverChecklists.categoryLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.chip, form.category === cat && styles.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, category: cat }))}
                  >
                    <Icon
                      name={getCategoryIcon(cat)}
                      size={14}
                      color={form.category === cat ? '#fff' : colors.neutral[600]}
                    />
                    <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Duration */}
            <AppInput
              label={t('caregiverChecklists.durationLabel')}
              value={form.estimatedMinutes}
              onChangeText={(v) => setForm((f) => ({ ...f, estimatedMinutes: v }))}
              placeholder="e.g. 15"
              keyboardType="number-pad"
              error={formErrors.estimatedMinutes}
            />

            {/* Steps editor */}
            <View style={styles.stepsSection}>
              <View style={styles.stepsSectionHeader}>
                <Text style={styles.fieldLabel}>{t('caregiverChecklists.stepsCount', { count: form.steps.length })}</Text>
                <Pressable style={styles.addStepBtn} onPress={addStep} accessibilityLabel="Add step">
                  <Icon name="add-circle" size={20} color={colors.secondary[500]} />
                  <Text style={styles.addStepText}>{t('caregiverChecklists.addStep')}</Text>
                </Pressable>
              </View>

              {form.steps.length === 0 && (
                <View style={styles.noSteps}>
                  <Icon name="list-outline" size={24} color={colors.neutral[300]} />
                  <Text style={styles.noStepsText}>{t('caregiverChecklists.noStepsMsg')}</Text>
                </View>
              )}

              {form.steps.map((step, idx) => (
                <View key={step.id} style={styles.stepEditor}>
                  <View style={styles.stepEditorHeader}>
                    <Text style={styles.stepEditorNum}>Step {idx + 1}</Text>
                    <View style={styles.stepEditorActions}>
                      {idx > 0 && (
                        <Pressable onPress={() => moveStep(step.id, 'up')} style={styles.stepActionBtn} accessibilityLabel="Move up">
                          <Icon name="chevron-up" size={18} color={colors.neutral[500]} />
                        </Pressable>
                      )}
                      {idx < form.steps.length - 1 && (
                        <Pressable onPress={() => moveStep(step.id, 'down')} style={styles.stepActionBtn} accessibilityLabel="Move down">
                          <Icon name="chevron-down" size={18} color={colors.neutral[500]} />
                        </Pressable>
                      )}
                      <Pressable onPress={() => removeStep(step.id)} style={[styles.stepActionBtn, styles.stepRemoveBtn]} accessibilityLabel="Remove step">
                        <Icon name="trash-outline" size={16} color={colors.error.main} />
                      </Pressable>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.stepInput, !!formErrors[`step_${idx}`] && styles.stepInputError]}
                    value={step.title}
                    onChangeText={(v) => updateStep(step.id, 'title', v)}
                    placeholder={t('caregiverChecklists.stepTitlePlaceholder', { num: idx + 1 })}
                    placeholderTextColor={colors.neutral[400]}
                  />
                  {formErrors[`step_${idx}`] && (
                    <Text style={styles.stepError}>{formErrors[`step_${idx}`]}</Text>
                  )}
                  <TextInput
                    style={styles.stepDescInput}
                    value={step.description}
                    onChangeText={(v) => updateStep(step.id, 'description', v)}
                    placeholder={t('caregiverChecklists.stepDescPlaceholder')}
                    placeholderTextColor={colors.neutral[400]}
                  />
                </View>
              ))}
            </View>

            {/* Submit */}
            <View style={{ gap: spacing.md, paddingBottom: spacing['4xl'] }}>
              <AppButton
                title={formMode === 'create' ? t('caregiverChecklists.createTplBtn') : t('caregiverChecklists.saveChangesBtn')}
                onPress={handleSubmit}
                loading={submitting}
                variant="secondary"
              />
              {formMode === 'edit' && editingTemplate?.isActive && (
                <AppButton
                  title={t('caregiverChecklists.archiveTplBtn')}
                  onPress={() => {
                    setModalVisible(false);
                    setTimeout(() => handleArchive(editingTemplate!), 300);
                  }}
                  variant="danger"
                />
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ─── Template Card ──────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onArchive,
}: {
  template: ChecklistTemplate;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AppCard style={styles.templateCard}>
      <View style={styles.cardHeader}>
        <View style={styles.catBadge}>
          <Icon name={getCategoryIcon(template.category)} size={20} color={colors.secondary[500]} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{template.title}</Text>
          <View style={styles.cardMeta}>
            <Icon name="list-outline" size={12} color={colors.neutral[400]} />
            <Text style={styles.cardMetaText}>{template.steps?.length ?? 0} steps</Text>
            {template.estimatedMinutes && (
              <>
                <Text style={styles.dot}>·</Text>
                <Icon name="time-outline" size={12} color={colors.neutral[400]} />
                <Text style={styles.cardMetaText}>{template.estimatedMinutes} min</Text>
              </>
            )}
          </View>
        </View>
        <StatusChip
          label={template.isActive ? t('caregiverHome.active') : t('caregiverChecklists.archived')}
          variant={template.isActive ? 'success' : 'default'}
        />
      </View>
      {template.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{template.description}</Text>
      ) : null}
      {template.isActive && (
        <View style={styles.cardActions}>
          <AppButton title={t("caregiverPatients.editReminders").split(" ")[0]} onPress={onEdit} variant="outline" size="sm" style={{ flex: 1 }} />
          <AppButton title={t("caregiverChecklists.archived")} onPress={onArchive} variant="ghost" size="sm" style={{ flex: 1 }} />
        </View>
      )}
    </AppCard>
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
  list: { padding: spacing['2xl'], paddingBottom: spacing['5xl'] },
  backendNotice: {
    backgroundColor: colors.warning.light,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
    alignItems: 'center',
  },
  backendNoticeTitle: {
    fontSize: typography.size.base,
    fontWeight: '700',
    color: colors.warning.dark,
    textAlign: 'center',
  },
  backendNoticeText: {
    fontSize: typography.size.sm,
    color: colors.warning.dark,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral[800] },
  templateCard: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  catBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.secondary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: typography.size.base, fontWeight: '700', color: colors.neutral[900] },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardMetaText: { fontSize: typography.size.xs, color: colors.neutral[500] },
  dot: { fontSize: typography.size.xs, color: colors.neutral[400] },
  cardDesc: { fontSize: typography.size.sm, color: colors.neutral[600], lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
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
  modalScroll: { padding: spacing['2xl'] },
  // ─── Fields
  fieldGroup: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.secondary[500] },
  chipText: { fontSize: typography.size.xs, color: colors.neutral[700], fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  // ─── Steps editor
  stepsSection: { marginBottom: spacing.xl },
  stepsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.secondary[50],
  },
  addStepText: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.secondary[600],
  },
  noSteps: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing['2xl'],
    backgroundColor: colors.neutral[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
  },
  noStepsText: {
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  stepEditor: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  stepEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepEditorNum: {
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.secondary[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepEditorActions: { flexDirection: 'row', gap: spacing.xs },
  stepActionBtn: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.neutral[100],
  },
  stepRemoveBtn: { backgroundColor: colors.error.light },
  stepInput: {
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.base,
    color: colors.neutral[800],
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  stepInputError: { borderColor: colors.error.main },
  stepError: { fontSize: typography.size.xs, color: colors.error.main, marginBottom: spacing.sm },
  stepDescInput: {
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    minHeight: 40,
  },
});
