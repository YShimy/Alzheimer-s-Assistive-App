/**
 * Routine Sequence Builder — Game State Manager (Zustand)
 *
 * Manages the full game lifecycle: intro -> study -> test -> feedback -> level_success -> next level -> session_summary.
 *
 * KEY FIXES:
 * 1. Sessions now contain MULTIPLE levels — the game does not end after one level.
 * 2. Advancement history is filtered to same-tier records only so cross-tier
 *    contamination cannot affect the upgrade/stepdown decision.
 * 3. Choice lists are generated once per step (stable), not re-rolled on every render.
 * 4. Prompt count is correctly attributed back to the TestStep that triggered it.
 * 5. patientId is passed in from the store consumer, not hardcoded.
 */
import { create } from 'zustand';
import type {
  GameState,
  GamePhase,
  RoutineTemplate,
  LevelResult,
  SessionResult,
  TestStep,
  LevelRecord,
} from './engine/types';
import {
  getTier,
  decideNextTier,
  getSupportConfig,
} from './engine/difficulty';
import {
  pickRoutine,
  getDistractorSteps,
  DEFAULT_ROUTINES,
} from './engine/routines';
import {
  calculateLevelScore,
  calculateLevelAccuracy,
  countPromptsUsed,
  isLevelSuccess,
  buildSessionResult,
} from './engine/scoring';

// How many levels to play per session before showing summary
const LEVELS_PER_SESSION = 3;

interface RoutineSequenceStore extends GameState {
  // Stable choices for the current test step (re-generated when step changes)
  currentStepChoices: string[];

  // Actions
  startSession: (patientId?: string) => void;
  startLevel: () => void;
  completeStudyPhase: () => void;
  /**
   * Submit an answer for the current step.
   * Returns whether it was correct and whether a support prompt should show.
   */
  submitStepAnswer: (
    stepId: string,
    timeMs: number,
  ) => { correct: boolean; showPrompt: boolean };
  /**
   * Acknowledge the support prompt and continue to the next step.
   * This merges the prompt count into the TestStep that triggered it.
   */
  acknowledgePrompt: () => void;
  /**
   * Called when the player presses Continue on the level_success screen.
   * Advances to the next level or ends the session.
   */
  advanceAfterLevel: () => SessionResult | null;
  endSession: () => SessionResult;
  reset: () => void;

  // Getters
  getCurrentStep: () => import('./engine/types').RoutineStep | null;
  getLevelProgress: () => { current: number; total: number };

  // Internal: patientId stored for API save
  _patientId: string;
}

function buildChoicesForStep(
  routine: RoutineTemplate,
  stepIndex: number,
  choiceCount: number,
  distractorSteps: import('./engine/types').RoutineStep[],
  mode: import('./engine/types').DifficultyTier['mode'],
): string[] {
  const correctStep = routine.steps[stepIndex];
  if (!correctStep) return [];

  const correctChoice = correctStep.stepId;

  let allChoices: string[];
  if (mode === 'reorder_with_distractor') {
    const distractorIds = distractorSteps.map((s) => s.stepId);
    const routineStepIds = routine.steps.map((s) => s.stepId);
    allChoices = [...routineStepIds, ...distractorIds];
  } else {
    allChoices = routine.steps.map((s) => s.stepId);
  }

  // Exclude the correct answer from the pool initially, then add it back controlled
  const distractorPool = allChoices
    .filter((id) => id !== correctChoice)
    .sort(() => Math.random() - 0.5)
    .slice(0, choiceCount - 1); // Fill remaining slots

  // Build final list: correct + distractors, then shuffle once
  const finalList = [correctChoice, ...distractorPool].sort(
    () => Math.random() - 0.5,
  );
  return finalList;
}

function createInitialState(): Omit<
  GameState,
  never
> & { currentStepChoices: string[]; _patientId: string } {
  return {
    phase: 'intro',
    currentTier: getTier(1),
    currentRoutine: null,
    availableRoutines: DEFAULT_ROUTINES,
    studyPhaseComplete: false,
    testPhaseIndex: 0,
    testStepResults: [],
    levelIndex: 0,
    totalScore: 0,
    highestTierReached: 1,
    sessionStartTime: Date.now(),
    levelStartTime: null,
    levelResults: [],
    // History is now keyed by tier — see _sameTierHistory helper
    levelHistory: [],
    promptsUsedThisLevel: 0,
    supportMode: false,
    distractorSteps: [],
    currentStepChoices: [],
    _patientId: '',
  };
}

// Filter history to records at the same tier, last N entries
function sameTierHistory(history: LevelRecord[], tier: number, n = 5): LevelRecord[] {
  return history.filter((r) => r.tier === tier).slice(-n);
}

