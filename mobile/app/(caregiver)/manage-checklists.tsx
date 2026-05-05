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
import { useState, useCallback, useEffect } from 'react';
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
import { PatientSwitcher } from '@/src/shared/ui/PatientSwitcher';
import { useCaregiverLinks } from '@/src/shared/hooks/useCaregiverLinks';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { checklistsApi } from '@/src/features/checklists/api';
import type { ChecklistTemplate, CreateChecklistTemplateInput } from '@/src/features/checklists/types';

import { mediaApi } from '@/src/features/media/api';
import { pickMedia } from '@/src/platform/filePicker';
import { Image } from 'expo-image';

const CATEGORIES = ['morning', 'evening', 'medication', 'hygiene', 'activity', 'custom'] as const;

interface DraftStep {
  id: string; // local draft ID
  title: string;
  description: string;
  imageAssetId?: string | null;
  videoAssetId?: string | null;
  imagePreviewUrl?: string | null;
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
      imageAssetId: s.imageAssetId,
      videoAssetId: s.videoAssetId,
    })),
  };
}

type FormMode = 'create' | 'edit';

/**
 * Caregiver checklist template management.
 */
export default function CaregiverChecklistScreen() {
  const { t, i18n } = useTranslation();

  // ─── Global patient context ─────────────────────────────────────────────
  useCaregiverLinks();
  const { links, selectedPatientId, loaded } = useCaregiverPatientStore();
  const selectedPatient = selectedPatientId;

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);


  const load = useCallback(async () => {
    if (!selectedPatient) {
      console.log('[CaregiverChecklists] No selectedPatient, skipping load');
      return;
    }
    console.log(`[CaregiverChecklists] Loading templates for patientId: ${selectedPatient}`);
    setLoading(true);
    try {
      const { templates: t } = await checklistsApi.listTemplates(selectedPatient);
      console.log(`[CaregiverChecklists] Loaded ${t.length} templates:`, t.map(tpl => ({ id: tpl.id, title: tpl.title, isActive: tpl.isActive })));
      setTemplates(t);
    } catch (err: any) {
      console.error('[CaregiverChecklists] Error loading templates:', err);
      if (err?.code === 'NOT_IMPLEMENTED' || err?.status === 501) {
        console.warn('Caregiver checklists backend returned 501');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPatient]);

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
      if (idx === -1) return f;
      if (direction === 'up' && idx === 0) return f;
      if (direction === 'down' && idx === f.steps.length - 1) return f;

      const newSteps = [...f.steps];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
      return { ...f, steps: newSteps };
    });
  };

  const handlePickMediaForStep = async (stepId: string, type: 'image' | 'video') => {
    const asset = await pickMedia(type);
    if (asset) {
      try {
        const { asset: mediaAsset } = await mediaApi.upload(asset.uri, asset.mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4'));
        setForm((f) => ({
          ...f,
          steps: f.steps.map((s) => s.id === stepId ? { 
            ...s, 
            [type === 'image' ? 'imageAssetId' : 'videoAssetId']: mediaAsset.id,
            imagePreviewUrl: type === 'image' ? mediaAsset.publicUrl : s.imagePreviewUrl
          } : s),
        }));
      } catch (error) {
        Alert.alert('Upload Failed', 'Could not upload media.');
      }
    }
  };

  const removeMediaFromStep = (stepId: string, type: 'image' | 'video') => {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s) => s.id === stepId ? { 
        ...s, 
        [type === 'image' ? 'imageAssetId' : 'videoAssetId']: null,
        imagePreviewUrl: type === 'image' ? null : s.imagePreviewUrl
      } : s),
    }));
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

  const validateForm = (): boolean => {
    const errs: typeof formErrors = {};
    if (!form.title.trim()) errs.title = t('caregiverChecklists.validation.titleRequired');
    
    if (form.steps.length === 0) {
      Alert.alert(t('common.error'), t('caregiverChecklists.validation.minSteps'));
      return false;
    }

    const invalidSteps = form.steps.some((s) => !s.title.trim());
    if (invalidSteps) {
      Alert.alert(t('common.error'), t('caregiverChecklists.validation.stepTitleRequired'));
      return false;
    }

    const mins = parseInt(form.estimatedMinutes, 10);
    if (form.estimatedMinutes && (isNaN(mins) || mins < 0)) {
      errs.estimatedMinutes = t('caregiverChecklists.validation.numberRequired');
      setFormErrors(errs);
      return false;
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
      imageAssetId: s.imageAssetId,
      videoAssetId: s.videoAssetId,
    })),
  });

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!selectedPatient) {
      console.log('[CaregiverChecklists] No selectedPatient, cannot submit');
      return;
    }
    console.log(`[CaregiverChecklists] Creating checklist for patientId: ${selectedPatient}`);
    setSubmitting(true);
    try {
      if (formMode === 'create') {
        const { template: created } = await checklistsApi.createTemplate(selectedPatient, buildPayload());
        setTemplates((prev) => [created, ...prev]);
        Alert.alert(t('caregiverChecklists.createdAlert'), t('caregiverChecklists.createdSuccess', { title: created.title }));
      } else if (editingTemplate) {
        const { template: updated } = await checklistsApi.updateTemplate(editingTemplate.id, buildPayload() as any);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        Alert.alert(t('caregiverChecklists.savedAlert'), t('caregiverChecklists.savedSuccess', { title: updated.title }));
      }
      setModalVisible(false);
    } catch (err: any) {
      if (err.message === 'Not Implemented') {
        Alert.alert(t('caregiverChecklists.savedAlert'), t('caregiverChecklists.backendNotImplemented'));
        setModalVisible(false);
      } else {
        Alert.alert(t('common.error'), err.message || t('common.error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = (t: ChecklistTemplate) => {
    Alert.alert(
      t('caregiverChecklists.archiveAlert'),
      t('caregiverChecklists.archiveConfirm', { title: t.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('caregiverChecklists.archiveTplBtn'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('caregiverChecklists.notAvailable'), t('caregiverChecklists.notAvailable'));
          },
        },
      ],
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (!loaded) return <ScreenContainer scroll={false}><LoadingState /></ScreenContainer>;
  if (error) return <ScreenContainer scroll={false}><EmptyState icon="alert-circle-outline" title="Error" message={error} /></ScreenContainer>;

  if (links.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="people-outline"
          title={t('caregiverReminders.noLinkedPatients')}
          message={t('caregiverReminders.linkFirstMsg')}
        />
      </ScreenContainer>
    );
  }

  if (!selectedPatient) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="person-outline"
          title={t('caregiverChecklists.noPatientSelected')}
          message={t('caregiverChecklists.selectPatientMsg')}
        />
        <PatientSwitcher />
      </ScreenContainer>
    );
  }
  const activeTemplates = templates.filter((t) => t.isActive);
  const archivedTemplates = templates.filter((t) => !t.isActive);
  const selectedLink = links.find((l) => l.patientUserId === selectedPatient);

  return (
    <>
      <ScreenContainer scroll={false} padded={false}>
        {/* Patient switcher pill */}
        <PatientSwitcher />

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
      </ScreenContainer>

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
                      size={16}
                      color={form.category === cat ? '#fff' : colors.neutral[600]}
                    />
                    <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>
                      {t(`categories.${cat}`)}
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
                    <Text style={styles.stepEditorNum}>
                      {t('caregiverChecklists.stepNumber', { num: Intl.NumberFormat(i18n.language).format(idx + 1) })}
                    </Text>
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

                  <View style={styles.stepMediaRow}>
                     {!step.imageAssetId && !step.videoAssetId ? (
                       <>
                        <Pressable style={styles.mediaBtn} onPress={() => handlePickMediaForStep(step.id, 'image')}>
                          <Icon name="image-outline" size={16} color={colors.primary.main} />
                          <Text style={styles.mediaBtnText}>{t('caregiverChecklists.addImage')}</Text>
                        </Pressable>
                        <Pressable style={styles.mediaBtn} onPress={() => handlePickMediaForStep(step.id, 'video')}>
                          <Icon name="videocam-outline" size={16} color={colors.secondary.main} />
                          <Text style={styles.mediaBtnText}>{t('caregiverChecklists.addVideo')}</Text>
                        </Pressable>
                       </>
                     ) : (
                       <View style={styles.mediaPreview}>
                          {step.imageAssetId && (
                            <View style={styles.previewContainer}>
                               <Icon name="image" size={16} color={colors.primary.main} />
                               <Text style={styles.previewText}>{t('caregiverChecklists.imageAttached')}</Text>
                               <Pressable onPress={() => removeMediaFromStep(step.id, 'image')}>
                                 <Icon name="close-circle" size={18} color={colors.error.main} />
                               </Pressable>
                            </View>
                          )}
                          {step.videoAssetId && (
                            <View style={styles.previewContainer}>
                               <Icon name="videocam" size={16} color={colors.secondary.main} />
                               <Text style={styles.previewText}>{t('caregiverChecklists.videoAttached')}</Text>
                               <Pressable onPress={() => removeMediaFromStep(step.id, 'video')}>
                                 <Icon name="close-circle" size={18} color={colors.error.main} />
                               </Pressable>
                            </View>
                          )}
                       </View>
                     )}
                  </View>
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
  const { t, i18n } = useTranslation();
  return (
    <AppCard style={styles.templateCard}>
      <View style={styles.cardHeader}>
        <View style={styles.catBadge}>
          <Icon name={getCategoryIcon(template.category)} size={20} color={colors.secondary[500]} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{template.title}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardStat}>
              <Icon name="list" size={14} color={colors.neutral[500]} />{' '}
              {t('caregiverChecklists.steps', { count: Intl.NumberFormat(i18n.language).format(template.steps?.length ?? 0) })}
            </Text>
            {template.estimatedMinutes && (
              <Text style={styles.cardStat}>
                <Icon name="time-outline" size={14} color={colors.neutral[500]} />{' '}
                {t('caregiverChecklists.minutes', { count: Intl.NumberFormat(i18n.language).format(template.estimatedMinutes) })}
              </Text>
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
  stepMediaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface_container_low,
  },
  mediaBtnText: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.label,
    color: colors.on_surface,
  },
  mediaPreview: {
    flex: 1,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface_container_highest,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  previewText: {
    flex: 1,
    fontSize: typography.size.xs,
    color: colors.on_surface,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.secondary[50],
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginHorizontal: spacing['2xl'],
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  patientLabel: { fontSize: typography.size.xs, color: colors.neutral[500] },
  patientName: { fontSize: typography.size.base, fontWeight: '700', color: colors.secondary[700] },
});
