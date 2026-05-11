import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography } from '@/src/infrastructure/theme/tokens';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';

/**
 * Caregiver tab layout — bottom navigation with 4 tabs.
 * Uses sage green accent for caregiver experience.
 */
export default function CaregiverLayout() {
  const { t } = useTranslation();

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
        tabBarActiveTintColor: colors.secondary[500],
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
          title: t('caregiverTabs.dashboardTitle'),
          headerTitle: t('caregiverTabs.dashboardHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: t('caregiverTabs.patientsTitle'),
          headerTitle: t('caregiverTabs.patientsHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-reminders"
        options={{
          title: t('caregiverTabs.remindersTitle'),
          headerTitle: t('caregiverTabs.remindersHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alarm-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-checklists"
        options={{
          title: t('caregiverTabs.checklistsTitle'),
          headerTitle: t('caregiverTabs.checklistsHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('caregiverTabs.progressTitle'),
          headerTitle: t('caregiverTabs.progressHeader'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: t('caregiverTabs.contactsTitle', 'Contacts'),
          headerTitle: t('caregiverTabs.contactsHeader', 'Patient Contacts'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-circle-outline" size={size} color={color} />
          ),
          href: {
            pathname: '/(caregiver)/contacts',
            params: {},
          },
        }}
      />
      {/* Records screens — hidden from tab bar, navigated to programmatically */}
      <Tabs.Screen name="records" options={{ href: null }} />
      <Tabs.Screen name="records/index" options={{ href: null }} />
      <Tabs.Screen name="records/upload" options={{ href: null }} />
      {/* Important Information — hidden from tab bar */}
      <Tabs.Screen name="important-info" options={{ href: null }} />
      {/* Export Summary PDF — hidden from tab bar */}
      <Tabs.Screen name="export-summary" options={{ href: null }} />
      {/* Manage SR Items — hidden from tab bar */}
      <Tabs.Screen name="manage-sr-items" options={{ href: null }} />
    </Tabs>
  );
}
