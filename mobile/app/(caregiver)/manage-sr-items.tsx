/**
 * Caregiver — Manage Spaced Retrieval Items
 *
 * Add, edit, and archive orientation facts and personal info for the patient.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, AppCard } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { spacedRetrievalApi } from '@/src/features/games/api';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { useTranslation } from 'react-i18next';

const CATEGORY_OPTIONS = [
  'ORIENTATION_DATE',
  'ORIENTATION_PLACE',
  'CAREGIVER',
  'DAILY_ROUTINE',
  'APP_NAVIGATION',
  'SAFETY_SUPPORT',
  'OTHER',
];

export default function ManageSRItemsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedPatientId, selectedPatientName } = useCaregiverPatientStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [cueText, setCueText] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [distractors, setDistractors] = useState('');

  const loadItems = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const { items: fetched } = await spacedRetrievalApi.listItems(selectedPatientId, false);
      setItems(fetched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setPrompt('');
    setCorrectAnswer('');
    setCueText('');
    setCategory('OTHER');
    setDistractors('');
    setEditingId(null);
    setFormOpen(false);
  };

  const handleSave = async () => {
    if (!selectedPatientId || !prompt.trim() || !correctAnswer.trim()) return;
    const payload = {
      prompt: prompt.trim(),
      correctAnswer: correctAnswer.trim(),
      cueText: cueText.trim() || undefined,
      category,
      distractors: distractors.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editingId) {
        await spacedRetrievalApi.updateItem(selectedPatientId, editingId, payload);
      } else {
        await spacedRetrievalApi.createItem(selectedPatientId, payload);
      }
      resetForm();
      loadItems();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchive = async (itemId: string) => {
    if (!selectedPatientId) return;
    try {
      await spacedRetrievalApi.archiveItem(selectedPatientId, itemId);
      loadItems();
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
      <Text style={styles.title}>{t('manageFacts.title', 'Orientation Facts')}</Text>
      <Text style={styles.subtitle}>{t('manageFacts.subtitle', { name: selectedPatientName ?? 'Patient' })}</Text>

      <Pressable onPress={() => setFormOpen(!formOpen)} style={styles.toggleBtn}>
        <Text style={styles.toggleBtnText}>{formOpen ? t('manageFacts.cancel', 'Cancel') : t('manageFacts.addNew', '+ Add New Fact')}</Text>
      </Pressable>

      {formOpen && (
        <AppCard style={styles.formCard}>
          <TextInput style={styles.input} placeholder={t('manageFacts.prompt', 'Prompt / Question')} value={prompt} onChangeText={setPrompt} />
          <TextInput style={styles.input} placeholder={t('manageFacts.correctAnswer', 'Correct Answer')} value={correctAnswer} onChangeText={setCorrectAnswer} />
          <TextInput style={styles.input} placeholder={t('manageFacts.hint', 'Hint / Cue (optional)')} value={cueText} onChangeText={setCueText} />
          <TextInput style={styles.input} placeholder={t('manageFacts.wrongAnswers', 'Wrong answers, comma-separated (optional)')} value={distractors} onChangeText={setDistractors} />
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.categoryChip, category === c && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextActive]}>{c.replace(/_/g, ' ')}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{editingId ? t('manageFacts.update', 'Update') : t('manageFacts.save', 'Save')}</Text>
          </Pressable>
        </AppCard>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
          {items.filter((i) => i.active).map((item) => (
            <AppCard key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemPrompt}>{item.prompt}</Text>
                <View style={styles.itemActions}>
                  <Pressable onPress={() => startEdit(item)} hitSlop={8}>
                    <Ionicons name="create-outline" size={20} color={colors.primary[500]} />
                  </Pressable>
                  <Pressable onPress={() => handleArchive(item.id)} hitSlop={8}>
                    <Ionicons name="archive-outline" size={20} color={colors.error.main} />
                  </Pressable>
                </View>
              </View>
              <Text style={styles.itemAnswer}>{item.correctAnswer}</Text>
              {item.cueText ? <Text style={styles.itemCue}>{t('manageFacts.hintPrefix', 'Hint: ')}{item.cueText}</Text> : null}
              <Text style={styles.itemMeta}>{item.category.replace(/_/g, ' ')} · {item.masteryStatus.toLowerCase()}</Text>
            </AppCard>
          ))}
          {items.filter((i) => i.active).length === 0 && (
            <Text style={styles.emptyText}>{t('manageFacts.noFacts', 'No active facts yet. Add some to help with orientation practice.')}</Text>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.size['2xl'], fontWeight: '700', color: colors.neutral[800], marginBottom: spacing.xs },
  subtitle: { fontSize: typography.size.sm, color: colors.neutral[400], marginBottom: spacing.lg },
  toggleBtn: { alignSelf: 'flex-start', marginBottom: spacing.lg },
  toggleBtnText: { color: colors.primary[500], fontWeight: '600', fontSize: typography.size.base },
  formCard: { marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, fontSize: typography.size.base, color: colors.neutral[800] },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  categoryChip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.neutral[100] },
  categoryChipActive: { backgroundColor: colors.primary[100] },
  categoryChipText: { fontSize: typography.size.xs, color: colors.neutral[500], textTransform: 'capitalize' },
  categoryChipTextActive: { color: colors.primary[600], fontWeight: '600' },
  saveBtn: { backgroundColor: colors.primary[500], padding: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: typography.size.base },
  itemCard: { padding: spacing.md },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  itemPrompt: { fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800], flex: 1 },
  itemActions: { flexDirection: 'row', gap: spacing.md },
  itemAnswer: { fontSize: typography.size.sm, color: colors.neutral[600], marginBottom: spacing.xs },
  itemCue: { fontSize: typography.size.xs, color: colors.secondary[600], marginBottom: spacing.xs },
  itemMeta: { fontSize: typography.size.xs, color: colors.neutral[400], textTransform: 'capitalize' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: typography.size.sm, color: colors.neutral[400], textAlign: 'center', marginTop: spacing.lg },
});
