import { View, Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, radius, shadows, typography } from '../../infrastructure/theme/tokens';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function AppCard({
  children,
  style,
  onPress,
  title,
  subtitle,
  icon,
  rightElement,
}: AppCardProps) {
  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? { onPress, accessibilityRole: 'button' as const, style: ({ pressed }: { pressed: boolean }) => [styles.card, pressed && styles.pressed, style] }
    : { style: [styles.card, style] };

  return (
    <Wrapper {...(wrapperProps as any)}>
      {(title || icon) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View style={styles.headerText}>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
          {rightElement}
        </View>
      )}
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.md,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { marginRight: spacing.md },
  headerText: { flex: 1 },
  title: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    marginTop: 2,
  },
});
