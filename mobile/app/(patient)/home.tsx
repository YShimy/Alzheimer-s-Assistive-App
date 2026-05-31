import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
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
  const greeting = getGreeting(now, t);
  const dateString = now.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
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
      Alert.alert(t('common.error'), t('patientHome.errorNoCode', 'Please enter an invite code'));
      return;
    }
    setAccepting(true);
    try {
      await carelinksApi.acceptInvite(inviteCode.trim().toUpperCase());
      Alert.alert(t('common.success', 'Success'), t('patientHome.connectSuccess', 'Successfully linked with your caregiver!'));
      setInviteCode('');
      setShowInviteInput(false);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('patientHome.errorLinkFailed', 'Failed to link with caregiver'));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <ScreenContainer>
      {/* Greeting */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.greeting, { textAlign: isRTL ? 'right' : 'left' }]}>{greeting}</Text>
          <Text style={[styles.name, { textAlign: isRTL ? 'right' : 'left' }]}>{displayName || t('patientHome.defaultName', 'there')}</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn} accessibilityLabel="Log out">
          <Icon name="log-out-outline" size={22} color={colors.on_surface_variant} />
        </Pressable>
      </View>

      {/* Date orientation card */}
      <View style={[styles.dateCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Icon name="calendar-outline" size={24} color={colors.primary.main} />
        <Text style={[styles.dateText, { textAlign: isRTL ? 'right' : 'left' }]}>{dateString}</Text>
      </View>

      {/* Upcoming reminders */}
      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('patientHome.upcomingReminders')}</Text>
      {loading ? (
        <LoadingState message={t('patientHome.loadingReminders')} />
      ) : reminders.length === 0 ? (
        <AppCard>
          <View style={[styles.emptyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Icon name="checkmark-circle-outline" size={24} color={colors.secondary.main} />
            <Text style={[styles.emptyText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('patientHome.noReminders')}</Text>
          </View>
        </AppCard>
      ) : (
        reminders.map((r) => (
          <AppCard
            key={r.id}
            style={styles.reminderCard}
            icon={<Icon name={getCategoryIcon(r.category)} size={22} color={colors.primary_dim} />}
            title={r.title}
            subtitle={`${r.scheduledTime} · ${t('categories.' + r.category) || r.category}`}
            onPress={() => router.push(`/(patient)/my-reminders`)}
          >
            <View />
        </AppCard>
        ))
      )}

      {/* Connect Caregiver */}
      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('patientHome.connectTitle')}</Text>
      {showInviteInput ? (
        <AppCard style={styles.inviteCard}>
          <Text style={[styles.inviteTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('patientHome.linkCaregiver')}</Text>
          <Text style={[styles.inviteText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('patientHome.enterCodeGuide')}</Text>
          <AppInput
            placeholder={t('patientHome.codePlaceholder')}
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            autoCapitalize="characters"
          />
          <View style={[styles.inviteActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <AppButton
              title={t('patientHome.cancel')}
              onPress={() => setShowInviteInput(false)}
              variant="ghost"
              style={{ flex: 1 }}
            />
            <AppButton
              title={t('patientHome.connectBtn')}
              onPress={handleAcceptInvite}
              loading={accepting}
              style={{ flex: 1 }}
            />
          </View>
        </AppCard>
      ) : (
        <AppCard
          icon={<Icon name="people-outline" size={24} color={colors.secondary.main} />}
          title={t('patientHome.connectCardTitle')}
          subtitle={t('patientHome.connectCardSubtitle')}
          onPress={() => setShowInviteInput(true)}
        >
          <View />
        </AppCard>
      )}

      {/* Quick actions */}
      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('patientHome.quickActions')}</Text>
      <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <QuickCard
          icon="alarm-outline"
          title={t('patientHome.reminders')}
          color={colors.primary.main}
          bgColor={colors.primary_container}
          onPress={() => router.push('/(patient)/my-reminders')}
        />
        <QuickCard
          icon="checkbox-outline"
          title={t('patientHome.checklists')}
          color={colors.secondary.main}
          bgColor={colors.secondary_container}
          onPress={() => router.push('/(patient)/checklist')}
        />
        <QuickCard
          icon="bar-chart-outline"
          title={t('patientHome.progress')}
          color={colors.tertiary.main}
          bgColor={colors.tertiary_container}
          onPress={() => router.push('/(patient)/progress')}
        />
        <QuickCard
          icon="people-outline"
          title={t('contacts.title')}
          color={colors.error.main}
          bgColor={colors.error.light}
          onPress={() => router.push('/(patient)/contacts')}
        />
        <QuickCard
          icon="game-controller-outline"
          title={t('patientHome.games', 'Games')}
          color={colors.primary.main}
          bgColor={colors.primary_container}
          onPress={() => router.push('/(patient)/games')}
        />
        <QuickCard
          icon="information-circle-outline"
          title={t('importantInfo.title', 'Important Info')}
          color={colors.secondary.main}
          bgColor={colors.secondary_container}
          onPress={() => router.push('/(patient)/important-info')}
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

function getGreeting(date: Date, t: any): string {
  const hour = date.getHours();
  if (hour < 12) return t('patientHome.goodMorning');
  if (hour < 17) return t('patientHome.goodAfternoon');
  return t('patientHome.goodEvening');
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontFamily: typography.family.title,
    fontSize: typography.size.lg,
    color: colors.on_surface_variant,
  },
  name: {
    fontFamily: typography.family.display,
    fontSize: typography.size['3xl'],
    color: colors.on_surface,
    marginTop: spacing.xs,
  },
  logoutBtn: {
    padding: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface_container_low,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary_container,
    borderRadius: radius.xl,
    padding: spacing.xl, // Breathing room
    marginBottom: spacing['2xl'],
    gap: spacing.md,
  },
  dateText: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_primary_container,
  },
  sectionTitle: {
    fontFamily: typography.family.headline,
    fontSize: typography.size.lg,
    color: colors.on_surface,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  reminderCard: { marginBottom: spacing.md },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    flex: 1,
  },
  inviteCard: { marginBottom: spacing.md },
  inviteTitle: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface,
    marginBottom: spacing.xs,
  },
  inviteText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
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
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickCardText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
  },
});
