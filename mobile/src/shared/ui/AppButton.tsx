import { Pressable, Text, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native';
import { colors, typography, spacing, radius, shadows, layout } from '../../infrastructure/theme/tokens';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = true,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary[500] : '#fff'}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              textSizeStyles[size],
              textVariantStyles[variant],
              icon ? { marginLeft: spacing.sm } : undefined,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    minHeight: layout.minTapTarget,
    ...shadows.sm,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  fullWidth: { width: '100%' },
  text: {
    fontWeight: '600',
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 40 },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: layout.buttonHeight },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'], minHeight: 56 },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary[500] },
  secondary: { backgroundColor: colors.secondary[500] },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary[500] },
  ghost: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
  danger: { backgroundColor: colors.error.main },
});

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: typography.size.sm },
  md: { fontSize: typography.size.base },
  lg: { fontSize: typography.size.lg },
});

const textVariantStyles = StyleSheet.create({
  primary: { color: '#FFFFFF' },
  secondary: { color: '#FFFFFF' },
  outline: { color: colors.primary[500] },
  ghost: { color: colors.primary[500] },
  danger: { color: '#FFFFFF' },
});
