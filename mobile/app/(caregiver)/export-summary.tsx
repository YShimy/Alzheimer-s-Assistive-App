import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Switch, Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppCard, Icon } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { summaryExportsApi, type SummaryExport, type CreateExportInput } from '@/src/features/summary-exports/api';

type RangePreset = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';

const PRESETS: { value: RangePreset; labelKey: string; defaultLabel: string }[] = [
  { value: 'LAST_7_DAYS', labelKey: 'summaryExport.last7Days', defaultLabel: 'Last 7 days' },
  { value: 'LAST_30_DAYS', labelKey: 'summaryExport.last30Days', defaultLabel: 'Last 30 days' },
];

type Sections = NonNullable<CreateExportInput['sections']>;

const DEFAULT_SECTIONS: Required<Sections> = {
  importantInfo: true,
  reminders: true,
  checklists: true,
  games: true,
  patientRecords: true,
  timeline: true,
};

type SectionKey = keyof typeof DEFAULT_SECTIONS;

const SECTION_LABELS: { key: SectionKey; labelKey: string; defaultLabel: string }[] = [
  { key: 'importantInfo', labelKey: 'summaryExport.section.importantInfo', defaultLabel: 'Important Information' },
  { key: 'reminders', labelKey: 'summaryExport.section.reminders', defaultLabel: 'Reminders' },
  { key: 'checklists', labelKey: 'summaryExport.section.checklists', defaultLabel: 'Routines / Checklists' },
  { key: 'games', labelKey: 'summaryExport.section.games', defaultLabel: 'Engagement Activities' },
  { key: 'patientRecords', labelKey: 'summaryExport.section.records', defaultLabel: 'Patient Records' },
  { key: 'timeline', labelKey: 'summaryExport.section.timeline', defaultLabel: 'Activity Timeline' },
];

