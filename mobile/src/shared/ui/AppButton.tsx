import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

  const renderContent = () => (
    <>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          styles.pressableContent,
          sizeStyles[size],
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'ghost' || variant === 'outline' ? colors.primary.main : '#fff'}
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
    </>
  );

  const containerStyles = [
    styles.baseContainer,
    variantStyles[variant],
    fullWidth && styles.fullWidth,
    style,
  ];

  if (variant === 'primary') {
    return (
      <LinearGradient
        colors={[colors.primary.main, colors.primary_dim]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={containerStyles}
      >
        {renderContent()}
      </LinearGradient>
    );
  }

  return (
    <Pressable style={containerStyles} disabled={isDisabled}>
      {renderContent()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  pressableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.minTapTarget,
    width: '100%',
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
  fullWidth: { width: '100%' },
  text: {
    fontFamily: typography.family.label,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 40 },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: layout.buttonHeight },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'], minHeight: 56 },
});

const variantStyles = StyleSheet.create({
  primary: {
    // Background handled by LinearGradient
    ...shadows.ambient,
  },
  secondary: { 
    backgroundColor: colors.primary_container,
    elevation: 0,
    shadowOpacity: 0,
  },
  outline: { 
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.outline_variant, // No 1px hard lines, ghost border fallback
  },
  ghost: { 
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  danger: { 
    backgroundColor: colors.error.main,
    ...shadows.ambient,
  },
});

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: typography.size.sm },
  md: { fontSize: typography.size.base },
  lg: { fontSize: typography.size.lg },
});

const textVariantStyles = StyleSheet.create({
  primary: { color: colors.on_primary },
  secondary: { color: colors.on_primary_container },
  outline: { color: colors.on_surface },
  ghost: { color: colors.primary.main },
  danger: { color: colors.on_error },
});
