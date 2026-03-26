import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  Pressable,
  Switch,
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
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { carelinksApi } from '@/src/features/carelinks/api';
import { remindersApi } from '@/src/features/reminders/api';
import type { Reminder, CreateReminderInput, UpdateReminderInput } from '@/src/features/reminders/types';
import type { CareLink } from '@/src/features/carelinks/types';

const CATEGORIES = ['medication', 'appointment', 'task', 'hydration', 'meal', 'call', 'custom'] as const;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  priority: string;
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
    priority: '1',
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
    priority: String(r.priority),
  };
}

/**
 * Caregiver reminders management — view, create, edit, and archive
 * reminders for linked patients.
 */
export default function CaregiverRemindersScreen() {
  const { t } = useTranslation();
  const [links, setLinks] = useState<CareLink[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [error, setError] = useState('');

  // Form modal
  const [modalVisible, setModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form, setForm] = useState<ReminderForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ReminderForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load linked patients
  useEffect(() => {
    carelinksApi
      .getMyLinks()
      .then(({ careLinks }) => {
        const active = careLinks.filter((l) => l.status === 'active' && l.patientUserId);
        setLinks(active);
        if (active.length > 0 && active[0]!.patientUserId) {
          setSelectedPatient(active[0]!.patientUserId);
        }
      })
      .catch(() => setError('Failed to load linked patients'))
      .finally(() => setLoading(false));
  }, []);

  const loadReminders = useCallback(async () => {
    if (!selectedPatient) return;
    setRemindersLoading(true);
    try {
      const { reminders: r } = await remindersApi.list(selectedPatient);
      setReminders(r);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load reminders');
    } finally {
      setRemindersLoading(false);
    }
  }, [selectedPatient]);

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
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!/^\d{2}:\d{2}$/.test(form.scheduledTime)) errs.scheduledTime = 'Use HH:mm format (e.g. 08:30)';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) errs.startDate = 'Use YYYY-MM-DD format';
    if (form.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)) errs.endDate = 'Use YYYY-MM-DD format';
    const snooze = parseInt(form.defaultSnoozeMinutes, 10);
    if (isNaN(snooze) || snooze < 1 || snooze > 120) errs.defaultSnoozeMinutes = '1–120 minutes';
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
    priority: (parseInt(form.priority, 10) || 1) as 1 | 2 | 3,
  });

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      if (formMode === 'create') {
        const { reminder: created } = await remindersApi.create(selectedPatient, buildPayload());
        setReminders((prev) => [created, ...prev]);
        Alert.alert('Created', `"${created.title}" has been added.`);
      } else if (editingReminder) {
        const { reminder: updated } = await remindersApi.update(editingReminder.id, buildPayload() as UpdateReminderInput);
        setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        Alert.alert('Updated', `"${updated.title}" has been saved.`);
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = (reminder: Reminder) => {
    Alert.alert(
      'Archive Reminder',
      `Archive "${reminder.title}"? The patient will no longer see it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await remindersApi.archive(reminder.id);
              setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to archive');
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

  if (loading) return <ScreenContainer><LoadingState /></ScreenContainer>;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={() => {}} /></ScreenContainer>;

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

  const activeReminders = reminders.filter((r) => r.isActive);
  const archivedReminders = reminders.filter((r) => !r.isActive);
  const selectedLink = links.find((l) => l.patientUserId === selectedPatient);

  return (
    <>
      <FlatList
        data={activeReminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Patient selector */}
            <View style={styles.patientCard}>
              <Icon name="person-circle-outline" size={28} color={colors.secondary[500]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.patientLabel}>{t('caregiverReminders.managingFor')}</Text>
                <Text style={styles.patientName}>
                  {selectedLink?.patient?.displayName ?? 'Patient'}
                </Text>
              </View>
              {links.length > 1 && (
                <StatusChip label={`${links.length} patients`} variant="info" />
              )}
            </View>

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
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

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
                {DAY_LABELS.map((day, idx) => (
                  <Pressable
                    key={day}
                    style={[styles.dayChip, form.daysOfWeek.includes(idx) && styles.dayChipActive]}
                    onPress={() => toggleDay(idx)}
                    accessibilityLabel={day}
                  >
                    <Text style={[styles.dayChipText, form.daysOfWeek.includes(idx) && styles.dayChipTextActive]}>
                      {day}
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
        </View>
      </Modal>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({ title, count, loading }: { title: string; count: number; loading?: boolean }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading ? (
        <Text style={styles.sectionCount}>Loading…</Text>
      ) : (
        <StatusChip label={String(count)} variant={count > 0 ? 'info' : 'default'} />
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
  return (
    <AppCard style={styles.reminderCard}>
      <View style={styles.cardHeader}>
        <Icon name={getCategoryIcon(reminder.category) as any} size={22} color={colors.secondary[500]} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{reminder.title}</Text>
          <Text style={styles.cardTime}>{reminder.scheduledTime} · {t('categories.' + reminder.category) || reminder.category}</Text>
          {(reminder.daysOfWeek ?? []).length > 0 && (
            <Text style={styles.cardDays}>
              {reminder.daysOfWeek.map((d) => DAY_LABELS[d]).join(' · ')}
            </Text>
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
});
