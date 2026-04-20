/**
 * Routine Sequence Builder — Main Game Screen
 *
 * Orchestrates the full game lifecycle:
 * intro -> study -> test -> feedback -> summary
 *
 * Delegates all game logic to the Zustand store and engine.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../../../infrastructure/theme/tokens';
import { eventLogger } from '../../../infrastructure/events/eventLogger';
import { EventNames } from '../../../infrastructure/events/eventNames';
import { useRoutineSequenceStore } from './store';
import { routineSequenceApi } from './api';
import type { SessionResult } from './engine/types';

export default function RoutineSequenceGameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const store = useRoutineSequenceStore();
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [answerTime, setAnswerTime] = useState<number>(Date.now());
  const [showingPrompt, setShowingPrompt] = useState(false);

  // ─── Session Start ──────────────────────────────────────
  useEffect(() => {
    store.startSession();
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
      payload: { gameType: 'routine_sequence', tier: store.currentTier.tier },
    });
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
    setAnswerTime(Date.now());
  };

  // ─── Test Phase ──────────────────────────────────────────
  const handleStepAnswer = (stepId: string) => {
    const timeMs = Date.now() - answerTime;
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

    if (result.showPrompt) {
      setShowingPrompt(true);
      eventLogger.log({
        eventName: 'routine_sequence_prompt_shown',
        screenName: 'RoutineSequenceGameScreen',
        payload: { gameType: 'routine_sequence' },
      });
    } else {
      setAnswerTime(Date.now());
    }
  };

  const handlePromptAcknowledge = () => {
    store.showPrompt();
    setShowingPrompt(false);
    setAnswerTime(Date.now());
  };

  // ─── Level Complete ────────────────────────────────────
  const handleLevelComplete = async () => {
    store.completeLevel();
    const result = store.endSession();
    setSessionResult(result);

    // Save to backend
    try {
      await routineSequenceApi.saveGameSession('current-user', result);
    } catch (err) {
      console.error('Failed to save game session:', err);
    }

    eventLogger.log({
      eventName: EventNames.GAME_COMPLETED,
      screenName: 'RoutineSequenceGameScreen',
      payload: {
        gameType: 'routine_sequence',
        totalScore: result.totalScore,
        highestTier: result.highestTierReached,
      },
    });
  };

  // ─── Render Phases ─────────────────────────────────────
  const renderIntro = () => (
    <View style={styles.centerContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="list-outline" size={48} color={colors.primary[500]} />
      </View>
      <Text style={styles.title}>{t('games.routineSequence.title')}</Text>
      <Text style={styles.subtitle}>{t('games.routineSequence.description')}</Text>
      
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>How to Play</Text>
        <Text style={styles.instructionsText}>
          1. Study the routine steps shown{'\n'}
          2. Remember the correct order{'\n'}
          3. Select the next step when asked{'\n'}
          4. Build the complete routine
        </Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleStartLevel}>
        <Text style={styles.primaryButtonText}>Start Session</Text>
      </Pressable>
    </View>
  );

  const renderStudy = () => {
    if (!store.currentRoutine) return null;
    
    return (
      <View style={styles.container}>
        <Text style={styles.phaseTitle}>Study the Routine</Text>
        <Text style={styles.routineTitle}>{store.currentRoutine.title}</Text>
        
        <View style={styles.stepsContainer}>
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
        </View>

        <Pressable style={styles.primaryButton} onPress={handleStudyComplete}>
          <Text style={styles.primaryButtonText}>I Remember This</Text>
        </Pressable>
      </View>
    );
  };

  const renderTest = () => {
    const currentStep = store.getCurrentStep();
    const choices = store.getAvailableChoices();
    const progress = store.getLevelProgress();

    if (!currentStep || !store.currentRoutine) return null;

    return (
      <View style={styles.container}>
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${(progress.current / progress.total) * 100}%` }]} 
          />
        </View>
        <Text style={styles.progressText}>
          Step {progress.current} of {progress.total}
        </Text>

        <Text style={styles.questionText}>
          What is step {progress.current} of {store.currentRoutine.title}?
        </Text>

        <View style={styles.choicesContainer}>
          {choices.map((stepId) => {
            const step = store.currentRoutine!.steps.find(s => s.stepId === stepId);
            if (!step) return null;
            
            return (
              <Pressable
                key={stepId}
                style={styles.choiceButton}
                onPress={() => handleStepAnswer(stepId)}
              >
                <Text style={styles.choiceText}>{step.label}</Text>
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

  const renderFeedback = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="help-circle-outline" size={64} color={colors.warning.main} />
      <Text style={styles.feedbackTitle}>Need a hint?</Text>
      <Text style={styles.feedbackText}>
        That's okay! Let's look at the correct order again.
      </Text>
      <Pressable style={styles.secondaryButton} onPress={handlePromptAcknowledge}>
        <Text style={styles.secondaryButtonText}>Show Me</Text>
      </Pressable>
    </View>
  );

  const renderLevelSuccess = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="checkmark-circle-outline" size={64} color={colors.success.main} />
      <Text style={styles.successTitle}>Well Done!</Text>
      <Text style={styles.successText}>
        You completed the routine successfully.
      </Text>
      <Pressable style={styles.primaryButton} onPress={handleLevelComplete}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </Pressable>
    </View>
  );

  const renderSessionSummary = () => {
    if (!sessionResult) return null;
    
    return (
      <View style={styles.container}>
        <Text style={styles.summaryTitle}>Session Complete</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{sessionResult.totalScore}</Text>
            <Text style={styles.statLabel}>Total Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{sessionResult.highestTierReached}</Text>
            <Text style={styles.statLabel}>Highest Tier</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(sessionResult.averageAccuracy * 100)}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        <Pressable 
          style={styles.primaryButton} 
          onPress={() => router.push('/(patient)/games' as any)}
        >
          <Text style={styles.primaryButtonText}>Back to Games</Text>
        </Pressable>
      </View>
    );
  };

  // ─── Main Render ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      {store.phase === 'intro' && renderIntro()}
      {store.phase === 'study' && renderStudy()}
      {store.phase === 'test' && !showingPrompt && renderTest()}
      {store.phase === 'feedback' || (store.phase === 'test' && showingPrompt) ? renderFeedback() : null}
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
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  instructionsBox: {
    backgroundColor: colors.neutral[100],
    padding: spacing.lg,
    borderRadius: radius.lg,
    width: '100%',
    marginBottom: spacing.xl,
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
  stepsContainer: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  studyStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
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
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
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
  },
  choiceButton: {
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    alignItems: 'center',
  },
  choiceText: {
    fontSize: typography.size.base,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  hintText: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
  feedbackTitle: {
    fontSize: typography.size.xl,
    fontWeight: '600',
    color: colors.neutral[800],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  feedbackText: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: typography.size.xl,
    fontWeight: '600',
    color: colors.success.dark,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  summaryTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: radius.lg,
    minWidth: 100,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
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
  },
});
