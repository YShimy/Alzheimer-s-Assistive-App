import { SafeAreaView, ScrollView, View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing } from '../../infrastructure/theme/tokens';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  backgroundColor?: string;
  padded?: boolean;
}

export function ScreenContainer({
  children,
  scroll = true,
  style,
  backgroundColor = colors.background,
  padded = true,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            padded && styles.padded,
            styles.scrollContent,
            style,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, padded && styles.padded, style]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1 },
  padded: { padding: spacing['2xl'] },
  scrollContent: { flexGrow: 1 },
});
