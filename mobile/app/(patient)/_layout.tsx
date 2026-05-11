import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography } from '@/src/infrastructure/theme/tokens';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';
import { useEffect } from 'react';
import { notifications } from '@/src/infrastructure/notifications/notifications';

/**
 * Patient tab layout — bottom navigation with 5 tabs.
 * Uses calming blue accent for patient experience.
 */
export default function PatientLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    notifications.requestPermission().catch(() => {
      // Silence permission request errors
    });
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '600', color: colors.neutral[800] },
        headerShadowVisible: false,
        headerRight: () => <LanguageToggleButton />,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.neutral[100],
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarLabelStyle: {
          fontSize: typography.size.xs,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('patientTabs.homeTitle'),
          headerTitle: t('patientTabs.homeHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-reminders"
        options={{
          title: t('patientTabs.remindersTitle'),
          headerTitle: t('patientTabs.remindersHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alarm-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: t('patientTabs.gamesTitle'),
          headerTitle: t('patientTabs.gamesHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('patientTabs.progressTitle'),
          headerTitle: t('patientTabs.progressHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: t('patientTabs.checklistsTitle'),
          headerTitle: t('patientTabs.checklistsHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts/index"
        options={{
          title: t('contacts.title', 'Contacts'),
          headerTitle: t('contacts.title', 'Important People'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden screens from the tab bar */}
      <Tabs.Screen
        name="contacts/import"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="contacts/consent"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="contacts/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="memory-match-game"
        options={{
          href: null,
          headerTitle: 'Memory Match',
        }}
      />
      <Tabs.Screen
        name="orientation-practice"
        options={{
          href: null,
          headerTitle: 'Orientation Practice',
        }}
      />
      <Tabs.Screen
        name="routine-sequence-game"
        options={{
          href: null,
          headerTitle: 'Routine Sequence',
        }}
      />
      <Tabs.Screen
        name="safe-path-game"
        options={{
          href: null,
          headerTitle: 'Safe Path',
        }}
      />
      <Tabs.Screen
        name="manage-reminders"
        options={{
          href: null,
          headerTitle: t('caregiverReminders.manageReminders', 'Manage Reminders'), // Fallback to english string
        }}
      />
      <Tabs.Screen
        name="manage-checklists"
        options={{
          href: null,
          headerTitle: t('caregiverChecklists.manageChecklists', 'Manage Checklists'),
        }}
      />
      {/* Important Information — read-only patient view */}
      <Tabs.Screen
        name="important-info"
        options={{
          href: null,
          headerTitle: t('importantInfo.title', 'Important Information'),
        }}
      />
    </Tabs>
  );
}
