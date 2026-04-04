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
  
  // Interactive cards lift via surface_container_lowest, static cards nest into surface_container_low
  const baseBackgroundColor = onPress ? colors.surface_container_lowest : colors.surface_container_low;
  
  const wrapperProps = onPress
    ? { onPress, accessibilityRole: 'button' as const, style: ({ pressed }: { pressed: boolean }) => [styles.card, { backgroundColor: baseBackgroundColor }, pressed && styles.pressed, style] }
    : { style: [styles.card, { backgroundColor: baseBackgroundColor }, style] };

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
    borderRadius: radius.xl, // 1.5rem for main cards based on design specs
    padding: spacing.xl,
    ...shadows.ambient,
    // "Forbid dividers: Do not use lines between list items. Use 16px of vertical padding 
    // and a background shift to separate items." (Handled by removing borderWidth)
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg, // increased breathing room
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { marginRight: spacing.md },
  headerText: { flex: 1 },
  title: {
    fontFamily: typography.family.title,
    fontSize: typography.size.lg,
    color: colors.on_surface,
  },
  subtitle: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    marginTop: 2,
  },
});
