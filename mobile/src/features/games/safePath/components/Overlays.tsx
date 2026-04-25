/**
 * Safe Path Memory — Level Feedback Overlay
 *
 * Shows after level success or failure, and the final session summary.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius, shadows } from '../../../../infrastructure/theme/tokens';
import { AppButton } from '../../../../shared/ui';
import type { LevelResult, SessionResult } from '../engine/types';

// ─── Level Success Feedback ────────────────────────────────

interface LevelSuccessProps {
  levelResult: LevelResult;
  totalScore: number;
  streak: number;
  onContinue: () => void;
}

export function LevelSuccessFeedback({ levelResult, totalScore, streak, onContinue }: LevelSuccessProps) {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.success.light }]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success.main} />
        </View>
        <Text style={styles.title}>{t('games.safePath.levelCompleteTitle')}</Text>
        <Text style={styles.subtitle}>{t('games.safePath.levelCompleteSub')}</Text>

        <View style={styles.statsRow}>
          <StatChip label={t('games.safePath.scoreLabel')} value={`+${Intl.NumberFormat(i18n.language).format(levelResult.scoreDelta)}`} color={colors.primary[500]} />
          <StatChip label={t('games.safePath.timeLabel')} value={`${Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(levelResult.solveTimeMs / 1000)}s`} color={colors.neutral[600]} />
          {streak > 1 && <StatChip label={t('games.safePath.streakLabel')} value={`${Intl.NumberFormat(i18n.language).format(streak)}`} color={colors.warning.main} />}
        </View>

        <Text style={styles.totalScore}>{t('games.safePath.totalScoreLabel', { score: Intl.NumberFormat(i18n.language).format(totalScore) })}</Text>

        <AppButton title={t('games.safePath.nextLevelBtn')} onPress={onContinue} variant="primary" size="lg" />
      </View>
    </View>
  );
}

// ─── Level Fail Feedback ────────────────────────────────────

interface LevelFailProps {
  lives: number;
  onContinue: () => void;
  onEndSession: () => void;
}

export function LevelFailFeedback({ lives, onContinue, onEndSession }: LevelFailProps) {
  const { t, i18n } = useTranslation();
  const isGameOver = lives <= 0;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.error.light }]}>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
        </View>
        <Text style={styles.title}>{isGameOver ? t('games.safePath.sessionOverTitle') : t('games.safePath.oopsTitle')}</Text>
        <Text style={styles.subtitle}>
          {isGameOver
            ? t('games.safePath.noLivesRemainingSub')
            : t('games.safePath.steppedBombSub')}
        </Text>

        {!isGameOver && (
          <View style={styles.livesIndicator}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < lives ? 'heart' : 'heart-outline'}
                size={24}
                color={i < lives ? colors.error.main : colors.neutral[300]}
              />
            ))}
            <Text style={styles.livesText}>{t('games.safePath.livesLeftCount', { count: Intl.NumberFormat(i18n.language).format(lives) })}</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          {!isGameOver && (
            <AppButton title={t('games.safePath.tryNextLevelBtn')} onPress={onContinue} variant="primary" size="lg" />
          )}
          <AppButton
            title={isGameOver ? t('games.safePath.viewSummaryBtn') : t('games.safePath.endSessionBtn')}
            onPress={onEndSession}
            variant={isGameOver ? 'primary' : 'outline'}
            size="md"
          />
        </View>
      </View>
    </View>
  );
}

// ─── Session Summary ────────────────────────────────────────

interface SessionSummaryProps {
  result: SessionResult;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function SessionSummaryView({ result, onPlayAgain, onExit }: SessionSummaryProps) {
  const { t, i18n } = useTranslation();

  const formatDurationLocal = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const mStr = Intl.NumberFormat(i18n.language).format(m);
    const sStr = Intl.NumberFormat(i18n.language).format(s);
    return m > 0 ? `${mStr}m ${sStr}s` : `${sStr}s`;
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary[50] }]}>
          <Ionicons name="trophy" size={48} color={colors.primary[500]} />
        </View>
        <Text style={styles.title}>{t('games.safePath.sessionSummaryTitle')}</Text>

        <View style={styles.summaryGrid}>
          <SummaryItem icon="star-outline" label={t('games.safePath.totalScore')} value={Intl.NumberFormat(i18n.language).format(result.totalScore)} />
          <SummaryItem icon="layers-outline" label={t('games.safePath.highestTier')} value={`${t('games.safePath.highestTier').substring(0, 1)}${Intl.NumberFormat(i18n.language).format(result.highestTierReached)}`} />
          <SummaryItem icon="checkmark-circle-outline" label={t('games.safePath.levelsPassed')} value={Intl.NumberFormat(i18n.language).format(result.levelsSucceeded)} />
          <SummaryItem icon="close-circle-outline" label={t('games.safePath.levelsFailed')} value={Intl.NumberFormat(i18n.language).format(result.levelsFailed)} />
          <SummaryItem icon="time-outline" label={t('games.safePath.duration')} value={formatDurationLocal(result.durationSeconds)} />
          <SummaryItem icon="flame-outline" label={t('games.safePath.bestStreak')} value={Intl.NumberFormat(i18n.language).format(result.longestStreak)} />
        </View>

        {result.bestLevelScore > 0 && (
          <View style={styles.highlightBox}>
            <Ionicons name="ribbon-outline" size={18} color={colors.primary[500]} />
            <Text style={styles.highlightText}>
              {t('games.safePath.bestLevelScore', { score: Intl.NumberFormat(i18n.language).format(result.bestLevelScore) })}
            </Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          <AppButton title={t('games.safePath.playAgainBtn')} onPress={onPlayAgain} variant="primary" size="lg" />
          <AppButton title={t('games.safePath.exitBtn')} onPress={onExit} variant="outline" size="md" />
        </View>
      </View>
    </View>
  );
}

// ─── Pause Overlay ──────────────────────────────────────────

interface PauseOverlayProps {
  onResume: () => void;
  onHelp: () => void;
  onQuit: () => void;
}

export function PauseOverlay({ onResume, onHelp, onQuit }: PauseOverlayProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.neutral[100] }]}>
          <Ionicons name="pause-circle" size={48} color={colors.neutral[500]} />
        </View>
        <Text style={styles.title}>{t('games.safePath.pausedTitle')}</Text>

        <View style={styles.buttonGroup}>
          <AppButton title={t('games.safePath.resumeBtn')} onPress={onResume} variant="primary" size="lg" />
          <AppButton title={t('games.safePath.howToPlayBtn')} onPress={onHelp} variant="outline" size="md" />
          <AppButton title={t('games.safePath.quitSessionBtn')} onPress={onQuit} variant="ghost" size="md" />
        </View>
      </View>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SummaryItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Ionicons name={icon} size={20} color={colors.primary[500]} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    padding: spacing['2xl'],
    zIndex: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[800],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  statChip: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: typography.size.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.neutral[400],
  },
  totalScore: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  livesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  livesText: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    marginLeft: spacing.sm,
  },
  buttonGroup: {
    gap: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryItem: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.neutral[500],
  },
  summaryValue: {
    fontSize: typography.size.base,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  highlightText: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.primary[700],
  },
});
