/**
 * Safe Path Memory — Level Feedback Overlay
 *
 * Shows after level success or failure, and the final session summary.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.success.light }]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success.main} />
        </View>
        <Text style={styles.title}>Level Complete</Text>
        <Text style={styles.subtitle}>Great memory! You found the safe path.</Text>

        <View style={styles.statsRow}>
          <StatChip label="Score" value={`+${levelResult.scoreDelta}`} color={colors.primary[500]} />
          <StatChip label="Time" value={`${(levelResult.solveTimeMs / 1000).toFixed(1)}s`} color={colors.neutral[600]} />
          {streak > 1 && <StatChip label="Streak" value={`${streak}`} color={colors.warning.main} />}
        </View>

        <Text style={styles.totalScore}>Total: {totalScore}</Text>

        <AppButton title="Next Level" onPress={onContinue} variant="primary" size="lg" />
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
  const isGameOver = lives <= 0;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.error.light }]}>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
        </View>
        <Text style={styles.title}>{isGameOver ? 'Session Over' : 'Oops!'}</Text>
        <Text style={styles.subtitle}>
          {isGameOver
            ? 'No lives remaining. Good effort!'
            : 'You stepped on a danger tile. Be more careful next time.'}
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
            <Text style={styles.livesText}>{lives} {lives === 1 ? 'life' : 'lives'} left</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          {!isGameOver && (
            <AppButton title="Try Next Level" onPress={onContinue} variant="primary" size="lg" />
          )}
          <AppButton
            title={isGameOver ? 'View Summary' : 'End Session'}
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
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary[50] }]}>
          <Ionicons name="trophy" size={48} color={colors.primary[500]} />
        </View>
        <Text style={styles.title}>Session Summary</Text>

        <View style={styles.summaryGrid}>
          <SummaryItem icon="star-outline" label="Total Score" value={result.totalScore.toString()} />
          <SummaryItem icon="layers-outline" label="Highest Tier" value={`T${result.highestTierReached}`} />
          <SummaryItem icon="checkmark-circle-outline" label="Levels Passed" value={result.levelsSucceeded.toString()} />
          <SummaryItem icon="close-circle-outline" label="Levels Failed" value={result.levelsFailed.toString()} />
          <SummaryItem icon="time-outline" label="Duration" value={formatDuration(result.durationSeconds)} />
          <SummaryItem icon="flame-outline" label="Best Streak" value={result.longestStreak.toString()} />
        </View>

        {result.bestLevelScore > 0 && (
          <View style={styles.highlightBox}>
            <Ionicons name="ribbon-outline" size={18} color={colors.primary[500]} />
            <Text style={styles.highlightText}>
              Best level score: {result.bestLevelScore}
            </Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          <AppButton title="Play Again" onPress={onPlayAgain} variant="primary" size="lg" />
          <AppButton title="Exit" onPress={onExit} variant="outline" size="md" />
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
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.neutral[100] }]}>
          <Ionicons name="pause-circle" size={48} color={colors.neutral[500]} />
        </View>
        <Text style={styles.title}>Paused</Text>

        <View style={styles.buttonGroup}>
          <AppButton title="Resume" onPress={onResume} variant="primary" size="lg" />
          <AppButton title="How to Play" onPress={onHelp} variant="outline" size="md" />
          <AppButton title="Quit Session" onPress={onQuit} variant="ghost" size="md" />
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
