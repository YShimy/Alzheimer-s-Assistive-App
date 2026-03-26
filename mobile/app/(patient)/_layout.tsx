import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography } from '@/src/infrastructure/theme/tokens';
import { LanguageToggleButton } from '@/src/shared/ui/LanguageToggleButton';

/**
 * Patient tab layout — bottom navigation with 4 tabs.
 * Uses calming blue accent for patient experience.
 */
export default function PatientLayout() {
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
    </Tabs>
  );
}
