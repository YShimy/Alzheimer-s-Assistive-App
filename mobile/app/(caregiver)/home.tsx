import { View, Text, StyleSheet, Pressable, Alert, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, AppCard, AppButton, Icon, StatusChip } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useSessionStore } from '@/src/state/sessionStore';
import { useLogout } from '@/src/features/auth/useLogout';
import { carelinksApi } from '@/src/features/carelinks/api';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import type { CareLink } from '@/src/features/carelinks/types';

/**
 * Caregiver home — dashboard with linked patients list and per-patient management.
 */
export default function CaregiverHomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const displayName = useSessionStore((s) => s.displayName);
  const logout = useLogout();
  const { links, setLinks, selectPatient, loaded } = useCaregiverPatientStore();
  const [loading, setLoading] = useState(!loaded);

  useEffect(() => {
    carelinksApi
      .getMyLinks()
      .then(({ careLinks }) => {
        const active = careLinks.filter((l) => l.status === 'active' && l.patientUserId);
        setLinks(active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    try {
      const { careLink } = await carelinksApi.createInvite();
      Alert.alert(
        t('caregiverHome.inviteCodeGenerated'),
        t('caregiverHome.shareCodeMsg', { code: careLink.inviteCode }),
      );
      const { careLinks } = await carelinksApi.getMyLinks();
      const active = careLinks.filter((l) => l.status === 'active' && l.patientUserId);
      setLinks(active);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create invite');
    }
  };

  const handleManagePatient = (link: CareLink) => {
    selectPatient(link.patientUserId!, link.patient?.displayName ?? 'Patient');
    router.push('/(caregiver)/manage-reminders' as any);
  };

  const activeLinks = links.filter((l) => l.status === 'active');
  const pendingLinks = links.filter((l) => l.status === 'pending');

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('caregiverHome.welcomeBack')}</Text>
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
          <Text style={styles.statLabel}>{t('caregiverHome.statsLinked')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warning.light }]}>
          <Text style={[styles.statValue, { color: colors.warning.dark }]}>{pendingLinks.length}</Text>
          <Text style={styles.statLabel}>{t('caregiverHome.statsPending')}</Text>
        </View>
      </View>

      {/* Invite button */}
      <AppButton
        title={t('caregiverHome.generateInvite')}
        onPress={handleInvite}
        variant="secondary"
        icon={<Icon name="link-outline" size={20} color="#fff" />}
      />

      {/* Active patients with manage buttons */}
      <Text style={styles.sectionTitle}>{t('caregiverHome.statsLinked')}</Text>
      {activeLinks.length === 0 ? (
        <AppCard>
          <View style={styles.emptyRow}>
            <Icon name="people-outline" size={24} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>{t('caregiverHome.noLinkedPatients')}</Text>
          </View>
        </AppCard>
      ) : (
        activeLinks.map((link) => (
          <AppCard key={link.id} style={styles.linkCard}>
            <View style={styles.patientRow}>
              <Icon name="person-circle-outline" size={28} color={colors.secondary[500]} />
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{link.patient?.displayName || 'Patient'}</Text>
                <Text style={styles.patientEmail}>{link.patient?.email || ''}</Text>
              </View>
              <StatusChip label={t('caregiverHome.active')} variant="success" />
            </View>

            {/* Per-patient quick-action buttons */}
            <View style={styles.actionRow}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => {
                  selectPatient(link.patientUserId!, link.patient?.displayName ?? 'Patient');
                  router.push('/(caregiver)/manage-reminders' as any);
                }}
              >
                <Icon name="alarm-outline" size={16} color={colors.secondary[600]} />
                <Text style={styles.actionBtnText}>{t('caregiverHome.reminders')}</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => {
                  selectPatient(link.patientUserId!, link.patient?.displayName ?? 'Patient');
                  router.push('/(caregiver)/manage-checklists' as any);
                }}
              >
                <Icon name="clipboard-outline" size={16} color={colors.secondary[600]} />
                <Text style={styles.actionBtnText}>{t('caregiverHome.checklists')}</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => {
                  selectPatient(link.patientUserId!, link.patient?.displayName ?? 'Patient');
                  router.push('/(caregiver)/progress' as any);
                }}
              >
                <Icon name="trending-up-outline" size={16} color={colors.secondary[600]} />
                <Text style={styles.actionBtnText}>{t('caregiverHome.progress')}</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => {
                  selectPatient(link.patientUserId!, link.patient?.displayName ?? 'Patient');
                  router.push('/(caregiver)/contacts' as any);
                }}
              >
                <Icon name="people-circle-outline" size={16} color={colors.secondary[600]} />
                <Text style={styles.actionBtnText}>{t('caregiverHome.contacts')}</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => {
                  selectPatient(link.patientUserId!, link.patient?.displayName ?? 'Patient');
                  router.push('/(caregiver)/manage-sr-items' as any);
                }}
              >
                <Icon name="help-circle-outline" size={16} color={colors.secondary[600]} />
                <Text style={styles.actionBtnText}>{t('caregiverHome.facts', 'Facts')}</Text>
              </Pressable>
            </View>
          </AppCard>
        ))
      )}

      {/* Pending */}
      {pendingLinks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('caregiverHome.statsPending')}</Text>
          {pendingLinks.map((link) => (
            <AppCard key={link.id} style={styles.linkCard}>
              <View style={styles.patientRow}>
                <Icon name="hourglass-outline" size={24} color={colors.warning.main} />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{`Code: ${link.inviteCode}`}</Text>
                  <Text style={styles.patientEmail}>{t('caregiverHome.waitingForPatient')}</Text>
                </View>
                <StatusChip label={t('caregiverHome.pending')} variant="warning" />
              </View>
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
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: typography.size.base, fontWeight: '600', color: colors.neutral[800] },
  patientEmail: { fontSize: typography.size.sm, color: colors.neutral[500] },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.secondary[50],
  },
  actionBtnText: {
    fontSize: typography.size.xs,
    color: colors.secondary[700],
    fontWeight: '600',
  },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: typography.size.sm, color: colors.neutral[500], flex: 1 },
});
