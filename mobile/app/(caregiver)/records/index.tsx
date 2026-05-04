import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Linking, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppCard, Icon, LoadingState, EmptyState, AppButton } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { recordsApi } from '@/src/features/records/api';
import type { PatientDocument, PatientDocumentCategory } from '@/src/features/records/types';

export default function RecordsListScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { selectedPatientId, selectedPatientName, loaded } = useCaregiverPatientStore();

  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PatientDocumentCategory | 'ALL'>('ALL');

  const fetchDocuments = useCallback(async (isRefresh = false) => {
    if (!selectedPatientId) return;
    if (!isRefresh) setLoading(true);
    try {
      const res = await recordsApi.listDocuments(selectedPatientId, {
        category: selectedCategory === 'ALL' ? undefined : selectedCategory
      });
      setDocuments(res.documents);
    } catch (e) {
      console.error('Failed to fetch records', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPatientId, selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
    }, [fetchDocuments])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDocuments(true);
  };

  const handleOpen = async (doc: PatientDocument) => {
    try {
      const res = await recordsApi.getViewUrl(doc.patientId, doc.id);
      Linking.openURL(res.url);
    } catch (e) {
      Alert.alert(t('error'), t('records.openError', 'Failed to open document.'));
    }
  };

  const handleArchive = (doc: PatientDocument) => {
    Alert.alert(
      t('records.archiveTitle', 'Archive Record'),
      t('records.archiveMsg', 'Are you sure you want to archive this record? It will be hidden from the default view.'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('records.archiveBtn', 'Archive'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await recordsApi.archiveDocument(doc.patientId, doc.id);
              fetchDocuments();
            } catch (e) {
              Alert.alert(t('error'), t('records.archiveError', 'Failed to archive document.'));
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: PatientDocument }) => (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Icon name={item.mimeType.includes('pdf') ? "document-text-outline" : "image-outline"} size={20} color={colors.primary.main} />
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {t(`records.categories.${item.category}`, item.category)}
          </Text>
        </View>
      </View>
      
      {item.documentDate && (
        <View style={styles.cardDetailRow}>
          <Icon name="calendar-outline" size={14} color={colors.on_surface_variant} />
          <Text style={styles.cardDetail}>{new Date(item.documentDate).toLocaleDateString(i18n.language)}</Text>
        </View>
      )}
      {item.sourceName && (
        <View style={styles.cardDetailRow}>
          <Icon name="business-outline" size={14} color={colors.on_surface_variant} />
          <Text style={styles.cardDetail}>{item.sourceName}</Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <AppButton 
          title={t('records.openBtn', 'Open')} 
          variant="outline" 
          size="sm" 
          onPress={() => handleOpen(item)} 
        />
        <AppButton 
          title={t('records.archiveBtn', 'Archive')} 
          variant="ghost" 
          size="sm" 
          onPress={() => handleArchive(item)} 
        />
      </View>
    </AppCard>
  );

  if (!loaded || !selectedPatientId) return <LoadingState />;

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.on_surface} />
        </Pressable>
        <View>
          <Text style={styles.title}>{t('records.title', 'Patient Records')}</Text>
          <Text style={styles.subtitle}>{t('caregiverReminders.managingFor')} {selectedPatientName}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <AppButton 
          title={t('records.uploadBtn', 'Upload Record')} 
          onPress={() => router.push('/(caregiver)/records/upload')}
          icon={<Icon name="cloud-upload-outline" size={18} color={colors.on_primary} />}
        />
      </View>

      <FlatList
        data={documents}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary.main]} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="document-text-outline"
              title={t('records.emptyTitle', 'No records uploaded')}
              message={t('records.emptyMsg', 'Upload documents such as prescriptions, visit notes, scan reports, or care plans for caregiver reference.')}
              actionTitle={t('records.uploadBtn', 'Upload Record')}
              onAction={() => router.push('/(caregiver)/records/upload')}
            />
          ) : <LoadingState />
        }
      />
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
    marginRight: spacing.md,
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
  actionRow: {
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface,
    marginLeft: spacing.xs,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: colors.surface_container_highest,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  categoryText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.xs,
    color: colors.on_surface_variant,
  },
  cardDetail: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline_variant,
  },
});
