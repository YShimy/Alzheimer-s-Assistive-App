import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppCard, AppButton, AppInput, StatusChip, Icon, LoadingState, EmptyState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { carelinksApi } from '@/src/features/carelinks/api';
import type { CareLink } from '@/src/features/carelinks/types';

/**
 * Caregiver — linked patients management screen.
 * View, invite, and manage care links.
 */
export default function CaregiverPatientsScreen() {
  const { t } = useTranslation();
  const [links, setLinks] = useState<CareLink[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { careLinks } = await carelinksApi.getMyLinks();
      setLinks(careLinks);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (id: string) => {
    Alert.alert(t('caregiverPatients.revokeLink'), t('caregiverPatients.revokeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await carelinksApi.revoke(id);
            Alert.alert('Success', 'Care link revoked');
            load();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to revoke');
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
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Icon name="person-circle-outline" size={36} color={colors.secondary[500]} />
                <View>
                  <Text style={styles.patientName}>{item.patient?.displayName || 'Pending'}</Text>
                  <Text style={styles.patientEmail}>{item.patient?.email || `Code: ${item.inviteCode}`}</Text>
                </View>
              </View>
              <StatusChip
                label={item.status}
                variant={item.status === 'active' ? 'success' : item.status === 'pending' ? 'warning' : 'error'}
              />
            </View>

            {item.status === 'active' && (
              <>
                <View style={styles.permsList}>
                  <PermItem label={t('caregiverPatients.createReminders')} enabled={item.permissions.canCreateReminders} />
                  <PermItem label={t('caregiverPatients.editReminders')} enabled={item.permissions.canEditReminders} />
                  <PermItem label={t('caregiverPatients.viewProgress')} enabled={item.permissions.canViewProgress} />
                </View>
                <AppButton
                  title={t('caregiverPatients.revokeLink')}
                  onPress={() => handleRevoke(item.id)}
                  variant="ghost"
                  size="sm"
                />
              </>
            )}
          </AppCard>
        )}
      />
    </ScreenContainer>
  );
}

function PermItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={styles.permRow}>
      <Icon
        name={enabled ? 'checkmark-circle' : 'close-circle-outline'}
        size={18}
        color={enabled ? colors.success.main : colors.neutral[300]}
      />
      <Text style={[styles.permLabel, !enabled && { color: colors.neutral[400] }]}>{label}</Text>
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
});
