/**
 * Caregiver — Manage Personal Orientation Settings & Practice Items
 *
 * Configure support level, question families, and custom practice items for My Day & People.
 * Caregivers can upload a question image (e.g. person photo) and a clue/hint image per item.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  ActivityIndicator, Switch, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, AppCard } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { spacedRetrievalApi } from '@/src/features/games/api';
import { mediaApi } from '@/src/features/media/api';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { useTranslation } from 'react-i18next';

const QUESTION_FAMILIES = [
  'ORIENTATION_DATE',
  'ORIENTATION_PLACE',
  'CAREGIVER',
  'DAILY_ROUTINE',
  'APP_NAVIGATION',
  'SAFETY_SUPPORT',
  'PEOPLE_RECOGNITION',
  'SUPPORT_FACT',
  'OTHER',
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

  // Form fields
  const [prompt, setPrompt] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [cueText, setCueText] = useState('');
  const [category, setCategory] = useState('ORIENTATION_DATE');
  const [distractors, setDistractors] = useState('');
  const [supportRole, setSupportRole] = useState('');
  const [patientVisible, setPatientVisible] = useState(true);
  const [supportLevelOverride, setSupportLevelOverride] = useState<string | null>(null);

  // Image fields
  const [imageAssetId, setImageAssetId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [clueImageAssetId, setClueImageAssetId] = useState<string | null>(null);
  const [clueImageUrl, setClueImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingClueImage, setUploadingClueImage] = useState(false);

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

  const pickImage = async (isClue: boolean) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permissionRequired', 'Permission required'), t('myDayPeople.settings.photoPermission', 'Please allow access to your photo library.'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: isClue ? [16, 9] : [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';

    if (isClue) {
      setUploadingClueImage(true);
    } else {
      setUploadingImage(true);
    }
    try {
      const res = await mediaApi.upload(asset.uri, mimeType);
      if (isClue) {
        setClueImageAssetId(res.asset.id);
        setClueImageUrl(res.asset.publicUrl);
      } else {
        setImageAssetId(res.asset.id);
        setImageUrl(res.asset.publicUrl);
      }
    } catch (e) {
      Alert.alert(t('common.uploadFailed', 'Upload failed'), t('myDayPeople.settings.uploadError', 'Could not upload photo. Please try again.'));
    } finally {
      setUploadingImage(false);
      setUploadingClueImage(false);
    }
  };

  const resetForm = () => {
    setPrompt('');
    setCorrectAnswer('');
    setCueText('');
    setCategory('ORIENTATION_DATE');
    setDistractors('');
    setSupportRole('');
    setPatientVisible(true);
    setSupportLevelOverride(null);
    setImageAssetId(null);
    setImageUrl(null);
    setClueImageAssetId(null);
    setClueImageUrl(null);
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
      imageAssetId: imageAssetId ?? undefined,
      clueImageAssetId: clueImageAssetId ?? undefined,
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

  const handleToggleVisible = async (itemId: string, value: boolean) => {
    if (!selectedPatientId) return;
    try {
      await spacedRetrievalApi.updateItem(selectedPatientId, itemId, { patientVisible: value });
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
    setImageAssetId(item.imageAssetId ?? null);
    setImageUrl(item.imageUrl ?? null);
    setClueImageAssetId(item.clueImageAssetId ?? null);
    setClueImageUrl(item.clueImageUrl ?? null);
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

                <Text style={styles.sectionTitle}>{t('myDayPeople.settings.gameOptionsSection', 'Game Options')}</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('myDayPeople.settings.questionsPerSession', 'Questions per session (max)')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Pressable
                      style={styles.counterBtn}
                      onPress={() => updateSettingsField('maxQuestionsPerSession', Math.max(1, (settings.maxQuestionsPerSession || 6) - 1))}
                    >
                      <Ionicons name="remove" size={20} color={colors.primary[600]} />
                    </Pressable>
                    <Text style={{ fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800] }}>
                      {settings.maxQuestionsPerSession ?? 6}
                    </Text>
                    <Pressable
                      style={styles.counterBtn}
                      onPress={() => updateSettingsField('maxQuestionsPerSession', Math.min(20, (settings.maxQuestionsPerSession || 6) + 1))}
                    >
                      <Ionicons name="add" size={20} color={colors.primary[600]} />
                    </Pressable>
                  </View>
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

                {/* ── Question Image ── */}
                <Text style={styles.label}>{t('myDayPeople.settings.questionImage', 'Question Photo (optional)')}</Text>
                <Text style={styles.labelDesc}>{t('myDayPeople.settings.questionImageDesc', 'Shown to the patient as the question. Useful for people-recognition practice.')}</Text>
                {imageUrl ? (
                  <View style={styles.imagePreviewRow}>
                    <Image source={{ uri: imageUrl }} style={styles.imagePreview} contentFit="cover" />
                    <Pressable onPress={() => { setImageAssetId(null); setImageUrl(null); }} style={styles.removeImageBtn}>
                      <Ionicons name="close-circle" size={22} color={colors.error.main} />
                      <Text style={styles.removeImageText}>{t('myDayPeople.settings.removeQuestionImage', 'Remove')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => pickImage(false)} style={styles.imagePickBtn} disabled={uploadingImage}>
                    {uploadingImage
                      ? <ActivityIndicator color={colors.primary[500]} />
                      : <><Ionicons name="image-outline" size={20} color={colors.primary[500]} /><Text style={styles.imagePickText}>{t('myDayPeople.settings.addQuestionImage', 'Add Question Photo')}</Text></>
                    }
                  </Pressable>
                )}

                {/* ── Clue/Hint Image ── */}
                <Text style={styles.label}>{t('myDayPeople.settings.clueImage', 'Hint Photo (optional)')}</Text>
                <Text style={styles.labelDesc}>{t('myDayPeople.settings.clueImageDesc', 'Shown when the patient taps "Show hint". Can be a close-up or context photo.')}</Text>
                {clueImageUrl ? (
                  <View style={styles.imagePreviewRow}>
                    <Image source={{ uri: clueImageUrl }} style={styles.clueImagePreview} contentFit="cover" />
                    <Pressable onPress={() => { setClueImageAssetId(null); setClueImageUrl(null); }} style={styles.removeImageBtn}>
                      <Ionicons name="close-circle" size={22} color={colors.error.main} />
                      <Text style={styles.removeImageText}>{t('myDayPeople.settings.removeClueImage', 'Remove')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => pickImage(true)} style={styles.imagePickBtn} disabled={uploadingClueImage}>
                    {uploadingClueImage
                      ? <ActivityIndicator color={colors.primary[500]} />
                      : <><Ionicons name="image-outline" size={20} color={colors.primary[500]} /><Text style={styles.imagePickText}>{t('myDayPeople.settings.addClueImage', 'Add Hint Photo')}</Text></>
                    }
                  </Pressable>
                )}

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
                    {/* Thumbnail if item has an image */}
                    {item.imageUrl && (
                      <Image source={{ uri: item.imageUrl }} style={styles.itemThumbnail} contentFit="cover" />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemPrompt}>{item.prompt}</Text>
                      <Text style={styles.itemAnswer}>{item.correctAnswer}</Text>
                    </View>
                    <View style={styles.itemActions}>
                      <Pressable onPress={() => startEdit(item)} hitSlop={8}>
                        <Ionicons name="create-outline" size={20} color={colors.primary[500]} />
                      </Pressable>
                      <Pressable onPress={() => handleArchiveItem(item.id)} hitSlop={8}>
                        <Ionicons name="archive-outline" size={20} color={colors.error.main} />
                      </Pressable>
                    </View>
                  </View>
                  {item.cueText ? <Text style={styles.itemCue}>{t('myDayPeople.settings.hintPrefix', 'Hint: ')}{item.cueText}</Text> : null}
                  {item.supportRole ? <Text style={styles.itemRole}>{t('myDayPeople.settings.rolePrefix', 'Role: ')}{item.supportRole}</Text> : null}
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{t('myDayPeople.settings.includeInGame', 'Include in Game')}</Text>
                    <Switch
                      value={item.patientVisible ?? true}
                      onValueChange={(val) => handleToggleVisible(item.id, val)}
                    />
                  </View>

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
  switchLabel: { fontSize: typography.size.sm, color: colors.neutral[700], flex: 1, marginRight: spacing.sm },
  counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  formCard: { padding: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  label: { fontSize: typography.size.sm, fontWeight: '600', color: colors.neutral[700], marginTop: spacing.xs },
  labelDesc: { fontSize: typography.size.xs, color: colors.neutral[400], lineHeight: 18, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, padding: spacing.md, fontSize: typography.size.base, color: colors.neutral[800] },
  imagePickBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.primary[200], borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, justifyContent: 'center', backgroundColor: colors.primary[50] },
  imagePickText: { fontSize: typography.size.sm, color: colors.primary[600], fontWeight: '500' },
  imagePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  imagePreview: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.neutral[100] },
  clueImagePreview: { width: 120, height: 70, borderRadius: radius.md, backgroundColor: colors.neutral[100] },
  removeImageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeImageText: { fontSize: typography.size.xs, color: colors.error.main },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  categoryChip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.neutral[100] },
  categoryChipActive: { backgroundColor: colors.primary[100] },
  categoryChipText: { fontSize: typography.size.xs, color: colors.neutral[500] },
  categoryChipTextActive: { color: colors.primary[600], fontWeight: '600' },
  saveBtn: { backgroundColor: colors.primary[500], padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: typography.size.base },
  itemCard: { padding: spacing.md, gap: 4 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  itemThumbnail: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.neutral[100] },
  itemPrompt: { fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800] },
  itemActions: { flexDirection: 'row', gap: spacing.md, paddingTop: 2 },
  itemAnswer: { fontSize: typography.size.sm, color: colors.neutral[600] },
  itemCue: { fontSize: typography.size.xs, color: colors.secondary[600] },
  itemRole: { fontSize: typography.size.xs, color: colors.primary[600], fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  itemMeta: { fontSize: typography.size.xs, color: colors.neutral[400] },
  itemMastery: { fontSize: typography.size.xs, color: colors.primary[500], fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: typography.size.sm, color: colors.neutral[400], textAlign: 'center', marginTop: spacing.lg },
  warningText: { fontSize: typography.size.xs, color: colors.warning.main, marginTop: spacing.sm, lineHeight: 18 },
});
