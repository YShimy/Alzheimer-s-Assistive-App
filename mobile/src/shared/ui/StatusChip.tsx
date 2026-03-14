import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../infrastructure/theme/tokens';

type ChipVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
}

const chipColors: Record<ChipVariant, { bg: string; text: string }> = {
  default: { bg: colors.neutral[100], text: colors.neutral[600] },
  success: { bg: colors.success.light, text: colors.success.dark },
  warning: { bg: colors.warning.light, text: colors.warning.dark },
  error: { bg: colors.error.light, text: colors.error.dark },
  info: { bg: colors.info.light, text: colors.info.dark },
};

export function StatusChip({ label, variant = 'default' }: StatusChipProps) {
  const c = chipColors[variant];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  text: {
    fontSize: typography.size.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