export default function ExportSummaryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { selectedPatientId, selectedPatientName } = useCaregiverPatientStore();
  const isRTL = i18n.language === 'ar';

  const [preset, setPreset] = useState<RangePreset>('LAST_30_DAYS');
  const [sections, setSections] = useState<Required<Sections>>({ ...DEFAULT_SECTIONS });
  const [generating, setGenerating] = useState(false);
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null);
  const [previousExports, setPreviousExports] = useState<SummaryExport[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const loadExports = useCallback(async () => {
    if (!selectedPatientId) return;
    try {
      const { exports } = await summaryExportsApi.list(selectedPatientId);
      setPreviousExports(exports);
    } catch (e) {
      console.error('Failed to load exports', e);
    } finally {
      setLoadingList(false);
    }
  }, [selectedPatientId]);

  useFocusEffect(useCallback(() => { loadExports(); }, [loadExports]));

  const handleGenerate = async () => {
    if (!selectedPatientId) return;
    setGenerating(true);
    setLastExportUrl(null);
    try {
      const input: CreateExportInput = { rangePreset: preset, sections };
      const result = await summaryExportsApi.create(selectedPatientId, input);
      setLastExportUrl(result.downloadUrl);
      setPreviousExports(prev => [result.export, ...prev]);
    } catch (e: any) {
      const msg = e?.message ?? t('summaryExport.generateError', 'Unable to generate PDF. Please try again.');
      Alert.alert(t('common.error', 'Error'), msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenPdf = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error', 'Error'), t('summaryExport.openError', 'Could not open PDF.'));
    }
  };

  const handleGetDownloadUrl = async (ex: SummaryExport) => {
    if (!selectedPatientId) return;
    try {
      const { downloadUrl } = await summaryExportsApi.getDownloadUrl(selectedPatientId, ex.id);
      await handleOpenPdf(downloadUrl);
    } catch {
      Alert.alert(t('common.error', 'Error'), t('summaryExport.openError', 'Could not open PDF.'));
    }
  };

  const handleArchive = async (ex: SummaryExport) => {
    if (!selectedPatientId) return;
    Alert.alert(
      t('summaryExport.archiveTitle', 'Archive Export'),
      t('summaryExport.archiveMsg', 'This export will be hidden from your list. Continue?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('summaryExport.archiveConfirm', 'Archive'),
          style: 'destructive',
          onPress: async () => {
            setArchivingId(ex.id);
            try {
              await summaryExportsApi.archive(selectedPatientId, ex.id);
              setPreviousExports(prev => prev.filter(e => e.id !== ex.id));
            } catch {
              Alert.alert(t('common.error', 'Error'), t('summaryExport.archiveError', 'Failed to archive.'));
            } finally {
              setArchivingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer scroll={false}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <Icon name="arrow-back" size={24} color={colors.on_surface} />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('summaryExport.title', 'Export Summary PDF')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {selectedPatientName ?? t('auth.patient', 'Patient')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          {t('summaryExport.description', 'Create a caregiver summary from reminders, routines, engagement, records, and important information.')}
        </Text>

        {/* Date Range */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('summaryExport.dateRange', 'Date Range')}</Text>
          {PRESETS.map(p => (
            <Pressable
              key={p.value}
              style={[styles.presetOption, preset === p.value && styles.presetOptionSelected]}
              onPress={() => setPreset(p.value)}
            >
              <View style={[styles.radio, preset === p.value && styles.radioSelected]} />
              <Text style={[styles.presetLabel, preset === p.value && styles.presetLabelSelected]}>
                {t(p.labelKey, p.defaultLabel)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Sections */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('summaryExport.sections', 'Include Sections')}</Text>
          {SECTION_LABELS.map(s => (
            <View key={s.key} style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.switchLabel}>{t(s.labelKey, s.defaultLabel)}</Text>
              <Switch
                value={sections[s.key]}
                onValueChange={v => setSections(prev => ({ ...prev, [s.key]: v }))}
                trackColor={{ false: colors.outline_variant, true: colors.secondary.main }}
                thumbColor={colors.surface_container_lowest}
              />
            </View>
          ))}
        </View>

        {/* Success state after generation */}
        {lastExportUrl && (
          <View style={styles.successBox}>
            <Icon name="checkmark-circle" size={22} color={colors.success.main} />
            <Text style={styles.successText}>{t('summaryExport.successMsg', 'Summary PDF generated.')}</Text>
            <Pressable style={styles.openPdfBtn} onPress={() => handleOpenPdf(lastExportUrl)}>
              <Icon name="open-outline" size={18} color={colors.on_secondary} />
              <Text style={styles.openPdfBtnText}>{t('summaryExport.openPdf', 'Open PDF')}</Text>
            </Pressable>
          </View>
        )}

        {/* Generate button */}
        <Pressable
          style={[styles.generateBtn, generating && styles.btnDisabled]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.generateBtnText}>{t('summaryExport.generating', 'Generating…')}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="document-text-outline" size={20} color={colors.on_secondary} />
              <Text style={styles.generateBtnText}>{t('summaryExport.generateBtn', 'Generate PDF')}</Text>
            </View>
          )}
        </Pressable>

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Icon name="information-circle-outline" size={16} color={colors.on_surface_variant} />
          <Text style={styles.disclaimerText}>
            {t('summaryExport.disclaimer',
              'This summary is generated from app activity and caregiver-entered information. It is intended for caregiver organization and communication support only and is not a medical diagnosis or clinical assessment.'
            )}
          </Text>
        </View>

        {/* Previous exports */}
        <Text style={styles.previousTitle}>{t('summaryExport.previousExports', 'Previous Exports')}</Text>

        {loadingList ? (
          <ActivityIndicator color={colors.secondary.main} style={{ marginVertical: spacing.xl }} />
        ) : previousExports.length === 0 ? (
          <Text style={styles.emptyText}>{t('summaryExport.noExports', 'No previous exports yet.')}</Text>
        ) : (
          previousExports.map(ex => (
            <AppCard key={ex.id} style={styles.exportCard}>
              <View style={styles.exportCardHeader}>
                <Icon name="document-text-outline" size={18} color={colors.secondary.main} />
                <Text style={styles.exportTitle} numberOfLines={1}>{ex.title ?? 'Export'}</Text>
              </View>
              <Text style={styles.exportMeta}>
                {t('summaryExport.generated', 'Generated')}: {new Date(ex.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.exportMeta}>
                {t('summaryExport.range', 'Range')}: {new Date(ex.rangeStart).toLocaleDateString()} – {new Date(ex.rangeEnd).toLocaleDateString()}
              </Text>
              <View style={styles.exportActions}>
                <Pressable style={styles.exportActionBtn} onPress={() => handleGetDownloadUrl(ex)}>
                  <Icon name="open-outline" size={16} color={colors.secondary.main} />
                  <Text style={styles.exportActionText}>{t('summaryExport.openPdf', 'Open PDF')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.exportActionBtn, archivingId === ex.id && { opacity: 0.5 }]}
                  onPress={() => handleArchive(ex)}
                  disabled={archivingId === ex.id}
                >
                  <Icon name="archive-outline" size={16} color={colors.on_surface_variant} />
                  <Text style={[styles.exportActionText, { color: colors.on_surface_variant }]}>{t('summaryExport.archive', 'Archive')}</Text>
                </Pressable>
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: { padding: spacing.sm },
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
  scrollContent: { paddingBottom: spacing['4xl'] },
  description: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface_container_lowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface_container,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface,
    marginBottom: spacing.xs,
  },
  presetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  presetOptionSelected: {
    backgroundColor: colors.secondary_container,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.outline_variant,
  },
  radioSelected: {
    borderColor: colors.secondary.main,
    backgroundColor: colors.secondary.main,
  },
  presetLabel: {
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.on_surface,
  },
  presetLabelSelected: {
    fontFamily: typography.family.label,
    color: colors.secondary.main,
  },
  switchRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  switchLabel: {
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.on_surface,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary_container,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  successText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.base,
    color: colors.on_secondary_container,
    flex: 1,
  },
  openPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  openPdfBtnText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.on_secondary,
  },
  generateBtn: {
    backgroundColor: colors.secondary.main,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  generateBtnText: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_secondary,
  },
  btnDisabled: { opacity: 0.5 },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface_container,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  disclaimerText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.on_surface_variant,
    flex: 1,
  },
  previousTitle: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    marginBottom: spacing.xl,
  },
  exportCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  exportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  exportTitle: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface,
    flex: 1,
  },
  exportMeta: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
  },
  exportActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline_variant,
  },
  exportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exportActionText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.secondary.main,
  },
});
