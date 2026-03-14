import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../infrastructure/theme/tokens';
import { Icon } from './Icon';
import { AppButton } from './AppButton';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name="alert-circle-outline" size={32} color={colors.error.main} />
      </View>
      <Text style={styles.title}>Oops!</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <View style={styles.action}>
          <AppButton
            title="Try Again"
            onPress={onRetry}
            variant="outline"
            size="sm"
            fullWidth={false}
          />
        </View>
      )}
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.lg,
    fontSize: typography.size.xl,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  message: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  action: { marginTop: spacing.xl },
});
