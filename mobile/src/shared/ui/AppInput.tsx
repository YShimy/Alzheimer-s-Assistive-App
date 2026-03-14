import { View, TextInput, Text, StyleSheet, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, typography, spacing, radius, layout } from '../../infrastructure/theme/tokens';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function AppInput({ label, error, containerStyle, style, ...rest }: AppInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined, style]}
        placeholderTextColor={colors.neutral[400]}
        accessibilityLabel={label}
        {...rest}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: {
    fontSize: typography.size.sm,
    fontWeight: '500',
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  input: {
    height: layout.inputHeight,
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.lg,
    fontSize: typography.size.base,
    color: colors.neutral[800],
  },
  inputError: {
    borderColor: colors.error.main,
  },
  error: {
    fontSize: typography.size.xs,
    color: colors.error.main,
    marginTop: spacing.xs,
  },
});
