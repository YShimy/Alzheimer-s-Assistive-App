import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { ScreenContainer, AppCard, AppButton, AppInput, StatusChip, Icon, LoadingState, EmptyState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { carelinksApi } from '@/src/features/carelinks/api';
import type { CareLink } from '@/src/features/carelinks/types';

/**
 * Caregiver — linked patients management screen.
 * View, invite, and manage care links.
 */
export default function CaregiverPatientsScreen() {
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
    Alert.alert('Revoke Link', 'Are you sure you want to revoke this care link?', [
      { text: 'Cancel', style: 'cancel' },
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

  if (loading) return <ScreenContainer><LoadingState message="Loading patients..." /></ScreenContainer>;

  return (
    <ScreenContainer scroll={false} padded={false}>
      <FlatList
        data={links}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No linked patients"
            message="Generate an invite code from the Dashboard to connect with a patient."
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
                  <PermItem label="Create Reminders" enabled={item.permissions.canCreateReminders} />
                  <PermItem label="Edit Reminders" enabled={item.permissions.canEditReminders} />
                  <PermItem label="View Progress" enabled={item.permissions.canViewProgress} />
                </View>
                <AppButton
                  title="Revoke Link"
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
