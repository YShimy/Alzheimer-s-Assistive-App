/**
 * Patient Games Tab — Entry point to cognitive games.
 *
 * Replaced old Safe Path Memory and Routine Sequence with:
 * - Associative Memory Matching (Memory Match)
 * - Spaced Retrieval Orientation Practice (Orientation Practice)
 */
import { View, Text, StyleSheet, Pressable, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, AppCard } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { eventLogger } from '@/src/infrastructure/events/eventLogger';
import { EventNames } from '@/src/infrastructure/events/eventNames';

export default function GamesScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const openMemoryMatch = () => {
    eventLogger.log({
      eventName: EventNames.GAME_OPENED,
      screenName: 'GamesScreen',
      payload: { gameType: 'ASSOCIATIVE_MEMORY_MATCH' },
    });
    router.push('/(patient)/memory-match-game' as any);
  };

  const openOrientationPractice = () => {
    eventLogger.log({
      eventName: EventNames.GAME_OPENED,
      screenName: 'GamesScreen',
      payload: { gameType: 'PERSONAL_ORIENTATION_PRACTICE' },
    });
    router.push('/(patient)/orientation-practice' as any);
  };

  return (
    <ScreenContainer>
      <Text style={styles.sectionTitle}>{t('games.title', 'Cognitive Games')}</Text>
      <Text style={styles.sectionSubtitle}>
        {t('games.subtitle', 'Practice your memory and daily orientation in a supportive way.')}
      </Text>

      {/* Memory Match Card */}
      <Pressable onPress={openMemoryMatch} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <AppCard style={styles.gameCard}>
          <View style={styles.gameCardContent}>
            <View style={[styles.gameIconContainer, { backgroundColor: colors.primary[50] }]}>
              <Ionicons name="grid-outline" size={32} color={colors.primary[500]} />
            </View>
            <View style={styles.gameCardText}>
              <Text style={styles.gameTitle}>{t('memoryMatch.title', 'Memory Match')}</Text>
              <Text style={styles.gameDescription}>
                {t('memoryMatch.subtitle', 'Practice remembering which item belongs with which place.')}
              </Text>
            </View>
            <Ionicons name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"} size={24} color={colors.neutral[400]} />
          </View>

          <View style={styles.gameTags}>
            <Tag label={t('memoryMatch.recommended', '3×/week recommended')} color={colors.primary[500]} />
          </View>
        </AppCard>
      </Pressable>

      {/* My Day & People Card */}
      <Pressable onPress={openOrientationPractice} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <AppCard style={styles.gameCard}>
          <View style={styles.gameCardContent}>
            <View style={[styles.gameIconContainer, { backgroundColor: colors.secondary[50] }]}>
              <Ionicons name="people-outline" size={32} color={colors.secondary[500]} />
            </View>
            <View style={styles.gameCardText}>
              <Text style={styles.gameTitle}>{t('myDayPeople.title', 'My Day & People')}</Text>
              <Text style={styles.gameDescription}>
                {t('myDayPeople.subtitle', 'Practice today\'s information, routines, and familiar people.')}
              </Text>
            </View>
            <Ionicons name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"} size={24} color={colors.neutral[400]} />
          </View>

          <View style={styles.gameTags}>
            <Tag label={t('myDayPeople.recommended', 'Daily practice')} color={colors.secondary[500]} />
          </View>
        </AppCard>
      </Pressable>
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
});
