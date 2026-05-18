/**
 * Caregiver — Manage Personal Orientation Settings & Practice Items
 *
 * Configure support level, question families, and custom practice items for My Day & People.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, AppCard } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { spacedRetrievalApi } from '@/src/features/games/api';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { useTranslation } from 'react-i18next';

const QUESTION_FAMILIES = [
  'TIME_ORIENTATION',
  'PLACE_ORIENTATION',
  'ROUTINE_ORIENTATION',
  'APP_NAVIGATION',
  'PEOPLE_RECOGNITION',
  'SUPPORT_FACT',
];

const SUPPORT_LEVEL_KEYS = [
  { value: 'LIGHT_SUPPORT', labelKey: 'myDayPeople.supportLevel.light', descKey: 'myDayPeople.supportLevel.lightDesc' },
  { value: 'GUIDED_SUPPORT', labelKey: 'myDayPeople.supportLevel.guided', descKey: 'myDayPeople.supportLevel.guidedDesc' },
  { value: 'HIGH_SUPPORT', labelKey: 'myDayPeople.supportLevel.high', descKey: 'myDayPeople.supportLevel.highDesc' },
];

export default function ManageSRItemsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedPatientId, selectedPatientName } = useCaregiverPatientStore();
  
  const [items, setItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [cueText, setCueText] = useState('');
  const [category, setCategory] = useState('TIME_ORIENTATION');
  const [distractors, setDistractors] = useState('');
  const [supportRole, setSupportRole] = useState('');
  const [patientVisible, setPatientVisible] = useState(true);
  const [supportLevelOverride, setSupportLevelOverride] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const [itemsRes, settingsRes] = await Promise.all([
        spacedRetrievalApi.listItems(selectedPatientId, false),
        spacedRetrievalApi.getSettings(selectedPatientId),
      ]);
      setItems(itemsRes.items);
      setSettings(settingsRes.settings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSettingsField = async (field: string, value: any) => {
    if (!selectedPatientId || !settings) return;
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    setSavingSettings(true);
    try {
      await spacedRetrievalApi.upsertSettings(selectedPatientId, updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleFamily = async (family: string) => {
    if (!settings) return;
    const current = settings.enabledFamilies ?? [];
    const updated = current.includes(family)
      ? current.filter((f: string) => f !== family)
      : [...current, family];
    updateSettingsField('enabledFamilies', updated);
  };

  const resetForm = () => {
    setPrompt('');
    setCorrectAnswer('');
    setCueText('');
    setCategory('TIME_ORIENTATION');
    setDistractors('');
    setSupportRole('');
    setPatientVisible(true);
    setSupportLevelOverride(null);
    setEditingId(null);
    setFormOpen(false);
  };

  const handleSaveItem = async () => {
    if (!selectedPatientId || !prompt.trim() || !correctAnswer.trim()) return;
    const payload = {
      prompt: prompt.trim(),
      correctAnswer: correctAnswer.trim(),
      cueText: cueText.trim() || undefined,
      category,
      distractors: distractors.split(',').map((s) => s.trim()).filter(Boolean),
      supportRole: supportRole.trim() || undefined,
      patientVisible,
      supportLevelOverride: supportLevelOverride || undefined,
    };
    try {
      if (editingId) {
        await spacedRetrievalApi.updateItem(selectedPatientId, editingId, payload);
      } else {
        await spacedRetrievalApi.createItem(selectedPatientId, payload);
      }
      resetForm();
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchiveItem = async (itemId: string) => {
    if (!selectedPatientId) return;
    try {
      await spacedRetrievalApi.archiveItem(selectedPatientId, itemId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setPrompt(item.prompt);
    setCorrectAnswer(item.correctAnswer);
    setCueText(item.cueText ?? '');
    setCategory(item.category);
    setDistractors((item.distractors ?? []).join(', '));
    setSupportRole(item.supportRole ?? '');
    setPatientVisible(item.patientVisible ?? true);
    setSupportLevelOverride(item.supportLevelOverride ?? null);
    setFormOpen(true);
  };

  if (!selectedPatientId) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('manageFacts.selectPatient', 'Please select a patient first.')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
        <View>
          <Text style={styles.title}>{t('myDayPeople.settings.title', 'My Day & People Settings')}</Text>
          <Text style={styles.subtitle}>{t('myDayPeople.settings.subtitle', { name: selectedPatientName ?? 'Patient' })}</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Settings Card */}
            {settings && (
              <AppCard style={styles.settingsCard}>
                <Text style={styles.sectionTitle}>{t('myDayPeople.settings.supportLevelSection', 'Support Level')}</Text>
                <View style={styles.optionsCol}>
                  {SUPPORT_LEVEL_KEYS.map((level) => (
                    <Pressable
                      key={level.value}
                      onPress={() => updateSettingsField('supportLevel', level.value)}
                      style={[styles.radioOption, settings.supportLevel === level.value && styles.radioOptionActive]}
                    >
                      <View style={[styles.radioDot, settings.supportLevel === level.value && styles.radioDotActive]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.radioText, settings.supportLevel === level.value && styles.radioTextActive]}>
                          {t(level.labelKey, level.value)}
                        </Text>
                        <Text style={styles.radioDesc}>{t(level.descKey, '')}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>{t('myDayPeople.settings.enabledFamiliesSection', 'Practice Topics')}</Text>
                <View style={styles.optionsCol}>
                  {QUESTION_FAMILIES.map((family) => {
                    const enabled = (settings.enabledFamilies ?? []).includes(family);
                    return (
                      <View key={family} style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t(`myDayPeople.questionFamilies.${family}`, { defaultValue: family.replace(/_/g, ' ') })}</Text>
                        <Switch value={enabled} onValueChange={() => toggleFamily(family)} />
                      </View>
                    );
                  })}
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>{t('myDayPeople.settings.contactOptionsSection', 'Contact Options')}</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('myDayPeople.settings.includePeopleWithoutPhotos', 'Include contacts without photos')}</Text>
                  <Switch
                    value={settings.includePeopleWithoutPhotos ?? false}
                    onValueChange={(val) => updateSettingsField('includePeopleWithoutPhotos', val)}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('myDayPeople.settings.includeSensitiveContacts', 'Include sensitive contacts')}</Text>
                  <Switch
                    value={settings.includeSensitiveContacts ?? false}
                    onValueChange={(val) => updateSettingsField('includeSensitiveContacts', val)}
                  />
                </View>
                <Text style={styles.warningText}>{t('myDayPeople.settings.sensitiveContactWarning', 'Only include contacts that are safe and comfortable for the patient to review.')}</Text>
              </AppCard>
            )}

            {/* Custom Items Section */}
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>{t('myDayPeople.settings.customItemsTitle', 'Custom Practice Items')}</Text>
              <Pressable onPress={() => setFormOpen(!formOpen)} style={styles.addBtn}>
                <Text style={styles.addBtnText}>{formOpen ? t('myDayPeople.settings.cancel', 'Cancel') : t('myDayPeople.settings.addNew', '+ Add Item')}</Text>
              </Pressable>
            </View>

            {formOpen && (
              <AppCard style={styles.formCard}>
                <TextInput style={styles.input} placeholder={t('myDayPeople.settings.promptLabel', 'Prompt / Question')} value={prompt} onChangeText={setPrompt} />
                <TextInput style={styles.input} placeholder={t('myDayPeople.settings.correctAnswerLabel', 'Correct Answer')} value={correctAnswer} onChangeText={setCorrectAnswer} />
                <TextInput style={styles.input} placeholder={t('myDayPeople.settings.hintLabel', 'Helpful Hint / Cue')} value={cueText} onChangeText={setCueText} />
                <TextInput style={styles.input} placeholder={t('myDayPeople.settings.supportRoleLabel', 'Support Role / Relation (for people)')} value={supportRole} onChangeText={setSupportRole} />
                <TextInput style={styles.input} placeholder={t('myDayPeople.settings.distractorsLabel', 'Distractors, comma-separated')} value={distractors} onChangeText={setDistractors} />

                <Text style={styles.label}>{t('myDayPeople.settings.categorySelect', 'Practice Topic:')}</Text>
                <View style={styles.categoryRow}>
                  {QUESTION_FAMILIES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCategory(c)}
                      style={[styles.categoryChip, category === c && styles.categoryChipActive]}
                    >
                      <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextActive]}>{t(`myDayPeople.questionFamilies.${c}`, { defaultValue: c.replace(/_/g, ' ') })}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('myDayPeople.settings.patientVisible', 'Visible in Patient Practice')}</Text>
                  <Switch value={patientVisible} onValueChange={setPatientVisible} />
                </View>

                <Pressable onPress={handleSaveItem} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>{editingId ? t('myDayPeople.settings.updateItem', 'Update Item') : t('myDayPeople.settings.saveItem', 'Save Item')}</Text>
                </Pressable>
              </AppCard>
            )}

            {/* Items List */}
            <View style={{ gap: spacing.md }}>
              {items.filter((i) => i.active).map((item) => (
                <AppCard key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemPrompt}>{item.prompt}</Text>
                    <View style={styles.itemActions}>
                      <Pressable onPress={() => startEdit(item)} hitSlop={8}>
                        <Ionicons name="create-outline" size={20} color={colors.primary[500]} />
                      </Pressable>
                      <Pressable onPress={() => handleArchiveItem(item.id)} hitSlop={8}>
                        <Ionicons name="archive-outline" size={20} color={colors.error.main} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.itemAnswer}>{item.correctAnswer}</Text>
                  {item.cueText ? <Text style={styles.itemCue}>{t('myDayPeople.settings.hintPrefix', 'Hint: ')}{item.cueText}</Text> : null}
                  {item.supportRole ? <Text style={styles.itemRole}>{t('myDayPeople.settings.rolePrefix', 'Role: ')}{item.supportRole}</Text> : null}
                  <View style={styles.metaRow}>
                    <Text style={styles.itemMeta}>{t(`myDayPeople.questionFamilies.${item.category}`, { defaultValue: item.category.replace(/_/g, ' ') })}</Text>
                    <Text style={styles.itemMastery}>{t(`myDayPeople.mastery.${item.masteryStatus}`, { defaultValue: item.masteryStatus.replace(/_/g, ' ') })}</Text>
                  </View>
                </AppCard>
              ))}
              {items.filter((i) => i.active).length === 0 && (
                <Text style={styles.emptyText}>{t('myDayPeople.settings.noItems', 'No practice items configured.')}</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.size['2xl'], fontWeight: '700', color: colors.neutral[800], marginBottom: spacing.xs },
  subtitle: { fontSize: typography.size.sm, color: colors.neutral[400] },
  sectionTitle: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral[800], marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  addBtn: { backgroundColor: colors.primary[50], paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  addBtnText: { color: colors.primary[600], fontWeight: '600', fontSize: typography.size.sm },
  settingsCard: { padding: spacing.lg, gap: spacing.md },
  optionsCol: { gap: spacing.sm },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  radioOptionActive: {},
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.neutral[300], alignItems: 'center', justifyContent: 'center' },
  radioDotActive: { borderColor: colors.primary[500], backgroundColor: colors.primary[500] },
  radioText: { fontSize: typography.size.sm, color: colors.neutral[700] },
  radioDesc: { fontSize: typography.size.xs, color: colors.neutral[400], marginTop: 2, lineHeight: 16 },
  radioTextActive: { color: colors.neutral[900], fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.neutral[100], marginVertical: spacing.xs },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { fontSize: typography.size.sm, color: colors.neutral[700], textTransform: 'capitalize' },
  formCard: { padding: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  label: { fontSize: typography.size.sm, fontWeight: '600', color: colors.neutral[700] },
  input: { borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, padding: spacing.md, fontSize: typography.size.base, color: colors.neutral[800] },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  categoryChip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.neutral[100] },
  categoryChipActive: { backgroundColor: colors.primary[100] },
  categoryChipText: { fontSize: typography.size.xs, color: colors.neutral[500], textTransform: 'capitalize' },
  categoryChipTextActive: { color: colors.primary[600], fontWeight: '600' },
  saveBtn: { backgroundColor: colors.primary[500], padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: typography.size.base },
  itemCard: { padding: spacing.md, gap: 4 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemPrompt: { fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800], flex: 1 },
  itemActions: { flexDirection: 'row', gap: spacing.md },
  itemAnswer: { fontSize: typography.size.sm, color: colors.neutral[600] },
  itemCue: { fontSize: typography.size.xs, color: colors.secondary[600] },
  itemRole: { fontSize: typography.size.xs, color: colors.primary[600], fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  itemMeta: { fontSize: typography.size.xs, color: colors.neutral[400], textTransform: 'capitalize' },
  itemMastery: { fontSize: typography.size.xs, color: colors.primary[500], fontWeight: '600', textTransform: 'capitalize' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: typography.size.sm, color: colors.neutral[400], textAlign: 'center', marginTop: spacing.lg },
  warningText: { fontSize: typography.size.xs, color: colors.warning.main, marginTop: spacing.sm, lineHeight: 18 },
});