export const useRoutineSequenceStore = create<RoutineSequenceStore>(
  (set, get) => ({
    ...createInitialState(),

    startSession: (patientId?: string) => {
      const state = get();
      set({
        ...createInitialState(),
        // Preserve cross-session tier progression and history
        currentTier: state.currentTier,
        levelHistory: state.levelHistory,
        highestTierReached: state.highestTierReached,
        phase: 'intro',
        sessionStartTime: Date.now(),
        _patientId: patientId || state._patientId,
      });
    },

    startLevel: () => {
      const state = get();
      const supportConfig = state.supportMode
        ? getSupportConfig(state.currentTier)
        : null;

      // Apply support mode adjustments
      const effectiveTier =
        state.supportMode && supportConfig
          ? {
              ...state.currentTier,
              choiceCount: supportConfig.reducedChoiceCount,
              showImages: supportConfig.showImages,
              showHints: supportConfig.showHints,
            }
          : state.currentTier;

      const routine = pickRoutine(effectiveTier);
      if (!routine) {
        set({ phase: 'session_summary' });
        return;
      }

      // Get distractor steps for tier 7
      let distractorSteps: import('./engine/types').RoutineStep[] = [];
      if (effectiveTier.mode === 'reorder_with_distractor') {
        const distractorCount = Math.max(
          1,
          effectiveTier.choiceCount - effectiveTier.stepCount,
        );
        distractorSteps = getDistractorSteps(routine, distractorCount);
      }

      // Pre-generate choices for step 0
      const firstStepChoices = buildChoicesForStep(
        routine,
        0,
        effectiveTier.choiceCount,
        distractorSteps,
        effectiveTier.mode,
      );

      set({
        phase: 'study',
        currentRoutine: routine,
        studyPhaseComplete: false,
        testPhaseIndex: 0,
        testStepResults: [],
        levelStartTime: Date.now(),
        promptsUsedThisLevel: 0,
        distractorSteps,
        currentStepChoices: firstStepChoices,
        // Store effectiveTier so we use the same config throughout the level
        currentTier: effectiveTier,
      });
    },

    completeStudyPhase: () => {
      set({
        phase: 'test',
        studyPhaseComplete: true,
      });
    },

    submitStepAnswer: (stepId: string, timeMs: number) => {
      const state = get();
      if (!state.currentRoutine || state.phase !== 'test') {
        return { correct: false, showPrompt: false };
      }

      const correctStep = state.currentRoutine.steps[state.testPhaseIndex];
      const isCorrect = stepId === correctStep.stepId;

      const testStep: TestStep = {
        stepId,
        correct: isCorrect,
        timeMs,
        // promptsUsed is initially 0; it gets set to 1 in acknowledgePrompt
        promptsUsed: 0,
      };

      const newResults = [...state.testStepResults, testStep];
      const showPrompt = !isCorrect;

      // Is this the last step?
      const isLastStep =
        state.testPhaseIndex >= state.currentRoutine.steps.length - 1;

      if (isLastStep) {
        // Level done — go to level_success (even if wrong on last step,
        // we show the gentle feedback then continue to level_success).
        // If wrong, we still mark as level_success to avoid harsh end.
        const phase = showPrompt ? 'feedback' : 'level_success';
        set({
          testStepResults: newResults,
          phase,
          // Flag that we're on last step so acknowledgePrompt knows to go to level_success
          testPhaseIndex: state.testPhaseIndex, // keep same index so prompt knows which step
        });
      } else if (showPrompt) {
        // Wrong answer mid-level: show feedback, stay on same step index
        set({
          testStepResults: newResults,
          phase: 'feedback',
        });
      } else {
        // Correct: advance to next step and generate stable choices for it
        const nextIndex = state.testPhaseIndex + 1;
        const nextChoices = buildChoicesForStep(
          state.currentRoutine,
          nextIndex,
          state.currentTier.choiceCount,
          state.distractorSteps,
          state.currentTier.mode,
        );

        set({
          testStepResults: newResults,
          testPhaseIndex: nextIndex,
          phase: 'test',
          currentStepChoices: nextChoices,
        });
      }

      return { correct: isCorrect, showPrompt };
    },

    acknowledgePrompt: () => {
      const state = get();

      // Merge the prompt into the last recorded TestStep
      const updatedResults = state.testStepResults.map((step, idx) => {
        if (idx === state.testStepResults.length - 1) {
          return { ...step, promptsUsed: step.promptsUsed + 1 };
        }
        return step;
      });

      const isLastStep =
        state.currentRoutine &&
        state.testPhaseIndex >= state.currentRoutine.steps.length - 1;

      if (isLastStep) {
        // After showing prompt on last step, go to level_success
        set({
          testStepResults: updatedResults,
          promptsUsedThisLevel: state.promptsUsedThisLevel + 1,
          phase: 'level_success',
        });
        return;
      }

      // After showing prompt mid-level: advance to next step
      const nextIndex = state.testPhaseIndex + 1;
      const nextChoices = state.currentRoutine
        ? buildChoicesForStep(
            state.currentRoutine,
            nextIndex,
            state.currentTier.choiceCount,
            state.distractorSteps,
            state.currentTier.mode,
          )
        : [];

      set({
        testStepResults: updatedResults,
        promptsUsedThisLevel: state.promptsUsedThisLevel + 1,
        testPhaseIndex: nextIndex,
        phase: 'test',
        currentStepChoices: nextChoices,
      });
    },

    advanceAfterLevel: (): SessionResult | null => {
      const state = get();
      if (!state.currentRoutine || !state.levelStartTime) return null;

      const accuracy = calculateLevelAccuracy(state.testStepResults);
      // promptsUsed is now embedded in TestStep.promptsUsed from acknowledgePrompt
      const promptsUsed = countPromptsUsed(state.testStepResults);
      const success = isLevelSuccess(state.testStepResults);

      const scoreDelta = calculateLevelScore(
        state.currentTier,
        state.testStepResults,
        state.supportMode,
      );

      const levelResult: LevelResult = {
        levelIndex: state.levelIndex,
        routineId: state.currentRoutine.id,
        routineTitle: state.currentRoutine.title,
        difficultyTier: state.currentTier.tier,
        mode: state.currentTier.mode,
        stepCount: state.currentRoutine.steps.length,
        testSteps: state.testStepResults,
        accuracy,
        promptsUsed,
        success,
        scoreDelta,
        startedAt: new Date(state.levelStartTime).toISOString(),
        completedAt: new Date().toISOString(),
      };

      // FIX: filter history to same tier before deciding advancement
      const allHistory: LevelRecord[] = [
        ...state.levelHistory,
        {
          tier: state.currentTier.tier,
          accuracy,
          promptsUsed,
          timestamp: Date.now(),
        },
      ];

      const tierHistory = sameTierHistory(allHistory, state.currentTier.tier);

      const decision = decideNextTier(
        state.currentTier.tier,
        accuracy,
        promptsUsed,
        tierHistory, // pass same-tier records only
      );

      const newLevelResults = [...state.levelResults, levelResult];
      const newTotalScore = state.totalScore + scoreDelta;
      const newHighestTier = Math.max(
        state.highestTierReached,
        state.currentTier.tier,
      );
      const newLevelIndex = state.levelIndex + 1;

      // Is this the last level of the session?
      const sessionDone = newLevelIndex >= LEVELS_PER_SESSION;

      if (sessionDone) {
        const sessionResult = buildSessionResult(
          newLevelResults,
          state.sessionStartTime,
          newHighestTier,
        );

        set({
          levelResults: newLevelResults,
          totalScore: newTotalScore,
          highestTierReached: newHighestTier,
          levelHistory: allHistory.slice(-20), // keep up to 20 cross-tier records
          currentTier: getTier(decision.nextTier),
          supportMode: decision.supportMode,
          levelIndex: newLevelIndex,
          phase: 'session_summary',
        });

        return sessionResult;
      }

      // Not last level — start next level
      set({
        levelResults: newLevelResults,
        totalScore: newTotalScore,
        highestTierReached: newHighestTier,
        levelHistory: allHistory.slice(-20),
        currentTier: getTier(decision.nextTier),
        supportMode: decision.supportMode,
        levelIndex: newLevelIndex,
        phase: 'intro', // brief pause before next level (screen handles transition)
      });

      return null;
    },

    endSession: (): SessionResult => {
      const state = get();
      const result = buildSessionResult(
        state.levelResults,
        state.sessionStartTime,
        state.highestTierReached,
      );
      set({ phase: 'session_summary' });
      return result;
    },

    reset: () => {
      set(createInitialState());
    },

    // Getters
    getCurrentStep: () => {
      const state = get();
      if (
        !state.currentRoutine ||
        state.testPhaseIndex >= state.currentRoutine.steps.length
      ) {
        return null;
      }
      return state.currentRoutine.steps[state.testPhaseIndex];
    },

    getLevelProgress: () => {
      const state = get();
      if (!state.currentRoutine) return { current: 0, total: 0 };
      return {
        current: state.testPhaseIndex + 1,
        total: state.currentRoutine.steps.length,
      };
    },
  }),
);
