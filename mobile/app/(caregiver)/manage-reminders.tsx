import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Button,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import {
  ScreenContainer,
  AppCard,
  AppButton,
  AppInput,
  Icon,
  StatusChip,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/src/shared/ui';
import { PatientSwitcher } from '@/src/shared/ui/PatientSwitcher';
import { useCaregiverLinks } from '@/src/shared/hooks/useCaregiverLinks';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { remindersApi } from '@/src/features/reminders/api';
import { useChecklistTemplates } from '@/src/features/checklists/hooks';
import type { Reminder, CreateReminderInput, UpdateReminderInput, PriorityLevel, ReminderType } from '@/src/features/reminders/types';
import type { ChecklistTemplate } from '@/src/features/checklists/types';

const CATEGORIES = ['medication', 'appointment', 'task', 'hydration', 'meal', 'call', 'custom'] as const;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITIES: PriorityLevel[] = ['normal', 'high', 'critical'];
const REMINDER_TYPES: ReminderType[] = ['simple', 'guided'];

type FormMode = 'create' | 'edit';

interface ReminderForm {
  title: string;
  category: string;
  scheduledTime: string;
  startDate: string;
  endDate: string;
  description: string;
  daysOfWeek: number[];
  snoozeEnabled: boolean;
  defaultSnoozeMinutes: string;
  priority: PriorityLevel;
  reminderType: ReminderType;
  linkedChecklistTemplateId: string;
}

function emptyForm(): ReminderForm {
  return {
    title: '',
    category: 'task',
    scheduledTime: '08:00',
    startDate: new Date().toISOString().split('T')[0]!,
    endDate: '',
    description: '',
    daysOfWeek: [],
    snoozeEnabled: true,
    defaultSnoozeMinutes: '10',
    priority: 'normal',
    reminderType: 'simple',
    linkedChecklistTemplateId: '',
  };
}

function formFromReminder(r: Reminder): ReminderForm {
  return {
    title: r.title,
    category: r.category,
    scheduledTime: r.scheduledTime,
    startDate: r.startDate,
    endDate: r.endDate ?? '',
    description: r.description ?? '',
    daysOfWeek: r.daysOfWeek ?? [],
    snoozeEnabled: r.snoozeEnabled,
    defaultSnoozeMinutes: String(r.defaultSnoozeMinutes),
    priority: r.priority ?? 'normal',
    reminderType: r.reminderType ?? 'simple',
    linkedChecklistTemplateId: r.linkedChecklistTemplateId ?? '',
  };
}

export default function CaregiverRemindersScreen() {
  const { t, i18n } = useTranslation();

  // ─── Global patient context ─────────────────────────────────────────────
  useCaregiverLinks(); // load links into store if not yet loaded
  const { links, selectedPatientId, selectedPatientName, loaded } = useCaregiverPatientStore();
  const selectedPatient = selectedPatientId;

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [error, setError] = useState('');

  // Form modal
  const [modalVisible, setModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form, setForm] = useState<ReminderForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ReminderForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Checklist picker
  const [checklistPickerVisible, setChecklistPickerVisible] = useState(false);
  const { templates: checklists, loading: checklistsLoading } = useChecklistTemplates(selectedPatient ?? undefined);

  const loadReminders = useCallback(async () => {
    if (!selectedPatient) return;
    setRemindersLoading(true);
    try {
      const { reminders: r } = await remindersApi.list(selectedPatient);
      setReminders(r);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('caregiverReminders.loadingError'));
    } finally {
      setRemindersLoading(false);
    }
  }, [selectedPatient, t]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // ─── Form handlers ─────────────────────────────────────────────────────

  const openCreate = () => {
    setFormMode('create');
    setEditingReminder(null);
    setForm(emptyForm());
    setFormErrors({});
    setModalVisible(true);
  };

  const openEdit = (reminder: Reminder) => {
    setFormMode('edit');
    setEditingReminder(reminder);
    setForm(formFromReminder(reminder));
    setFormErrors({});
    setModalVisible(true);
  };

  const validateForm = (): boolean => {
    const errs: typeof formErrors = {};
    if (!form.title.trim()) errs.title = t('caregiverReminders.validation.titleRequired');
    if (!/^\d{2}:\d{2}$/.test(form.scheduledTime)) errs.scheduledTime = t('caregiverReminders.validation.timeFormat');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) errs.startDate = t('caregiverReminders.validation.dateFormat');
    if (form.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)) errs.endDate = t('caregiverReminders.validation.dateFormat');
    const snooze = parseInt(form.defaultSnoozeMinutes, 10);
    if (isNaN(snooze) || snooze < 1 || snooze > 120) errs.defaultSnoozeMinutes = t('caregiverReminders.validation.snoozeRange');
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = (): CreateReminderInput => ({
    title: form.title.trim(),
    category: form.category as any,
    scheduledTime: form.scheduledTime,
    startDate: form.startDate,
    endDate: form.endDate || undefined,
    description: form.description.trim() || undefined,
    daysOfWeek: form.daysOfWeek,
    snoozeEnabled: form.snoozeEnabled,
    defaultSnoozeMinutes: parseInt(form.defaultSnoozeMinutes, 10) || 10,
    priority: form.priority,
    reminderType: form.reminderType,
    linkedChecklistTemplateId: form.linkedChecklistTemplateId || undefined,
  });

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      if (formMode === 'create') {
        const { reminder: created } = await remindersApi.create(selectedPatient, buildPayload());
        setReminders((prev) => [created, ...prev]);
        Alert.alert(t('caregiverReminders.createdAlert'), t('caregiverReminders.createdSuccess', { title: created.title }));
      } else if (editingReminder) {
        const { reminder: updated } = await remindersApi.update(editingReminder.id, buildPayload() as UpdateReminderInput);
        setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        Alert.alert(t('caregiverReminders.updatedAlert'), t('caregiverReminders.updatedSuccess', { title: updated.title }));
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('caregiverReminders.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = (reminder: Reminder) => {
    Alert.alert(
      t('caregiverReminders.archiveBtn'),
      t('caregiverReminders.archiveConfirm', { title: reminder.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('caregiverReminders.archiveBtn'),
          style: 'destructive',
          onPress: async () => {
            try {
              await remindersApi.archive(reminder.id);
              setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message || t('caregiverReminders.archiveError'));
            }
          },
        },
      ],
    );
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter((d) => d !== day) : [...f.daysOfWeek, day],
    }));
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (!loaded) return <ScreenContainer scroll={false}><LoadingState /></ScreenContainer>;
  if (error) return <ScreenContainer scroll={false}><ErrorState message={error} onRetry={() => {}} /></ScreenContainer>;

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
          title={t('caregiverReminders.noPatientSelected')}
          message={t('caregiverReminders.selectPatientMsg')}
        />
        <PatientSwitcher />
      </ScreenContainer>
    );
  }
  const activeReminders = reminders.filter((r) => r.isActive);
  const archivedReminders = reminders.filter((r) => !r.isActive);

  return (
    <ScreenContainer scroll={false} padded={false}>
      <FlatList
        data={activeReminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Patient switcher pill */}
            <PatientSwitcher style={{ marginHorizontal: 0, marginTop: 0, marginBottom: spacing.md }} />

            {/* Create button */}
            <AppButton
              title={t('caregiverReminders.addReminder')}
              onPress={openCreate}
              variant="secondary"
              icon={<Icon name="add-circle-outline" size={20} color="#fff" />}
              style={{ marginBottom: spacing.xl }}
            />

            {/* Active section header */}
            <SectionHeader
              title={t('caregiverReminders.activeReminders')}
              count={activeReminders.length}
              loading={remindersLoading}
            />
          </View>
        }
        ListEmptyComponent={
          !remindersLoading ? (
            <AppCard style={{ marginHorizontal: 0 }}>
              <View style={styles.emptyRow}>
                <Icon name="alarm-outline" size={24} color={colors.neutral[300]} />
                <Text style={styles.emptyText}>{t('caregiverReminders.noActiveReminders')}</Text>
              </View>
            </AppCard>
          ) : null
        }
        renderItem={({ item }) => (
          <CaregiverReminderCard
            reminder={item}
            onEdit={() => openEdit(item)}
            onArchive={() => handleArchive(item)}
          />
        )}
        ListFooterComponent={
          archivedReminders.length > 0 ? (
            <View style={{ marginTop: spacing['2xl'] }}>
              <SectionHeader title={t('caregiverReminders.archived')} count={archivedReminders.length} />
              {archivedReminders.map((r) => (
                <CaregiverReminderCard
                  key={r.id}
                  reminder={r}
                  onEdit={() => openEdit(r)}
                  onArchive={() => {}}
                />
              ))}
            </View>
          ) : null
        }
      />

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{formMode === 'create' ? t('caregiverReminders.newReminder') : t('caregiverReminders.editReminder')}</Text>
            <Pressable onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Icon name="close" size={22} color={colors.neutral[600]} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Title */}
            <AppInput
              label={t('caregiverReminders.titleLabel')}
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder={t('caregiverReminders.titlePlaceholder')}
              error={formErrors.title}
            />

            {/* Category picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('caregiverReminders.categoryLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.categoryChip, form.category === cat && styles.categoryChipActive]}
                    onPress={() => setForm((f) => ({ ...f, category: cat }))}
                  >
                    <Icon name={getCategoryIcon(cat)} size={16} color={form.category === cat ? '#fff' : colors.neutral[600]} />
                    <Text style={[styles.categoryChipText, form.category === cat && styles.categoryChipTextActive]}>
                      {t(`categories.${cat}`)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Redesigned: Priority selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('patientReminders.priority')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {PRIORITIES.map((prio) => (
                  <Pressable
                    key={prio}
                    style={[
                      styles.categoryChip,
                      form.priority === prio && styles.priorityChipActive,
                      prio === 'high' && styles.highPriorityChip,
                      prio === 'critical' && styles.criticalPriorityChip,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, priority: prio }))}
                  >
                    <Text style={[styles.categoryChipText, form.priority === prio && styles.categoryChipTextActive]}>
                      {t(`patientReminders.priority${prio.charAt(0).toUpperCase() + prio.slice(1)}`)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Redesigned: Reminder Type selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('patientReminders.reminderType')}</Text>
              <View style={styles.typeRow}>
                {REMINDER_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.typeChip, form.reminderType === type && styles.typeChipActive]}
                    onPress={() => setForm((f) => ({ ...f, reminderType: type }))}
                  >
                    <Icon 
                      name={type === 'guided' ? 'list-outline' : 'checkmark-circle-outline'} 
                      size={18} 
                      color={form.reminderType === type ? '#fff' : colors.neutral[600]} 
                    />
                    <Text style={[styles.typeChipText, form.reminderType === type && styles.typeChipTextActive]}>
                      {t(`patientReminders.${type}`)}
                    </Text>
                    <Text style={styles.typeChipDesc}>
                      {type === 'guided' ? t('patientReminders.guidedDesc') : t('patientReminders.simpleDesc')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Redesigned: Checklist linking for guided reminders */}
            {form.reminderType === 'guided' && (
              <View style={[styles.fieldGroup, styles.guidedSection]}>
                <Text style={styles.fieldLabel}>{t('patientReminders.linkedChecklist')}</Text>
                <TouchableOpacity
                  style={styles.checklistSelector}
                  onPress={() => {
                    console.log('[ManageReminders] Opening checklist picker');
                    Alert.alert('Debug', 'Checklist selector tapped');
                    setChecklistPickerVisible(true);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('caregiverReminders.selectChecklist')}
                >
                  <Icon name="list-outline" size={24} color={colors.primary[500]} />
                  <Text style={styles.checklistPlaceholder}>
                    {form.linkedChecklistTemplateId
                      ? checklists.find((c) => c.id === form.linkedChecklistTemplateId)?.title || t('caregiverReminders.checklistLinked')
                      : t('caregiverReminders.selectChecklist')}
                  </Text>
                  <Icon name="chevron-forward" size={20} color={colors.neutral[400]} />
                </TouchableOpacity>
                <Text style={styles.checklistHelp}>{t('caregiverReminders.checklistHelp')}</Text>
              </View>
            )}

            {/* Time + Date row */}
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('caregiverReminders.timeLabel')}
                  value={form.scheduledTime}
                  onChangeText={(v) => setForm((f) => ({ ...f, scheduledTime: v }))}
                  placeholder="08:00"
                  keyboardType="numbers-and-punctuation"
                  error={formErrors.scheduledTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('caregiverReminders.startDateLabel')}
                  value={form.startDate}
                  onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  error={formErrors.startDate}
                />
              </View>
            </View>

            {/* End date */}
            <AppInput
              label={t('caregiverReminders.endDateLabel')}
              value={form.endDate}
              onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              error={formErrors.endDate}
            />

            {/* Days of week */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('caregiverReminders.repeatLabel')}</Text>
              <View style={styles.dayRow}>
                {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, idx) => (
                  <Pressable
                    key={day}
                    style={[styles.dayChip, form.daysOfWeek.includes(idx) && styles.dayChipActive]}
                    onPress={() => toggleDay(idx)}
                    accessibilityLabel={t(`days.${day}`)}
                  >
                    <Text style={[styles.dayChipText, form.daysOfWeek.includes(idx) && styles.dayChipTextActive]}>
                      {t(`days.${day}_short`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Description */}
            <AppInput
              label={t('caregiverReminders.notesLabel')}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder={t('caregiverReminders.notesPlaceholder')}
              multiline
              style={{ height: 80, paddingTop: spacing.md }}
            />

            {/* Snooze */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>{t('caregiverReminders.allowSnooze')}</Text>
                <Text style={styles.switchSub}>{t('caregiverReminders.snoozeSub')}</Text>
              </View>
              <Switch
                value={form.snoozeEnabled}
                onValueChange={(v) => setForm((f) => ({ ...f, snoozeEnabled: v }))}
                trackColor={{ true: colors.secondary[400], false: colors.neutral[300] }}
                thumbColor={form.snoozeEnabled ? colors.secondary[500] : colors.neutral[400]}
              />
            </View>
            {form.snoozeEnabled && (
              <AppInput
                label={t('caregiverReminders.snoozeDurationLabel')}
                value={form.defaultSnoozeMinutes}
                onChangeText={(v) => setForm((f) => ({ ...f, defaultSnoozeMinutes: v }))}
                placeholder="10"
                keyboardType="number-pad"
                error={formErrors.defaultSnoozeMinutes}
              />
            )}

            {/* Submit */}
            <View style={{ gap: spacing.md, paddingBottom: spacing['4xl'] }}>
              <AppButton
                title={submitting ? t('common.loading') : formMode === 'create' ? t('caregiverReminders.createBtn') : t('caregiverReminders.saveChangesBtn')}
                onPress={handleSubmit}
                loading={submitting}
                variant="secondary"
              />
              {formMode === 'edit' && editingReminder?.isActive && (
                <AppButton
                  title={t('caregiverReminders.archiveBtn')}
                  onPress={() => {
                    setModalVisible(false);
                    setTimeout(() => handleArchive(editingReminder!), 300);
                  }}
                  variant="danger"
                />
              )}
            </View>
          </ScrollView>

          {/* Checklist Picker Overlay - inside the same Modal */}
          {checklistPickerVisible && (
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, zIndex: 100 }}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('caregiverReminders.selectChecklist')}</Text>
                <TouchableOpacity onPress={() => setChecklistPickerVisible(false)} style={styles.modalClose} activeOpacity={0.7}>
                  <Icon name="close" size={22} color={colors.neutral[600]} />
                </TouchableOpacity>
              </View>

              {checklistsLoading ? (
                <View style={styles.pickerLoading}>
                  <ActivityIndicator size="large" color={colors.primary[500]} />
                  <Text style={styles.pickerLoadingText}>{t('common.loading')}</Text>
                </View>
              ) : checklists.length === 0 ? (
                <View style={styles.pickerEmpty}>
                  <Icon name="list-outline" size={48} color={colors.neutral[300]} />
                  <Text style={styles.pickerEmptyText}>{t('caregiverReminders.noChecklists')}</Text>
                  <Text style={styles.pickerEmptySubtext}>{t('caregiverReminders.createChecklistFirst')}</Text>
                </View>
              ) : (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>

                  {checklists.map((checklist, index) => {
                    console.log('[ChecklistPickerModal] Rendering item', index, ':', checklist.id, checklist.title);
                    const isSelected = form.linkedChecklistTemplateId === checklist.id;
                    return (
                      <TouchableOpacity
                        key={checklist.id}
                        activeOpacity={0.6}
                        style={[
                          styles.checklistItem,
                          isSelected && styles.checklistItemSelected,
                          { backgroundColor: isSelected ? colors.primary[50] : colors.neutral[50] }
                        ]}
                        onPressIn={() => {
                          console.log('[ChecklistPickerModal] PRESSED:', checklist.id, checklist.title);
                          setForm((f) => ({ ...f, linkedChecklistTemplateId: checklist.id }));
                          setChecklistPickerVisible(false);
                        }}
                      >
                        <View style={styles.checklistIcon}>
                          <Icon name="list-outline" size={24} color={isSelected ? colors.primary[500] : colors.neutral[400]} />
                        </View>
                        <View style={styles.checklistContent}>
                          <Text style={[styles.checklistTitle, isSelected && styles.checklistTitleSelected]}>
                            {checklist.title}
                          </Text>
                          <Text style={styles.checklistMeta}>
                            {checklist.category || 'General'}
                          </Text>
                        </View>
                        {isSelected && (
                          <Icon name="checkmark-circle" size={24} color={colors.success.main} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  <View style={{ height: spacing['4xl'] }} />
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function SectionHeader({ title, count, loading }: { title: string; count: number; loading?: boolean }) {
  const { t, i18n } = useTranslation();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading ? (
        <Text style={styles.sectionCount}>{t('common.loading')}</Text>
      ) : (
        <StatusChip label={Intl.NumberFormat(i18n.language).format(count)} variant={count > 0 ? 'info' : 'default'} />
      )}
    </View>
  );
}

interface ChecklistPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (checklistId: string) => void;
  checklists: ChecklistTemplate[];
  loading: boolean;
  selectedId?: string;
}

function ChecklistPickerModal({
  visible,
  onClose,
  onSelect,
  checklists,
  loading,
  selectedId,
}: ChecklistPickerModalProps) {
  const { t } = useTranslation();
  console.log('[ChecklistPickerModal] Render - visible:', visible, 'checklists:', checklists.length, 'loading:', loading);
  if (!visible) return null;

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, zIndex: 1000 }}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('caregiverReminders.selectChecklist')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose} activeOpacity={0.7}>
            <Icon name="close" size={22} color={colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.pickerLoading}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.pickerLoadingText}>{t('common.loading')}</Text>
          </View>
        ) : checklists.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Icon name="list-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.pickerEmptyText}>{t('caregiverReminders.noChecklists')}</Text>
            <Text style={styles.pickerEmptySubtext}>{t('caregiverReminders.createChecklistFirst')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            pointerEvents="auto"
          >

            {checklists.map((checklist, index) => {
              console.log('[ChecklistPickerModal] Rendering item', index, ':', checklist.id, checklist.title);
              const isSelected = selectedId === checklist.id;
              return (
                <TouchableOpacity
                  key={checklist.id}
                  activeOpacity={0.6}
                  style={[
                    styles.checklistItem,
                    isSelected && styles.checklistItemSelected,
                    { backgroundColor: isSelected ? colors.primary[50] : colors.neutral[50] }
                  ]}
                  onPress={() => {
                    console.log('[ManageReminders] Opening checklist picker');
                    Alert.alert('Debug', 'Checklist selector tapped');
                    setChecklistPickerVisible(true);
                  }}
                  onPressIn={() => {
                    console.log('[ChecklistPickerModal] PRESSED IN:', checklist.id, checklist.title);
                    onSelect(checklist.id);
                  }}
                >
                  <View style={styles.checklistIcon}>
                    <Icon name="list-outline" size={24} color={isSelected ? colors.primary[500] : colors.neutral[400]} />
                  </View>
                  <View style={styles.checklistContent}>
                    <Text style={[styles.checklistTitle, isSelected && styles.checklistTitleSelected]}>
                      {checklist.title}
                    </Text>
                    <Text style={styles.checklistMeta}>
                      {checklist.category ? t(`categories.${checklist.category}`) : t('categories.custom')}
                    </Text>
                  </View>
                  {isSelected && (
                    <Icon name="checkmark-circle" size={24} color={colors.success.main} />
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: spacing['4xl'] }} />
          </ScrollView>
        )}
    </View>
  );
}

function CaregiverReminderCard({
  reminder,
  onEdit,
  onArchive,
}: {
  reminder: Reminder;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { t } = useTranslation();
  const isGuided = reminder.reminderType === 'guided';
  const isHighPriority = reminder.priority === 'high' || reminder.priority === 'critical';
  
  return (
    <AppCard style={[styles.reminderCard, isHighPriority && styles.highPriorityCard]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, isGuided && styles.guidedBadge]}>
          <Icon 
            name={isGuided ? 'list-outline' : getCategoryIcon(reminder.category) as any} 
            size={22} 
            color={isGuided ? colors.warning.main : colors.secondary[500]} 
          />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{reminder.title}</Text>
            {/* Priority Badge */}
            {isHighPriority && (
              <View style={[styles.priorityBadge, reminder.priority === 'critical' && styles.criticalBadge]}>
                <Text style={styles.priorityText}>
                  {reminder.priority === 'critical' ? '!' : '↑'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTime}>
            {reminder.scheduledTime} · {t('categories.' + reminder.category) || reminder.category}
            {isGuided && (
              <Text style={styles.guidedIndicator}> · {t('patientReminders.guided')}</Text>
            )}
          </Text>
          {(reminder.daysOfWeek ?? []).length > 0 && (
            <Text style={styles.cardDays}>
              {reminder.daysOfWeek.map((d) => t(`days.${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d]}_short`)).join(' · ')}
            </Text>
          )}
          {/* Linked Checklist Info */}
          {isGuided && reminder.linkedChecklist && (
            <View style={styles.checklistInfo}>
              <Icon name="list-outline" size={12} color={colors.primary[500]} />
              <Text style={styles.checklistText}>
                {reminder.linkedChecklist.title} · {reminder.linkedChecklist.stepCount} {t('patientReminders.steps')}
              </Text>
            </View>
          )}
        </View>
        <StatusChip
          label={reminder.isActive ? t('caregiverHome.active') : t('caregiverReminders.archived')}
          variant={reminder.isActive ? 'success' : 'default'}
        />
      </View>
      {reminder.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{reminder.description}</Text>
      ) : null}
      {reminder.isActive && (
        <View style={styles.cardActions}>
          <AppButton title={t("caregiverPatients.editReminders").split(" ")[0]} onPress={onEdit} variant="outline" size="sm" style={{ flex: 1 }} />
          <AppButton title={t("caregiverReminders.archived")} onPress={onArchive} variant="ghost" size="sm" style={{ flex: 1 }} />
        </View>
      )}
    </AppCard>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { padding: spacing['2xl'], paddingBottom: spacing['5xl'] },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.secondary[50],
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.xl,
  },
  patientLabel: { fontSize: typography.size.xs, color: colors.neutral[500] },
  patientName: { fontSize: typography.size.base, fontWeight: '700', color: colors.secondary[700] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  sectionCount: { fontSize: typography.size.sm, color: colors.neutral[400] },
  reminderCard: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: typography.size.base, fontWeight: '700', color: colors.neutral[900] },
  cardTime: { fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 2 },
  cardDays: { fontSize: typography.size.xs, color: colors.secondary[500], marginTop: 2, fontWeight: '500' },
  cardDesc: { fontSize: typography.size.sm, color: colors.neutral[600], marginBottom: spacing.sm },
  
  // Redesigned: Card priority & type styles
  highPriorityCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning.main,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidedBadge: {
    backgroundColor: colors.warning.light,
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
  guidedIndicator: {
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
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: typography.size.sm, color: colors.neutral[500], flex: 1 },
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
  // ─── Form
  fieldGroup: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: typography.size.sm,
    fontWeight: '500',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  categoryScroll: { flexGrow: 0 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: colors.secondary[500],
    borderColor: colors.secondary[600],
  },
  categoryChipText: { fontSize: typography.size.sm, color: colors.neutral[700], fontWeight: '500' },
  categoryChipTextActive: { color: '#fff' },
  rowFields: { flexDirection: 'row', gap: spacing.md },
  dayRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  dayChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayChipActive: {
    backgroundColor: colors.secondary[500],
    borderColor: colors.secondary[600],
  },
  dayChipText: { fontSize: typography.size.sm, color: colors.neutral[600], fontWeight: '600' },
  dayChipTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  switchLabel: { fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800] },
  switchSub: { fontSize: typography.size.xs, color: colors.neutral[500], marginTop: 2 },
  
  // Redesigned: Priority styles
  priorityChipActive: {
    backgroundColor: colors.warning.main,
    borderColor: colors.warning.dark,
  },
  highPriorityChip: {
    borderColor: colors.warning.main,
  },
  criticalPriorityChip: {
    borderColor: colors.error.main,
    backgroundColor: colors.error.light,
  },
  
  // Redesigned: Reminder Type styles
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeChipActive: {
    backgroundColor: colors.secondary[500],
    borderColor: colors.secondary[600],
  },
  typeChipText: { fontSize: typography.size.sm, color: colors.neutral[700], fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  typeChipDesc: { 
    fontSize: typography.size.xs, 
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  
  // Redesigned: Guided section styles
  guidedSection: {
    backgroundColor: colors.primary[50],
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  checklistSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  checklistPlaceholder: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
  },
  guidedHelper: {
    fontSize: typography.size.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  
  // Checklist Picker Modal styles
  pickerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pickerLoadingText: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
  },
  pickerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing['2xl'],
  },
  pickerEmptyText: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[600],
    textAlign: 'center',
  },
  pickerEmptySubtext: {
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  checklistItemSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  checklistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistContent: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 2,
  },
  checklistTitleSelected: {
    color: colors.primary[600],
  },
  checklistMeta: {
    fontSize: typography.size.xs,
    color: colors.neutral[500],
  },
});
