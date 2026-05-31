import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable, Platform } from 'react-native';
import { useRouter, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppInput, AppButton, Icon } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { recordsApi } from '@/src/features/records/api';
import { pickDocument } from '@/src/platform/filePicker';
import type { PatientDocumentCategory } from '@/src/features/records/types';

const CATEGORIES: PatientDocumentCategory[] = [
  'PRESCRIPTION',
  'LAB_RESULT',
  'SCAN_IMAGING',
  'DOCTOR_VISIT_NOTE',
  'DISCHARGE_SUMMARY',
  'MEDICATION_PLAN',
  'CARE_PLAN',
  'ADMINISTRATIVE',
  'OTHER',
];

interface SelectedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export default function RecordsUploadScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const router = useRouter();
  const { selectedPatientId } = useCaregiverPatientStore();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PatientDocumentCategory>('OTHER');
  const [sourceName, setSourceName] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<SelectedFile | null>(null);
  
  const [uploading, setUploading] = useState(false);

  const handleSelectFile = async () => {
    try {
      const picked = await pickDocument('application/pdf,image/jpeg,image/png,image/webp');
      if (picked) {
        setFile(picked);
      }
    } catch (err) {
      console.error('Error picking document', err);
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert(t('error'), t('records.titleRequired', 'Title is required.'));
      return;
    }
    if (!file) {
      Alert.alert(t('error'), t('records.fileRequired', 'Please select a file.'));
      return;
    }
    if (!selectedPatientId) return;

    // Validate size (15 MB)
    if (file.size && file.size > 15 * 1024 * 1024) {
      Alert.alert(t('error'), t('records.fileTooLarge', 'File size must be less than 15MB.'));
      return;
    }

    setUploading(true);
    try {
      await recordsApi.uploadDocument(selectedPatientId, {
        title,
        category,
        sourceName,
        notes,
        fileUri: file.uri,
        mimeType: file.mimeType || 'application/octet-stream',
        fileName: file.name,
      });

      Alert.alert(t('success'), t('records.uploadSuccess', 'Record uploaded successfully.'));
      router.back();
    } catch (error: any) {
      Alert.alert(t('error'), t('records.uploadError', 'Failed to upload record.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScreenContainer scroll={true}>
      <Tabs.Screen options={{ title: t('records.uploadTitle', 'Upload Record'), headerTitle: t('records.uploadTitle', 'Upload Record') }} />
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { marginEnd: isRTL ? 0 : spacing.md, marginStart: isRTL ? spacing.md : 0 }]}>
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <Icon name="arrow-back" size={24} color={colors.on_surface} />
          </View>
        </Pressable>
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t('records.uploadTitle', 'Upload Record')}</Text>
      </View>

      <Text style={[styles.disclaimer, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('records.uploadDisclaimer', 'This app stores caregiver-provided documents and does not interpret or diagnose medical conditions.')}
      </Text>

      <AppInput
        label={t('records.fieldTitle', 'Title *')}
        placeholder={t('records.fieldTitlePlaceholder', 'e.g. Brain MRI Report')}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />

      <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('records.fieldCategory', 'Category *')}</Text>
      <View style={[styles.categoryContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {CATEGORIES.map(cat => (
          <Pressable 
            key={cat} 
            style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextSelected]}>
              {t(`records.categories.${cat}`, cat)}
            </Text>
          </Pressable>
        ))}
      </View>

      <AppInput
        label={t('records.fieldSource', 'Source / Doctor (Optional)')}
        placeholder={t('records.fieldSourcePlaceholder', 'e.g. Dr. Smith')}
        value={sourceName}
        onChangeText={setSourceName}
        maxLength={120}
      />

      <AppInput
        label={t('records.fieldNotes', 'Notes (Optional)')}
        placeholder={t('records.fieldNotesPlaceholder', 'Any additional notes')}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        maxLength={1000}
      />

      <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('records.fieldFile', 'Document File *')}</Text>
      <Pressable style={[styles.filePicker, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={handleSelectFile}>
        <Icon name="document-attach-outline" size={32} color={colors.primary.main} />
        <Text style={[styles.filePickerText, { marginStart: isRTL ? 0 : spacing.sm, marginEnd: isRTL ? spacing.sm : 0 }]}>
          {file ? file.name : t('records.selectFile', 'Select PDF or Image')}
        </Text>
        {file && file.size && (
          <Text style={styles.fileSizeText}>
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </Text>
        )}
      </Pressable>

      <View style={styles.footer}>
        <AppButton 
          title={t('records.uploadAction', 'Upload')} 
          onPress={handleUpload} 
          loading={uploading} 
          disabled={uploading}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: {
    marginEnd: spacing.md,
  },
  title: {
    fontFamily: typography.family.display,
    fontSize: typography.size.xl,
    color: colors.on_surface,
  },
  disclaimer: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    backgroundColor: colors.surface_variant,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.on_surface,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  categoryChipText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.on_surface,
  },
  categoryChipTextSelected: {
    color: colors.on_primary,
  },
  filePicker: {
    borderWidth: 2,
    borderColor: colors.outline_variant,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  filePickerText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.on_surface,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  fileSizeText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.xs,
    color: colors.on_surface_variant,
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.lg,
    marginBottom: spacing['4xl'],
  },
});
