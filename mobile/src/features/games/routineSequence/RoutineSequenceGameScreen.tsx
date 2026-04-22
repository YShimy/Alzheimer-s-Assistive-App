/**
 * Routine Sequence Builder — Main Game Screen
 *
 * Orchestrates the full game lifecycle:
 *   intro -> study -> test -> feedback -> level_success -> (next level or session_summary)
 *
 * KEY FIXES:
 * 1. advanceAfterLevel() drives multi-level flow — session does not end after 1 level.
 * 2. Feedback phase shows correct step and resumes gently — no harsh failure screen.
 * 3. patientId from session/auth context is passed to startSession.
 * 4. Study phase uses ScrollView so 5-6 step lists don't overflow.
 * 5. Choice buttons use stable choices from store.currentStepChoices.
 * 6. Tier advancement indicator shown between levels.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radius,
} from '../../../infrastructure/theme/tokens';
import { eventLogger } from '../../../infrastructure/events/eventLogger';
import { EventNames } from '../../../infrastructure/events/eventNames';
import { useRoutineSequenceStore } from './store';
import { routineSequenceApi } from './api';
import type { SessionResult } from './engine/types';
import { useSessionStore } from '../../../state/sessionStore';

const LEVELS_PER_SESSION = 3;

export default function RoutineSequenceGameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const store = useRoutineSequenceStore();

  // Get patientId from session (falls back gracefully)
  const session = useSessionStore?.getState?.() as any;
  const patientId: string = session?.user?.id ?? '';

  const [sessionResult, setSessionResult] = useState<SessionResult | null>(
    null,
  );
  const [answerTimeRef] = useState(() => ({ current: Date.now() }));
  const [isSaving, setIsSaving] = useState(false);
  const [advancementMessage, setAdvancementMessage] = useState<string | null>(
    null,
  );

  // ─── Fallback: if phase becomes session_summary without a saved result
  // (e.g. user quit early), call endSession() in an effect — NEVER during render.
  useEffect(() => {
    if (store.phase === 'session_summary' && !sessionResult) {
      const result = store.endSession();
      setSessionResult(result);
    }
  }, [store.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Session Start ──────────────────────────────────────
  useEffect(() => {
    store.startSession(patientId);
    eventLogger.log({
      eventName: EventNames.GAME_OPENED,
      screenName: 'RoutineSequenceGameScreen',
      payload: { gameType: 'routine_sequence' },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Start Level ─────────────────────────────────────────
  const handleStartLevel = () => {
    eventLogger.log({
      eventName: EventNames.GAME_SESSION_STARTED,
      screenName: 'RoutineSequenceGameScreen',
      payload: {
        gameType: 'routine_sequence',
        tier: store.currentTier.tier,
        levelIndex: store.levelIndex,
      },
    });
    setAdvancementMessage(null);
    store.startLevel();
  };

  // ─── Study Phase ─────────────────────────────────────────
  const handleStudyComplete = () => {
    eventLogger.log({
      eventName: 'routine_sequence_study_viewed',
      screenName: 'RoutineSequenceGameScreen',
      payload: { gameType: 'routine_sequence', tier: store.currentTier.tier },
    });
    store.completeStudyPhase();
    answerTimeRef.current = Date.now();
  };

  // ─── Test Phase ──────────────────────────────────────────
  const handleStepAnswer = (stepId: string) => {
    const timeMs = Date.now() - answerTimeRef.current;
    const result = store.submitStepAnswer(stepId, timeMs);

    eventLogger.log({
      eventName: 'routine_sequence_step_answered',
      screenName: 'RoutineSequenceGameScreen',
      payload: {
        gameType: 'routine_sequence',
        correct: result.correct,
        stepIndex: store.testPhaseIndex,
      },
    });

    if (!result.showPrompt) {
      answerTimeRef.current = Date.now();
    }
  };

  const handlePromptAcknowledge = () => {
    eventLogger.log({
      eventName: 'routine_sequence_prompt_shown',
      screenName: 'RoutineSequenceGameScreen',
      payload: { gameType: 'routine_sequence', tier: store.currentTier.tier },
    });
    store.acknowledgePrompt();
    answerTimeRef.current = Date.now();
  };

  // ─── Level Complete → Advance or End Session ───────────
  const handleAdvanceAfterLevel = async () => {
    const result = store.advanceAfterLevel();

    if (result) {
      // Session is done — save and show summary
      setIsSaving(true);
      try {
        await routineSequenceApi.saveGameSession(patientId, result);
      } catch (err) {
        console.error('[RoutineSequenceGame] Failed to save game session:', err);
      } finally {
        setIsSaving(false);
      }

      setSessionResult(result);

      eventLogger.log({
        eventName: EventNames.GAME_COMPLETED,
        screenName: 'RoutineSequenceGameScreen',
        payload: {
          gameType: 'routine_sequence',
          totalScore: result.totalScore,
          highestTier: result.highestTierReached,
          levelsPlayed: result.routinesAttempted,
        },
      });
    } else {
      // More levels to play — store phase was set to 'intro' (between-level)
      // Show a brief advancement message
      const levelJustCompleted = store.levelIndex; // already incremented by advanceAfterLevel
      const msg =
        levelJustCompleted < LEVELS_PER_SESSION
          ? `Level ${levelJustCompleted} of ${LEVELS_PER_SESSION} done! Keep going.`
          : null;
      setAdvancementMessage(msg);
    }
  };

  // ─── Render Helpers ─────────────────────────────────────
  const getTierLabel = (tier: number) => {
    const labels: Record<number, string> = {
      1: 'Beginner',
      2: 'Getting Started',
      3: 'Building Up',
      4: 'Intermediate',
      5: 'Advanced',
      6: 'Expert',
      7: 'Master',
    };
    return labels[tier] ?? `Tier ${tier}`;
  };

  // ─── Phase: Intro / Between-Levels ──────────────────────
  const renderIntro = () => {
    const isFirstLevel = store.levelIndex === 0;

    return (
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="list-outline" size={48} color={colors.primary[500]} />
        </View>
        <Text style={styles.title}>
          {isFirstLevel
            ? t('games.routineSequence.title')
            : `Level ${store.levelIndex + 1} of ${LEVELS_PER_SESSION}`}
        </Text>

        {/* Tier indicator */}
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>
            Tier {store.currentTier.tier} · {getTierLabel(store.currentTier.tier)}
          </Text>
          {store.supportMode && (
            <Text style={styles.supportBadgeText}>Support Mode</Text>
          )}
        </View>

        {advancementMessage && (
          <View style={styles.advancementBox}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.success.main}
            />
            <Text style={styles.advancementText}>{advancementMessage}</Text>
          </View>
        )}

        {isFirstLevel && (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>How to Play</Text>
            <Text style={styles.instructionsText}>
              1. Study the routine steps shown{'\n'}
              2. Remember the correct order{'\n'}
              3. Select the next step when asked{'\n'}
              4. Build the complete routine
            </Text>
          </View>
        )}

        <Pressable style={styles.primaryButton} onPress={handleStartLevel}>
          <Text style={styles.primaryButtonText}>
            {isFirstLevel ? 'Start Session' : 'Next Routine'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.quitButton}
          onPress={() => {
            const result = store.endSession();
            setSessionResult(result);
          }}
        >
          <Text style={styles.quitButtonText}>End Session Early</Text>
        </Pressable>
      </ScrollView>
    );
  };

  // ─── Phase: Study ──────────────────────────────────────
  const renderStudy = () => {
    if (!store.currentRoutine) return null;

    return (
      <View style={styles.container}>
        <Text style={styles.phaseTitle}>Study the Routine</Text>
        <Text style={styles.routineTitle}>{store.currentRoutine.title}</Text>

        <ScrollView
          style={styles.stepsScrollView}
          contentContainerStyle={styles.stepsContainer}
          showsVerticalScrollIndicator={false}
        >
          {store.currentRoutine.steps.map((step, index) => (
            <View key={step.stepId} style={styles.studyStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepLabel}>{step.label}</Text>
                {store.currentTier?.showHints && step.hint && (
                  <Text style={styles.stepHint}>{step.hint}</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <Pressable style={styles.primaryButton} onPress={handleStudyComplete}>
          <Text style={styles.primaryButtonText}>I Remember This</Text>
        </Pressable>
      </View>
    );
  };

  // ─── Phase: Test ───────────────────────────────────────
  const renderTest = () => {
    const currentStep = store.getCurrentStep();
    const progress = store.getLevelProgress();
    // Use stable choices from store — not re-generated here
    const choices = store.currentStepChoices;

    if (!currentStep || !store.currentRoutine) return null;

    // Determine question phrasing based on tier mode
    const isRecognition = store.currentTier.mode === 'recognition';
    const questionText = isRecognition
      ? `What comes first in "${store.currentRoutine.title}"?`
      : `What is step ${progress.current} of "${store.currentRoutine.title}"?`;

    return (
      <View style={styles.container}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(progress.current / progress.total) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Step {progress.current} of {progress.total}
        </Text>

        <Text style={styles.questionText}>{questionText}</Text>

        <View style={styles.choicesContainer}>
          {choices.map((stepId) => {
            const step = store.currentRoutine!.steps.find(
              (s) => s.stepId === stepId,
            );
            // Also check distractor steps
            const distractorStep = store.distractorSteps.find(
              (s) => s.stepId === stepId,
            );
            const label = step?.label ?? distractorStep?.label ?? stepId;

            return (
              <Pressable
                key={stepId}
                style={({ pressed }) => [
                  styles.choiceButton,
                  pressed && styles.choiceButtonPressed,
                ]}
                onPress={() => handleStepAnswer(stepId)}
              >
                <Text style={styles.choiceText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {store.currentTier?.showHints && (
          <Text style={styles.hintText}>
            Tip: {currentStep.hint || 'Choose the correct next step'}
          </Text>
        )}
      </View>
    );
  };

  // ─── Phase: Feedback (wrong answer support) ───────────
  const renderFeedback = () => {
    // Show the correct step label for the current position
    const correctStep = store.currentRoutine?.steps[store.testPhaseIndex];

    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="information-circle-outline"
          size={64}
          color={colors.warning.main}
        />
        <Text style={styles.feedbackTitle}>Not quite!</Text>
        <Text style={styles.feedbackText}>
          That's okay — let's look at the correct step.
        </Text>
        {correctStep && (
          <View style={styles.correctStepBox}>
            <Text style={styles.correctStepLabel}>Correct answer:</Text>
            <Text style={styles.correctStepText}>{correctStep.label}</Text>
            {correctStep.hint && (
              <Text style={styles.correctStepHint}>{correctStep.hint}</Text>
            )}
          </View>
        )}
        <Pressable
          style={styles.secondaryButton}
          onPress={handlePromptAcknowledge}
        >
          <Text style={styles.secondaryButtonText}>Got it, Continue</Text>
        </Pressable>
      </View>
    );
  };

  // ─── Phase: Level Success ──────────────────────────────
  const renderLevelSuccess = () => {
    const levelNumber = store.levelIndex + 1; // +1 because we haven't incremented yet
    const isLastLevel = levelNumber >= LEVELS_PER_SESSION;

    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="checkmark-circle-outline"
          size={64}
          color={colors.success.main}
        />
        <Text style={styles.successTitle}>Well Done!</Text>
        <Text style={styles.successText}>
          {store.supportMode
            ? 'You completed the routine with some support. Great effort!'
            : 'You completed the routine successfully.'}
        </Text>

        {isSaving ? (
          <ActivityIndicator
            color={colors.primary[500]}
            style={{ marginTop: spacing.lg }}
          />
        ) : (
          <Pressable
            style={styles.primaryButton}
            onPress={handleAdvanceAfterLevel}
          >
            <Text style={styles.primaryButtonText}>
              {isLastLevel ? 'See Results' : 'Next Level'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  // ─── Phase: Session Summary ────────────────────────────
  const renderSessionSummary = () => {
    // sessionResult is guaranteed to be set by the useEffect above
    // before this phase renders. Show a spinner while we wait.
    if (!sessionResult) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary[500]} />
        </View>
      );
    }

    const result = sessionResult;

    return (
      <ScrollView contentContainerStyle={styles.summaryContent}>
        <Text style={styles.summaryTitle}>Session Complete</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{result.totalScore}</Text>
            <Text style={styles.statLabel}>Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{result.highestTierReached}</Text>
            <Text style={styles.statLabel}>Tier Reached</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {Math.round(result.averageAccuracy * 100)}%
            </Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.summaryDetailRow}>
          <View style={styles.summaryDetailItem}>
            <Text style={styles.summaryDetailValue}>
              {result.routinesCompleted}
            </Text>
            <Text style={styles.summaryDetailLabel}>
              / {result.routinesAttempted} Completed
            </Text>
          </View>
          <View style={styles.summaryDetailItem}>
            <Text style={styles.summaryDetailValue}>
              {Math.round(result.durationSeconds / 60)}
            </Text>
            <Text style={styles.summaryDetailLabel}>Minutes</Text>
          </View>
          <View style={styles.summaryDetailItem}>
            <Text style={styles.summaryDetailValue}>
              {result.averagePromptsUsed.toFixed(1)}
            </Text>
            <Text style={styles.summaryDetailLabel}>Avg Prompts</Text>
          </View>
        </View>

        <View style={styles.summaryMessage}>
          <Text style={styles.summaryMessageText}>
            {result.averageAccuracy >= 0.9
              ? "Outstanding! You're building strong routine memory."
              : result.averageAccuracy >= 0.7
              ? "Good work! Consistent practice makes perfect."
              : "Every attempt counts. You'll improve with each session."}
          </Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(patient)/games' as any)}
        >
          <Text style={styles.primaryButtonText}>Back to Games</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, { marginTop: spacing.md }]}
          onPress={() => {
            setSessionResult(null);
            store.startSession(patientId);
          }}
        >
          <Text style={styles.secondaryButtonText}>Play Again</Text>
        </Pressable>
      </ScrollView>
    );
  };

  // ─── Main Render ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      {store.phase === 'intro' && renderIntro()}
      {store.phase === 'study' && renderStudy()}
      {store.phase === 'test' && renderTest()}
      {store.phase === 'feedback' && renderFeedback()}
      {store.phase === 'level_success' && renderLevelSuccess()}
      {store.phase === 'session_summary' && renderSessionSummary()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryContent: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[800],
    textAlign: 'center',
  },
  tierBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary[200],
    alignItems: 'center',
  },
  tierBadgeText: {
    fontSize: typography.size.sm,
    color: colors.primary[700],
    fontWeight: '600',
  },
  supportBadgeText: {
    fontSize: typography.size.xs,
    color: colors.warning.main,
    marginTop: 2,
  },
  advancementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success.light,
    padding: spacing.md,
    borderRadius: radius.md,
    width: '100%',
  },
  advancementText: {
    fontSize: typography.size.sm,
    color: colors.success.dark,
    fontWeight: '500',
    flex: 1,
  },
  instructionsBox: {
    backgroundColor: colors.neutral[100],
    padding: spacing.lg,
    borderRadius: radius.lg,
    width: '100%',
  },
  instructionsTitle: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: typography.size.base,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.neutral[200],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.neutral[700],
    fontSize: typography.size.base,
    fontWeight: '600',
  },
  quitButton: {
    paddingVertical: spacing.sm,
  },
  quitButtonText: {
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textDecorationLine: 'underline',
  },
  // Study phase
  phaseTitle: {
    fontSize: typography.size.xl,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  routineTitle: {
    fontSize: typography.size.lg,
    color: colors.primary[600],
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  stepsScrollView: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  stepsContainer: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  studyStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: radius.md,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  stepNumberText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: typography.size.sm,
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: typography.size.base,
    fontWeight: '500',
    color: colors.neutral[800],
  },
  stepHint: {
    fontSize: typography.size.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  // Test phase
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: radius.sm,
  },
  progressText: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  questionText: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  choicesContainer: {
    gap: spacing.md,
    flex: 1,
  },
  choiceButton: {
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    alignItems: 'center',
  },
  choiceButtonPressed: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[300],
  },
  choiceText: {
    fontSize: typography.size.base,
    color: colors.neutral[700],
    fontWeight: '500',
    textAlign: 'center',
  },
  hintText: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
  // Feedback phase
  feedbackTitle: {
    fontSize: typography.size.xl,
    fontWeight: '600',
    color: colors.neutral[800],
    textAlign: 'center',
  },
  feedbackText: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  correctStepBox: {
    backgroundColor: colors.primary[50],
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[400],
    width: '100%',
    gap: spacing.xs,
  },
  correctStepLabel: {
    fontSize: typography.size.xs,
    color: colors.primary[600],
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  correctStepText: {
    fontSize: typography.size.base,
    color: colors.neutral[800],
    fontWeight: '600',
  },
  correctStepHint: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    fontStyle: 'italic',
  },
  // Level success
  successTitle: {
    fontSize: typography.size.xl,
    fontWeight: '600',
    color: colors.success.dark,
    textAlign: 'center',
  },
  successText: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  // Summary
  summaryTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[800],
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.primary[500],
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  summaryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  summaryDetailItem: {
    alignItems: 'center',
  },
  summaryDetailValue: {
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.neutral[700],
  },
  summaryDetailLabel: {
    fontSize: typography.size.xs,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  summaryMessage: {
    backgroundColor: colors.neutral[100],
    padding: spacing.lg,
    borderRadius: radius.lg,
    width: '100%',
  },
  summaryMessageText: {
    fontSize: typography.size.sm,
    color: colors.neutral[700],
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
