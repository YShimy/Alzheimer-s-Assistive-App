import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppCard, AppButton, AppInput, StatusChip, Icon, LoadingState, EmptyState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { carelinksApi } from '@/src/features/carelinks/api';
import type { CareLink } from '@/src/features/carelinks/types';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';

/**
 * Caregiver — linked patients management screen.
 * View, invite, and manage care links.
 */
export default function CaregiverPatientsScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const router = useRouter();
  const { selectPatient } = useCaregiverPatientStore();
  const [links, setLinks] = useState<CareLink[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { careLinks } = await carelinksApi.getMyLinks();
      setLinks(careLinks);
    } catch (err: any) {
      if (err?.code === 'NOT_IMPLEMENTED' || err?.status === 501) {
        console.warn('Backend returned 501 for checklists');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (id: string) => {
    Alert.alert(t('caregiverPatients.revokeLink'), t('caregiverPatients.revokeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('caregiverPatients.revokeAction'),
        style: 'destructive',
        onPress: async () => {
          try {
            await carelinksApi.revoke(id);
            Alert.alert(t('common.success'), t('caregiverPatients.successRevoked'));
            load();
          } catch (err: any) {
            Alert.alert(t('common.error'), err.message || t('caregiverPatients.errorRevokeFailed'));
          }
        },
      },
    ]);
  };

  if (loading) return <ScreenContainer><LoadingState message={t('caregiverPatients.loading')} /></ScreenContainer>;

  return (
    <ScreenContainer scroll={false} padded={false}>
      <FlatList
        data={links}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={t('caregiverPatients.noLinkedPatients')}
            message={t('caregiverPatients.generateInviteMsg')}
          />
        }
        renderItem={({ item }) => (
          <AppCard style={styles.card}>
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.cardLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Icon name="person-circle-outline" size={36} color={colors.secondary[500]} />
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.patientName, { textAlign: isRTL ? 'right' : 'left' }]}>{item.patient?.displayName || t('caregiverHome.pending')}</Text>
                  <Text style={[styles.patientEmail, { textAlign: isRTL ? 'right' : 'left' }]}>{item.patient?.email || `${t('auth.code')}: ${item.inviteCode}`}</Text>
                </View>
              </View>
              <StatusChip
                label={t(`caregiverHome.${item.status}`)}
                variant={item.status === 'active' ? 'success' : item.status === 'pending' ? 'warning' : 'error'}
              />
            </View>

            {item.status === 'active' && (
              <>
                <View style={styles.permsList}>
                  <PermItem label={t('caregiverPatients.createReminders')} enabled={item.permissions.canCreateReminders} />
                  <PermItem label={t('caregiverPatients.editReminders')} enabled={item.permissions.canEditReminders} />
                  <PermItem label={t('caregiverPatients.viewProgress')} enabled={item.permissions.canViewProgress} />
                  <PermItem label={t('caregiverPatients.createChecklists')} enabled={item.permissions.canCreateChecklists} />
                </View>
                <View style={[styles.cardActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <AppButton
                      title={t('caregiverPatients.manageContacts')}
                      onPress={() => router.push({
                         pathname: '/(caregiver)/contacts',
                         params: { patientId: item.patientUserId, patientName: item.patient?.displayName }
                      })}
                      variant="secondary"
                      size="sm"
                      style={styles.actionBtn}
                    />
                    <AppButton
                      title={t('caregiverPatients.manageReminders')}
                      onPress={() => {
                        selectPatient(item.patientUserId as string, (item.patient?.displayName || t('caregiverHome.pending')) as string);
                        router.push('/(caregiver)/manage-reminders');
                      }}
                      variant="outline"
                      size="sm"
                      style={styles.actionBtn}
                    />
                  <AppButton
                    title={t('caregiverPatients.revokeLink')}
                    onPress={() => handleRevoke(item.id)}
                    variant="ghost"
                    size="sm"
                    style={styles.actionBtn}
                  />
                </View>
              </>
            )}
          </AppCard>
        )}
      />
    </ScreenContainer>
  );
}

function PermItem({ label, enabled }: { label: string; enabled: boolean }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  return (
    <View style={[styles.permRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Icon
        name={enabled ? 'checkmark-circle' : 'close-circle-outline'}
        size={18}
        color={enabled ? colors.success.main : colors.neutral[300]}
      />
      <Text style={[styles.permLabel, { textAlign: isRTL ? 'right' : 'left' }, !enabled && { color: colors.neutral[400] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing['2xl'], gap: spacing.md },
  card: { marginBottom: 0 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  patientName: { fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800] },
  patientEmail: { fontSize: typography.size.sm, color: colors.neutral[500] },
  permsList: { marginBottom: spacing.md, gap: spacing.xs },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  permLabel: { fontSize: typography.size.sm, color: colors.neutral[600] },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
