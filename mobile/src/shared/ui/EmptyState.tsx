import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../infrastructure/theme/tokens';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={56} color={colors.neutral[300]} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  title: {
    marginTop: spacing.lg,
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[600],
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 20,
  },
  action: { marginTop: spacing.xl },
});
