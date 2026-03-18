import { View, Text, StyleSheet, FlatList, Alert, TextInput } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { ScreenContainer, AppCard, AppButton, AppInput, Icon, StatusChip, LoadingState, EmptyState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { carelinksApi } from '@/src/features/carelinks/api';
import { remindersApi } from '@/src/features/reminders/api';
import type { Reminder, CreateReminderInput } from '@/src/features/reminders/types';
import type { CareLink } from '@/src/features/carelinks/types';

/**
 * Caregiver reminders management — view and create reminders for linked patients.
 */
export default function CaregiverRemindersScreen() {
  const [links, setLinks] = useState<CareLink[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('task');
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]!);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadReminders = useCallback(async () => {
    if (!selectedPatient) return;
    try {
      const { reminders: r } = await remindersApi.list(selectedPatient);
      setReminders(r);
    } catch {}
  }, [selectedPatient]);

  useEffect(() => { loadReminders(); }, [loadReminders]);

  const handleCreate = async () => {
    if (!selectedPatient || !title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    setCreating(true);
    try {
      const { reminder: newReminder } = await remindersApi.create(selectedPatient, {
        title: title.trim(),
        category,
        scheduledTime,
        startDate,
        description: description.trim() || undefined,
      });
      
      setReminders((prev) => [newReminder, ...prev].sort((a, b) => 
        a.scheduledTime.localeCompare(b.scheduledTime)
      ));
      
      Alert.alert('Success', 'Reminder created');
      setTitle('');
      setDescription('');
      setShowCreate(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create reminder');
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await remindersApi.archive(id);
      Alert.alert('Success', 'Reminder archived');
      loadReminders();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to archive');
    }
  };

  if (loading) return <ScreenContainer><LoadingState /></ScreenContainer>;

  if (links.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="people-outline"
          title="No linked patients"
          message="Link with a patient first to manage their reminders."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Patient selector */}
      <View style={styles.selectorRow}>
        <Text style={styles.selectorLabel}>Patient:</Text>
        <Text style={styles.selectorValue}>
          {links.find((l) => l.patientUserId === selectedPatient)?.patient?.displayName || 'Select'}
        </Text>
      </View>

      {/* Create button */}
      <AppButton
        title={showCreate ? 'Cancel' : 'Create Reminder'}
        onPress={() => setShowCreate(!showCreate)}
        variant={showCreate ? 'ghost' : 'secondary'}
        icon={<Icon name={showCreate ? 'close' : 'add-circle-outline'} size={20} color={showCreate ? colors.secondary[500] : '#fff'} />}
      />

      {/* Create form */}
      {showCreate && (
        <AppCard style={styles.formCard}>
          <Text style={styles.formTitle}>New Reminder</Text>
          <AppInput label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Take morning medication" />
          <AppInput label="Scheduled Time (HH:mm)" value={scheduledTime} onChangeText={setScheduledTime} placeholder="08:00" />
          <AppInput label="Start Date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-03-14" />
          <AppInput label="Category" value={category} onChangeText={setCategory} placeholder="medication, task, appointment..." />
          <AppInput label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Optional notes" multiline />
          <AppButton title="Create" onPress={handleCreate} loading={creating} variant="secondary" />
        </AppCard>
      )}

      {/* Reminders list */}
      <Text style={styles.sectionTitle}>Active Reminders</Text>
      {reminders.length === 0 ? (
        <AppCard>
          <View style={styles.emptyRow}>
            <Icon name="alarm-outline" size={24} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No reminders yet for this patient.</Text>
          </View>
        </AppCard>
      ) : (
        reminders.map((r) => (
          <AppCard key={r.id} style={styles.reminderCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Icon name="alarm-outline" size={22} color={colors.secondary[500]} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.cardTime}>{r.scheduledTime} · {r.category}</Text>
                </View>
              </View>
              <StatusChip label={r.isActive ? 'Active' : 'Archived'} variant={r.isActive ? 'success' : 'default'} />
            </View>
            {r.isActive && (
              <AppButton title="Archive" onPress={() => handleArchive(r.id)} variant="ghost" size="sm" />
            )}
          </AppCard>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.secondary[50],
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  selectorLabel: { fontSize: typography.size.sm, color: colors.neutral[500] },
  selectorValue: { fontSize: typography.size.base, fontWeight: '600', color: colors.secondary[700] },
  formCard: { marginTop: spacing.lg, marginBottom: spacing.lg },
  formTitle: { fontSize: typography.size.lg, fontWeight: '600', color: colors.neutral[800], marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
    marginTop: spacing['2xl'],
  },
  reminderCard: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800] },
  cardTime: { fontSize: typography.size.sm, color: colors.neutral[500] },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: typography.size.sm, color: colors.neutral[500], flex: 1 },
});
