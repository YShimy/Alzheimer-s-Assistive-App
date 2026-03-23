import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenContainer, AppCard, AppInput, AppButton, Icon, LoadingState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { useSessionStore } from '@/src/state/sessionStore';
import { useLogout } from '@/src/features/auth/useLogout';
import { remindersApi } from '@/src/features/reminders/api';
import { carelinksApi } from '@/src/features/carelinks/api';
import type { Reminder } from '@/src/features/reminders/types';

/**
 * Patient home — Today / Orientation view.
 * Shows greeting, date, upcoming reminders, and quick-access cards.
 */
export default function PatientHomeScreen() {
  const displayName = useSessionStore((s) => s.displayName);
  const userId = useSessionStore((s) => s.userId);
  const logout = useLogout();
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [accepting, setAccepting] = useState(false);

  const now = new Date();
  const greeting = getGreeting(now);
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    if (!userId) return;
    remindersApi
      .list(userId, { active: 'true' })
      .then(({ reminders: r }) => setReminders(r.slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleLogout = () => {
    logout().catch(console.warn);
  };

  const handleAcceptInvite = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }
    setAccepting(true);
    try {
      await carelinksApi.acceptInvite(inviteCode.trim().toUpperCase());
      Alert.alert('Success', 'Successfully linked with your caregiver!');
      setInviteCode('');
      setShowInviteInput(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to link with caregiver');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <ScreenContainer>
      {/* Greeting */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{displayName || 'there'}</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn} accessibilityLabel="Log out">
          <Icon name="log-out-outline" size={22} color={colors.neutral[500]} />
        </Pressable>
      </View>

      {/* Date orientation card */}
      <View style={styles.dateCard}>
        <Icon name="calendar-outline" size={24} color={colors.primary[500]} />
        <Text style={styles.dateText}>{dateString}</Text>
      </View>

      {/* Upcoming reminders */}
      <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
      {loading ? (
        <LoadingState message="Loading reminders..." />
      ) : reminders.length === 0 ? (
        <AppCard>
          <View style={styles.emptyRow}>
            <Icon name="checkmark-circle-outline" size={24} color={colors.success.main} />
            <Text style={styles.emptyText}>No upcoming reminders. You're all caught up!</Text>
          </View>
        </AppCard>
      ) : (
        reminders.map((r) => (
          <AppCard
            key={r.id}
            style={styles.reminderCard}
            icon={<Icon name={getCategoryIcon(r.category)} size={22} color={colors.primary[500]} />}
            title={r.title}
            subtitle={`${r.scheduledTime} · ${r.category}`}
            onPress={() => {}}
          >
            <View />
        </AppCard>
        ))
      )}

      {/* Connect Caregiver */}
      <Text style={styles.sectionTitle}>Connect</Text>
      {showInviteInput ? (
        <AppCard style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>Link with Caregiver</Text>
          <Text style={styles.inviteText}>Enter the code your caregiver gave you.</Text>
          <AppInput
            placeholder="e.g. A1B2C3"
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            autoCapitalize="characters"
          />
          <View style={styles.inviteActions}>
            <AppButton
              title="Cancel"
              onPress={() => setShowInviteInput(false)}
              variant="ghost"
              style={{ flex: 1 }}
            />
            <AppButton
              title="Connect"
              onPress={handleAcceptInvite}
              loading={accepting}
              style={{ flex: 1 }}
            />
          </View>
        </AppCard>
      ) : (
        <AppCard
          icon={<Icon name="people-outline" size={24} color={colors.secondary[500]} />}
          title="Connect with Caregiver"
          subtitle="Enter a code to share your progress and reminders"
          onPress={() => setShowInviteInput(true)}
        >
          <View />
        </AppCard>
      )}

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        <QuickCard
          icon="alarm-outline"
          title="Reminders"
          color={colors.primary[500]}
          bgColor={colors.primary[50]}
          onPress={() => router.push('/(patient)/my-reminders')}
        />
        <QuickCard
          icon="checkbox-outline"
          title="Checklists"
          color={colors.secondary[500]}
          bgColor={colors.secondary[50]}
          onPress={() => router.push('/(patient)/checklist')}
        />
        <QuickCard
          icon="bar-chart-outline"
          title="Progress"
          color={colors.info.main}
          bgColor={colors.info.light}
          onPress={() => router.push('/(patient)/progress')}
        />
        <QuickCard
          icon="help-circle-outline"
          title="Help"
          color={colors.warning.main}
          bgColor={colors.warning.light}
          onPress={() => {}}
        />
      </View>
    </ScreenContainer>
  );
}

function QuickCard({ icon, title, color, bgColor, onPress }: {
  icon: any; title: string; color: string; bgColor: string; onPress: () => void;
}) {
  return (
    <Pressable style={[styles.quickCard, { backgroundColor: bgColor }]} onPress={onPress} accessibilityRole="button">
      <Icon name={icon} size={28} color={color} />
      <Text style={[styles.quickCardText, { color }]}>{title}</Text>
    </Pressable>
  );
}

function getCategoryIcon(category: string) {
  const map: Record<string, any> = {
    medication: 'medkit-outline',
    appointment: 'calendar-outline',
    task: 'clipboard-outline',
    hydration: 'water-outline',
    meal: 'restaurant-outline',
    call: 'call-outline',
  };
  return map[category] || 'ellipse-outline';
}

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: typography.size.lg,
    color: colors.neutral[500],
  },
  name: {
    fontSize: typography.size['3xl'],
    fontWeight: '700',
    color: colors.neutral[900],
  },
  logoutBtn: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
    gap: spacing.md,
  },
  dateText: {
    fontSize: typography.size.base,
    fontWeight: '500',
    color: colors.primary[700],
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  reminderCard: { marginBottom: spacing.md },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    flex: 1,
  },
  inviteCard: { marginBottom: spacing.md },
  inviteTitle: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.xs,
  },
  inviteText: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    marginBottom: spacing.lg,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickCard: {
    width: '47%',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickCardText: {
    fontSize: typography.size.sm,
    fontWeight: '600',
  },
});
