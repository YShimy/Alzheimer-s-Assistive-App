import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer, Icon } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { importantInfoApi, type ImportantInfoData } from '@/src/features/important-info/api';

// ─── Field section config ─────────────────────────────────────────────────────
type FieldDef = { key: keyof ImportantInfoData; label: string; multiline?: boolean; maxLength?: number };

type Section = { titleKey: string; defaultTitle: string; warning?: string; fields: FieldDef[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSections(t: any): Section[] {
  return [
    {
      titleKey: 'importantInfo.section.basic', defaultTitle: 'Basic Support Info',
      fields: [
        { key: 'preferredName', label: t('importantInfo.field.preferredName', 'Preferred Name'), maxLength: 120 },
        { key: 'primaryLanguage', label: t('importantInfo.field.primaryLanguage', 'Primary Language'), maxLength: 120 },
        { key: 'livingSituation', label: t('importantInfo.field.livingSituation', 'Living Situation'), maxLength: 500 },
        { key: 'addressNote', label: t('importantInfo.field.addressNote', 'Address Note (Caregiver Only)'), maxLength: 500 },
      ],
    },
    {
      titleKey: 'importantInfo.section.contacts', defaultTitle: 'Emergency & Support Contacts',
      fields: [
        { key: 'primaryCaregiverName', label: t('importantInfo.field.primaryCaregiverName', 'Primary Caregiver Name'), maxLength: 120 },
        { key: 'primaryCaregiverPhone', label: t('importantInfo.field.primaryCaregiverPhone', 'Primary Caregiver Phone'), maxLength: 40 },
        { key: 'emergencyContactName', label: t('importantInfo.field.emergencyContactName', 'Emergency Contact Name'), maxLength: 120 },
        { key: 'emergencyContactPhone', label: t('importantInfo.field.emergencyContactPhone', 'Emergency Contact Phone'), maxLength: 40 },
        { key: 'doctorName', label: t('importantInfo.field.doctorName', 'Doctor Name'), maxLength: 120 },
        { key: 'doctorPhone', label: t('importantInfo.field.doctorPhone', 'Doctor Phone'), maxLength: 40 },
        { key: 'clinicOrHospitalName', label: t('importantInfo.field.clinicOrHospitalName', 'Clinic / Hospital'), maxLength: 500 },
      ],
    },
    {
      titleKey: 'importantInfo.section.health', defaultTitle: 'Health Reference Info',
      warning: t('importantInfo.healthWarning', 'This information is entered by the caregiver for reference and does not replace professional medical advice.'),
      fields: [
        { key: 'allergies', label: t('importantInfo.field.allergies', 'Allergies (Ref)'), multiline: true, maxLength: 1500 },
        { key: 'currentMedicationSummary', label: t('importantInfo.field.currentMedicationSummary', 'Current Medications (Ref)'), multiline: true, maxLength: 1500 },
        { key: 'importantConditionsNote', label: t('importantInfo.field.importantConditionsNote', 'Important Conditions Note'), multiline: true, maxLength: 1500 },
        { key: 'mobilitySupportNote', label: t('importantInfo.field.mobilitySupportNote', 'Mobility Support Note'), multiline: true, maxLength: 1000 },
        { key: 'dietaryNotes', label: t('importantInfo.field.dietaryNotes', 'Dietary Notes'), multiline: true, maxLength: 1000 },
      ],
    },
    {
      titleKey: 'importantInfo.section.routine', defaultTitle: 'Daily Routine Support',
      fields: [
        { key: 'morningRoutineNotes', label: t('importantInfo.field.morningRoutineNotes', 'Morning Routine'), multiline: true, maxLength: 1000 },
        { key: 'eveningRoutineNotes', label: t('importantInfo.field.eveningRoutineNotes', 'Evening Routine'), multiline: true, maxLength: 1000 },
        { key: 'mealSupportNotes', label: t('importantInfo.field.mealSupportNotes', 'Meal Support'), multiline: true, maxLength: 1000 },
        { key: 'sleepRoutineNotes', label: t('importantInfo.field.sleepRoutineNotes', 'Sleep Routine'), multiline: true, maxLength: 1000 },
        { key: 'hydrationNotes', label: t('importantInfo.field.hydrationNotes', 'Hydration Notes'), multiline: true, maxLength: 500 },
      ],
    },
    {
      titleKey: 'importantInfo.section.comfort', defaultTitle: 'Communication & Comfort',
      fields: [
        { key: 'communicationTips', label: t('importantInfo.field.communicationTips', 'Communication Tips'), multiline: true, maxLength: 1500 },
        { key: 'calmingStrategies', label: t('importantInfo.field.calmingStrategies', 'Calming Strategies'), multiline: true, maxLength: 1500 },
        { key: 'memorySupportTips', label: t('importantInfo.field.memorySupportTips', 'Memory Support Tips'), multiline: true, maxLength: 1500 },
        { key: 'preferredActivities', label: t('importantInfo.field.preferredActivities', 'Preferred Activities'), multiline: true, maxLength: 1000 },
        { key: 'distressTriggers', label: t('importantInfo.field.distressTriggers', 'Distress Triggers (Caregiver Only)'), multiline: true, maxLength: 1000 },
      ],
    },
    {
      titleKey: 'importantInfo.section.safety', defaultTitle: 'Safety Notes',
      fields: [
        { key: 'homeSafetyNotes', label: t('importantInfo.field.homeSafetyNotes', 'Home Safety Notes'), multiline: true, maxLength: 1500 },
        { key: 'wanderingRiskNotes', label: t('importantInfo.field.wanderingRiskNotes', 'Wandering Risk Notes (Caregiver Only)'), multiline: true, maxLength: 1000 },
        { key: 'emergencyInstructions', label: t('importantInfo.field.emergencyInstructions', 'Emergency Instructions'), multiline: true, maxLength: 1500 },
      ],
    },
    {
      titleKey: 'importantInfo.section.notes', defaultTitle: 'Additional Notes',
      fields: [
        { key: 'generalNotes', label: t('importantInfo.field.generalNotes', 'General Notes'), multiline: true, maxLength: 1500 },
      ],
    },
  ];
}

export default function ImportantInfoScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { selectedPatientId, selectedPatientName } = useCaregiverPatientStore();

  const [info, setInfo] = useState<ImportantInfoData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isRTL = i18n.language === 'ar';

  const loadInfo = useCallback(async () => {
    if (!selectedPatientId) return;
    try {
      const { info: data } = await importantInfoApi.get(selectedPatientId);
      setInfo(data ?? {});
    } catch (e) {
      console.error('Failed to load important info', e);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useFocusEffect(useCallback(() => { loadInfo(); }, [loadInfo]));

  const handleSave = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      const { info: updated } = await importantInfoApi.upsert(selectedPatientId, info);
      setInfo(updated);
      Alert.alert(t('importantInfo.savedTitle', 'Saved'), t('importantInfo.savedMsg', 'Important information updated successfully.'));
    } catch (e) {
      Alert.alert(t('common.error', 'Error'), t('importantInfo.saveError', 'Failed to save. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!selectedPatientId) return;
    setReviewing(true);
    try {
      const { info: updated } = await importantInfoApi.markReviewed(selectedPatientId);
      setInfo(updated);
      Alert.alert(t('importantInfo.reviewedTitle', 'Reviewed'), t('importantInfo.reviewedMsg', 'Card marked as reviewed.'));
    } catch (e) {
      Alert.alert(t('common.error', 'Error'), t('importantInfo.reviewError', 'Failed to mark as reviewed.'));
    } finally {
      setReviewing(false);
    }
  };

  const toggleSection = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = getSections(t);

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator size="large" color={colors.secondary.main} style={{ marginTop: 80 }} />
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer scroll={false}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
              <Icon name="arrow-back" size={24} color={colors.on_surface} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('importantInfo.title', 'Important Information')}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {selectedPatientName ?? t('auth.patient', 'Patient')}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Subtitle */}
          <Text style={styles.description}>
            {t('importantInfo.description', 'Caregiver-provided information to support daily care and communication.')}
          </Text>

          {/* Last reviewed / updated info */}
          {info.lastReviewedAt && (
            <View style={styles.metaRow}>
              <Icon name="checkmark-circle-outline" size={16} color={colors.secondary.main} />
              <Text style={styles.metaText}>
                {t('importantInfo.lastReviewed', 'Last reviewed')}: {new Date(info.lastReviewedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
          {info.updatedAt && (
            <View style={styles.metaRow}>
              <Icon name="time-outline" size={16} color={colors.on_surface_variant} />
              <Text style={styles.metaText}>
                {t('importantInfo.lastUpdated', 'Last updated')}: {new Date(info.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Sections */}
          {sections.map((section) => {
            const isCollapsed = collapsed[section.titleKey];
            return (
              <View key={section.titleKey} style={styles.sectionCard}>
                <Pressable
                  style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => toggleSection(section.titleKey)}
                >
                  <Text style={styles.sectionTitle}>
                    {t(section.titleKey, section.defaultTitle)}
                  </Text>
                  <View style={{ transform: [{ rotate: isCollapsed ? '0deg' : '180deg' }] }}>
                    <Icon name="chevron-down" size={20} color={colors.secondary.main} />
                  </View>
                </Pressable>

                {!isCollapsed && (
                  <View style={styles.sectionBody}>
                    {section.warning && (
                      <View style={styles.warningBox}>
                        <Icon name="information-circle-outline" size={16} color={colors.warning.main} />
                        <Text style={styles.warningText}>{section.warning}</Text>
                      </View>
                    )}
                    {section.fields.map((field) => (
                      <View key={field.key} style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>{field.label}</Text>
                        <TextInput
                          style={[
                            styles.input,
                            field.multiline && styles.inputMultiline,
                            { textAlign: isRTL ? 'right' : 'left' },
                          ]}
                          value={(info as any)[field.key] ?? ''}
                          onChangeText={(v) => setInfo(prev => ({ ...prev, [field.key]: v }))}
                          placeholder={t('importantInfo.placeholder', 'Enter here...')}
                          placeholderTextColor={colors.outline_variant}
                          multiline={field.multiline}
                          maxLength={field.maxLength}
                          numberOfLines={field.multiline ? 3 : 1}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Actions */}
          <Pressable
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t('importantInfo.saveBtn', 'Save Changes')}</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.reviewBtn, reviewing && styles.btnDisabled]}
            onPress={handleMarkReviewed}
            disabled={reviewing}
          >
            {reviewing ? (
              <ActivityIndicator size="small" color={colors.secondary.main} />
            ) : (
              <>
                <Icon name="checkmark-done-outline" size={18} color={colors.secondary.main} />
                <Text style={styles.reviewBtnText}>{t('importantInfo.reviewBtn', 'Mark as Reviewed')}</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    padding: spacing.sm,
  },
  title: {
    fontFamily: typography.family.display,
    fontSize: typography.size.xl,
    color: colors.on_surface,
  },
  subtitle: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
  },
  scrollContent: {
    paddingBottom: spacing['4xl'],
  },
  description: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metaText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.xs,
    color: colors.on_surface_variant,
  },
  sectionCard: {
    backgroundColor: colors.surface_container_lowest,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surface_container,
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.surface_container_low,
  },
  sectionTitle: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface,
    flex: 1,
  },
  sectionBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tertiary_container,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.on_tertiary_container,
    flex: 1,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outline_variant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.on_surface,
    backgroundColor: colors.surface_container_lowest,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.secondary.main,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  saveBtnText: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_secondary,
  },
  reviewBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.secondary.main,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  reviewBtnText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.base,
    color: colors.secondary.main,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
