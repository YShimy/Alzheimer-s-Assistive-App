import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, Icon } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { importantInfoApi, type ImportantInfoData } from '@/src/features/important-info/api';

type PatientSection = {
  titleKey: string;
  defaultTitle: string;
  icon: string;
  iconColor: string;
  fields: { key: keyof ImportantInfoData; labelKey: string; defaultLabel: string }[];
};

function getPatientSections(): PatientSection[] {
  return [
    {
      titleKey: 'importantInfo.patient.myName', defaultTitle: 'My Name & Language',
      icon: 'person-circle-outline', iconColor: colors.secondary.main,
      fields: [
        { key: 'preferredName', labelKey: 'importantInfo.field.preferredName', defaultLabel: 'Preferred Name' },
        { key: 'primaryLanguage', labelKey: 'importantInfo.field.primaryLanguage', defaultLabel: 'Primary Language' },
        { key: 'livingSituation', labelKey: 'importantInfo.field.livingSituation', defaultLabel: 'Living Situation' },
      ],
    },
    {
      titleKey: 'importantInfo.patient.myCaregiver', defaultTitle: 'My Caregiver',
      icon: 'heart-circle-outline', iconColor: colors.tertiary.main,
      fields: [
        { key: 'primaryCaregiverName', labelKey: 'importantInfo.field.primaryCaregiverName', defaultLabel: 'Primary Caregiver' },
        { key: 'primaryCaregiverPhone', labelKey: 'importantInfo.field.primaryCaregiverPhone', defaultLabel: 'Caregiver Phone' },
      ],
    },
    {
      titleKey: 'importantInfo.patient.whoToCall', defaultTitle: 'Who to Call',
      icon: 'call-outline', iconColor: colors.primary.main,
      fields: [
        { key: 'emergencyContactName', labelKey: 'importantInfo.field.emergencyContactName', defaultLabel: 'Emergency Contact' },
        { key: 'emergencyContactPhone', labelKey: 'importantInfo.field.emergencyContactPhone', defaultLabel: 'Emergency Phone' },
      ],
    },
    {
      titleKey: 'importantInfo.patient.helpfulReminders', defaultTitle: 'Things That Help Me',
      icon: 'bulb-outline', iconColor: colors.secondary.main,
      fields: [
        { key: 'communicationTips', labelKey: 'importantInfo.field.communicationTips', defaultLabel: 'Communication Tips' },
        { key: 'memorySupportTips', labelKey: 'importantInfo.field.memorySupportTips', defaultLabel: 'Memory Support Tips' },
        { key: 'preferredActivities', labelKey: 'importantInfo.field.preferredActivities', defaultLabel: 'Activities I Enjoy' },
      ],
    },
    {
      titleKey: 'importantInfo.patient.calmingStrategies', defaultTitle: 'What Helps Me Feel Calm',
      icon: 'leaf-outline', iconColor: colors.success.main,
      fields: [
        { key: 'calmingStrategies', labelKey: 'importantInfo.field.calmingStrategies', defaultLabel: 'Calming Strategies' },
      ],
    },
    {
      titleKey: 'importantInfo.patient.emergencyInstructions', defaultTitle: 'Important Instructions',
      icon: 'shield-checkmark-outline', iconColor: colors.warning.main,
      fields: [
        { key: 'emergencyInstructions', labelKey: 'importantInfo.field.emergencyInstructions', defaultLabel: 'Emergency Instructions' },
      ],
    },
  ];
}

export default function PatientImportantInfoScreen() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<ImportantInfoData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const { info: data } = await importantInfoApi.getMyInfo();
          if (active) setInfo(data);
        } catch (e) {
          console.error('Failed to load important info', e);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  const sections = getPatientSections();

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator size="large" color={colors.primary.main} style={{ marginTop: 80 }} />
      </ScreenContainer>
    );
  }

  if (!info) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <Icon name="information-circle-outline" size={64} color={colors.outline_variant} />
          <Text style={styles.emptyTitle}>{t('importantInfo.patient.emptyTitle', 'No Information Yet')}</Text>
          <Text style={styles.emptyMsg}>
            {t('importantInfo.patient.emptyMsg', 'Your caregiver has not added important information yet.')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Check if any data actually exists
  const hasAnyData = sections.some(s =>
    s.fields.some(f => !!(info as any)[f.key])
  );

  if (!hasAnyData) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <Icon name="information-circle-outline" size={64} color={colors.outline_variant} />
          <Text style={styles.emptyTitle}>{t('importantInfo.patient.emptyTitle', 'No Information Yet')}</Text>
          <Text style={styles.emptyMsg}>
            {t('importantInfo.patient.emptyMsg', 'Your caregiver has not added important information yet.')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>{t('importantInfo.title', 'Important Information')}</Text>
        <Text style={styles.pageSubtitle}>
          {t('importantInfo.patient.subtitle', 'Information from your caregiver to support your daily care.')}
        </Text>

        {sections.map(section => {
          const visibleFields = section.fields.filter(f => !!(info as any)[f.key]);
          if (visibleFields.length === 0) return null;

          return (
            <View key={section.titleKey} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBadge, { backgroundColor: `${section.iconColor}20` }]}>
                  <Icon name={section.icon as any} size={24} color={section.iconColor} />
                </View>
                <Text style={styles.sectionTitle}>
                  {t(section.titleKey, section.defaultTitle)}
                </Text>
              </View>

              {visibleFields.map(field => (
                <View key={field.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{t(field.labelKey, field.defaultLabel)}</Text>
                  <Text style={styles.fieldValue}>{(info as any)[field.key] ?? '—'}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {info.lastReviewedAt && (
          <View style={styles.reviewedRow}>
            <Icon name="checkmark-circle-outline" size={14} color={colors.success.main} />
            <Text style={styles.reviewedText}>
              {t('importantInfo.lastReviewed', 'Last reviewed')}: {new Date(info.lastReviewedAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['4xl'] },
  pageTitle: {
    fontFamily: typography.family.display,
    fontSize: typography.size.xl,
    color: colors.on_surface,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    marginBottom: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.surface_container_lowest,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface_container,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: typography.family.title,
    fontSize: typography.size.lg,
    color: colors.on_surface,
    flex: 1,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
  },
  fieldValue: {
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.on_surface,
    lineHeight: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    gap: spacing.lg,
  },
  emptyTitle: {
    fontFamily: typography.family.display,
    fontSize: typography.size.xl,
    color: colors.on_surface,
    textAlign: 'center',
  },
  emptyMsg: {
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.on_surface_variant,
    textAlign: 'center',
  },
  reviewedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  reviewedText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.on_surface_variant,
  },
});
