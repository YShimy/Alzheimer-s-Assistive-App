/**
 * Patient Games Tab — Entry point to cognitive games.
 * Lists available games and links to the Safe Path Memory game.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, AppCard, Icon } from '@/src/shared/ui';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

export default function GamesScreen() {
  const router = useRouter();

  const handleOpenSafePath = () => {
    eventLogger.log({
      eventName: EventNames.GAME_OPENED,
      screenName: 'GamesScreen',
      payload: { gameType: 'safe_path_memory' },
    });
    router.push('/(patient)/safe-path-game' as any);
  };

  return (
    <ScreenContainer>
      <Text style={styles.sectionTitle}>Cognitive Games</Text>
      <Text style={styles.sectionSubtitle}>
        Light exercises to keep your mind active. Play at your own pace.
      </Text>

      <Pressable onPress={handleOpenSafePath} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <AppCard style={styles.gameCard}>
          <View style={styles.gameCardContent}>
            <View style={styles.gameIconContainer}>
              <Ionicons name="map-outline" size={32} color={colors.primary[500]} />
            </View>
            <View style={styles.gameCardText}>
              <Text style={styles.gameTitle}>Safe Path Memory</Text>
              <Text style={styles.gameDescription}>
                Memorize danger spots and trace a safe path to the goal. Levels get progressively harder.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.neutral[400]} />
          </View>

          <View style={styles.gameTags}>
            <Tag label="Memory" color={colors.primary[500]} />
            <Tag label="Spatial" color={colors.secondary[500]} />
            <Tag label="Adaptive" color={colors.warning.main} />
          </View>
        </AppCard>
      </Pressable>

      <View style={styles.comingSoon}>
        <Ionicons name="add-circle-outline" size={24} color={colors.neutral[300]} />
        <Text style={styles.comingSoonText}>More games coming soon</Text>
      </View>
    </ScreenContainer>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + '15' }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  gameCard: {
    marginBottom: spacing.lg,
  },
  gameCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  gameIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCardText: {
    flex: 1,
  },
  gameTitle: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    lineHeight: 20,
  },
  gameTags: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  tagText: {
    fontSize: typography.size.xs,
    fontWeight: '600',
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  comingSoonText: {
    fontSize: typography.size.sm,
    color: colors.neutral[400],
  },
});
