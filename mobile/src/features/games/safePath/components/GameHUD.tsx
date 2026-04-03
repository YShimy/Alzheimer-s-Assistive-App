/**
 * GameHUD — Heads-up display for the game screen.
 * Shows level, score, lives, pause, and help buttons.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../../../infrastructure/theme/tokens';

interface GameHUDProps {
  levelIndex: number;
  tier: number;
  totalScore: number;
  lives: number;
  maxLives: number;
  streak: number;
  onPause: () => void;
  onHelp: () => void;
}

export function GameHUD({
  levelIndex,
  tier,
  totalScore,
  lives,
  maxLives,
  streak,
  onPause,
  onHelp,
}: GameHUDProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.badge}>
          <Ionicons name="layers-outline" size={14} color={colors.primary[500]} />
          <Text style={styles.badgeText}>Lv {levelIndex + 1}</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="speedometer-outline" size={14} color={colors.warning.main} />
          <Text style={styles.badgeText}>T{tier}</Text>
        </View>
      </View>

      <View style={styles.centerSection}>
        <Ionicons name="star-outline" size={16} color={colors.primary[500]} />
        <Text style={styles.scoreText}>{totalScore}</Text>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.livesRow}>
          {Array.from({ length: maxLives }).map((_, i) => (
            <Ionicons
              key={i}
              name={i < lives ? 'heart' : 'heart-outline'}
              size={18}
              color={i < lives ? colors.error.main : colors.neutral[300]}
            />
          ))}
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={onHelp}
            style={styles.iconButton}
            accessibilityLabel="Help"
            accessibilityRole="button"
          >
            <Ionicons name="help-circle-outline" size={22} color={colors.neutral[500]} />
          </Pressable>
          <Pressable
            onPress={onPause}
            style={styles.iconButton}
            accessibilityLabel="Pause"
            accessibilityRole="button"
          >
            <Ionicons name="pause-circle-outline" size={22} color={colors.neutral[500]} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  leftSection: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  scoreText: {
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  livesRow: {
    flexDirection: 'row',
    gap: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    padding: 4,
  },
});
