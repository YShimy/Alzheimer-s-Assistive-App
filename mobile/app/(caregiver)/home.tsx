import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { ScreenContainer, AppCard, AppButton, Icon, StatusChip } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useSessionStore } from '@/src/state/sessionStore';
import { useLogout } from '@/src/features/auth/useLogout';
import { carelinksApi } from '@/src/features/carelinks/api';
import type { CareLink } from '@/src/features/carelinks/types';

/**
 * Caregiver home — dashboard with linked patients summary,
 * invite code generation, and quick actions.
 */
export default function CaregiverHomeScreen() {
  const displayName = useSessionStore((s) => s.displayName);
  const logout = useLogout();
  const [links, setLinks] = useState<CareLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carelinksApi
      .getMyLinks()
      .then(({ careLinks }) => setLinks(careLinks))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    try {
      const { careLink } = await carelinksApi.createInvite();
      Alert.alert(
        'Invite Code Generated',
        `Share this code with your patient:\n\n${careLink.inviteCode}\n\nThey can enter it in their app to connect with you.`,
      );
      // Refresh links
      const { careLinks } = await carelinksApi.getMyLinks();
      setLinks(careLinks);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create invite');
    }
  };

  const activeLinks = links.filter((l) => l.status === 'active');
  const pendingLinks = links.filter((l) => l.status === 'pending');

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{displayName || 'Caregiver'}</Text>
        </View>
        <Pressable onPress={() => logout().catch(console.warn)} style={styles.logoutBtn} accessibilityLabel="Log out">
          <Icon name="log-out-outline" size={22} color={colors.neutral[500]} />
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.secondary[50] }]}>
          <Text style={[styles.statValue, { color: colors.secondary[600] }]}>{activeLinks.length}</Text>
          <Text style={styles.statLabel}>Linked Patients</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warning.light }]}>
          <Text style={[styles.statValue, { color: colors.warning.dark }]}>{pendingLinks.length}</Text>
          <Text style={styles.statLabel}>Pending Invites</Text>
        </View>
      </View>

      {/* Invite button */}
      <AppButton
        title="Generate Invite Code"
        onPress={handleInvite}
        variant="secondary"
        icon={<Icon name="link-outline" size={20} color="#fff" />}
      />

      {/* Active patients */}
      <Text style={styles.sectionTitle}>Linked Patients</Text>
      {activeLinks.length === 0 ? (
        <AppCard>
          <View style={styles.emptyRow}>
            <Icon name="people-outline" size={24} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>
              No linked patients yet. Generate an invite code and share it with your patient.
            </Text>
          </View>
        </AppCard>
      ) : (
        activeLinks.map((link) => (
          <AppCard
            key={link.id}
            style={styles.linkCard}
            icon={<Icon name="person-circle-outline" size={28} color={colors.secondary[500]} />}
            title={link.patient?.displayName || 'Patient'}
            subtitle={link.patient?.email || ''}
            rightElement={<StatusChip label="Active" variant="success" />}
          >
            <View />
          </AppCard>
        ))
      )}

      {/* Pending */}
      {pendingLinks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending Invites</Text>
          {pendingLinks.map((link) => (
            <AppCard
              key={link.id}
              style={styles.linkCard}
              icon={<Icon name="hourglass-outline" size={24} color={colors.warning.main} />}
              title={`Code: ${link.inviteCode}`}
              subtitle="Waiting for patient to accept"
              rightElement={<StatusChip label="Pending" variant="warning" />}
            >
              <View />
            </AppCard>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: { fontSize: typography.size.lg, color: colors.neutral[500] },
  name: { fontSize: typography.size['2xl'], fontWeight: '700', color: colors.neutral[900] },
  logoutBtn: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: { fontSize: typography.size['3xl'], fontWeight: '700' },
  statLabel: { fontSize: typography.size.xs, color: colors.neutral[500], marginTop: spacing.xs },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
    marginTop: spacing['2xl'],
  },
  linkCard: { marginBottom: spacing.md },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: typography.size.sm, color: colors.neutral[500], flex: 1 },
});
